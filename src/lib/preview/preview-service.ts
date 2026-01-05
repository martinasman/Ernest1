/**
 * Preview Service
 * Manages preview sessions with database persistence and Fly.io VM lifecycle
 */

import { flyMachineManager, type FlyMachine } from './fly-machine-manager'
import { createClient } from '@/lib/supabase/server'

export interface PreviewSession {
  id: string
  workspace_id: string
  machine_id: string
  machine_ip: string | null
  region: string
  preview_url: string | null
  sync_url: string | null
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  error_message: string | null
  created_at: string
  updated_at: string
  last_activity_at: string
  expires_at: string
  files_synced_at: string | null
  file_count: number
}

export interface StartPreviewResult {
  session: PreviewSession
  previewUrl: string
  syncUrl: string
}

class PreviewService {
  private async waitForSyncServer(syncUrl: string, attempts = 20, timeoutMs = 4000) {
    for (let i = 0; i < attempts; i++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeoutMs)
        const res = await fetch(`${syncUrl}/health`, { signal: controller.signal })
        clearTimeout(timer)
        if (res.ok) return
      } catch {
        // ignore and retry
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    throw new Error(`Preview VM not reachable yet at ${syncUrl}. Please retry.`)
  }

  /**
   * Get active preview session for a workspace
   */
  async getActiveSession(workspaceId: string): Promise<PreviewSession | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('preview_sessions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in('status', ['starting', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null
      }
      console.error('Error fetching preview session:', error)
      return null
    }

    return data as PreviewSession
  }

  /**
   * Start a new preview session
   */
  async startPreview(workspaceId: string): Promise<StartPreviewResult> {
    const supabase = await createClient()

    // Check for existing active session
    const existingSession = await this.getActiveSession(workspaceId)
    if (existingSession && existingSession.status === 'running' && existingSession.preview_url) {
      // Return existing session
      return {
        session: existingSession,
        previewUrl: existingSession.preview_url,
        syncUrl: existingSession.sync_url || '',
      }
    }

    // Clean up any stale sessions
    if (existingSession) {
      await this.stopPreview(workspaceId)
    }

    // Create Fly machine
    let machine: FlyMachine
    try {
      machine = await flyMachineManager.createMachine({ workspaceId })
    } catch (error) {
      console.error('Failed to create Fly machine:', error)
      throw new Error('Failed to start preview server')
    }

    // Create database record
    const { data: session, error: insertError } = await supabase
      .from('preview_sessions')
      .insert({
        workspace_id: workspaceId,
        machine_id: machine.id,
        machine_ip: machine.private_ip,
        region: machine.region,
        status: 'starting',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })
      .select()
      .single()

    if (insertError) {
      // Try to clean up the machine if DB insert fails
      await flyMachineManager.destroyMachine(machine.id).catch(console.error)
      throw new Error(`Failed to create preview session: ${insertError.message}`)
    }

    // Wait for machine to start
    try {
      const startedMachine = await flyMachineManager.waitForState(machine.id, 'started', 120000)

      // Give DNS a brief window to propagate before we hand back the URLs
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const urls = flyMachineManager.getUrls(startedMachine)

      // Update session with URLs
      const { data: updatedSession, error: updateError } = await supabase
        .from('preview_sessions')
        .update({
          status: 'running',
          preview_url: urls.previewUrl,
          sync_url: urls.syncUrl,
          machine_ip: startedMachine.private_ip,
        })
        .eq('id', session.id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update preview session:', updateError)
      }

      return {
        session: (updatedSession || session) as PreviewSession,
        previewUrl: urls.previewUrl,
        syncUrl: urls.syncUrl,
      }
    } catch (error) {
      // Mark session as errored
      await supabase
        .from('preview_sessions')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Failed to start preview',
        })
        .eq('id', session.id)

      // Clean up machine
      await flyMachineManager.destroyMachine(machine.id).catch(console.error)

      throw error
    }
  }

  /**
   * Stop preview session for a workspace
   */
  async stopPreview(workspaceId: string): Promise<void> {
    const supabase = await createClient()

    const session = await this.getActiveSession(workspaceId)
    if (!session) {
      return
    }

    // Update status
    await supabase
      .from('preview_sessions')
      .update({ status: 'stopping' })
      .eq('id', session.id)

    // Destroy Fly machine
    try {
      await flyMachineManager.destroyMachine(session.machine_id)
    } catch (error) {
      console.error('Failed to destroy Fly machine:', error)
    }

    // Mark as stopped
    await supabase
      .from('preview_sessions')
      .update({ status: 'stopped' })
      .eq('id', session.id)
  }

  /**
   * Sync files to preview VM
   */
  async syncFiles(
    workspaceId: string,
    files: Record<string, string>
  ): Promise<{ success: boolean; syncedAt: string }> {
    const supabase = await createClient()

    const session = await this.getActiveSession(workspaceId)
    if (!session || session.status !== 'running' || !session.sync_url) {
      throw new Error('No active preview session')
    }

    // Wait for sync server DNS/health to be ready (avoids ENOTFOUND right after start)
    await this.waitForSyncServer(session.sync_url)

    // Send files to sync server
    const response = await fetch(`${session.sync_url}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to sync files: ${error}`)
    }

    const syncedAt = new Date().toISOString()

    // Update session
    await supabase
      .from('preview_sessions')
      .update({
        files_synced_at: syncedAt,
        file_count: Object.keys(files).length,
        last_activity_at: syncedAt,
      })
      .eq('id', session.id)

    return { success: true, syncedAt }
  }

  /**
   * Update a single file (hot reload)
   */
  async updateFile(
    workspaceId: string,
    filePath: string,
    content: string
  ): Promise<{ success: boolean }> {
    const session = await this.getActiveSession(workspaceId)
    if (!session || session.status !== 'running' || !session.sync_url) {
      throw new Error('No active preview session')
    }

    // Send single file update to sync server
    const response = await fetch(`${session.sync_url}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath, content }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to update file: ${error}`)
    }

    // Update last activity
    const supabase = await createClient()
    await supabase
      .from('preview_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', session.id)

    return { success: true }
  }

  /**
   * Extend session lifetime
   */
  async extendSession(workspaceId: string): Promise<void> {
    const supabase = await createClient()

    const session = await this.getActiveSession(workspaceId)
    if (!session) {
      throw new Error('No active preview session')
    }

    // Extend expiration by 30 minutes
    const newExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    await supabase
      .from('preview_sessions')
      .update({
        expires_at: newExpiration,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    // Also extend the Fly machine lease
    await flyMachineManager.extendLease(session.machine_id, 1800)
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const supabase = await createClient()

    // Find expired sessions
    const { data: expiredSessions, error } = await supabase
      .from('preview_sessions')
      .select('id, machine_id')
      .eq('status', 'running')
      .lt('expires_at', new Date().toISOString())

    if (error || !expiredSessions?.length) {
      return 0
    }

    // Destroy machines and update status
    for (const session of expiredSessions) {
      try {
        await flyMachineManager.destroyMachine(session.machine_id)
      } catch (e) {
        console.error(`Failed to destroy expired machine ${session.machine_id}:`, e)
      }

      await supabase
        .from('preview_sessions')
        .update({ status: 'stopped' })
        .eq('id', session.id)
    }

    return expiredSessions.length
  }
}

// Export singleton instance
export const previewService = new PreviewService()
export default previewService

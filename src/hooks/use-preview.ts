'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface PreviewSession {
  sessionId: string
  previewUrl: string
  syncUrl: string
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  expiresAt: string
  lastActivity?: string
  fileCount?: number
  filesSyncedAt?: string
}

interface UsePreviewOptions {
  autoStart?: boolean
  autoSync?: boolean
}

interface UsePreviewReturn {
  // State
  isLoading: boolean
  isStarting: boolean
  isSyncing: boolean
  error: string | null
  previewUrl: string | null
  session: PreviewSession | null

  // Actions
  startPreview: () => Promise<void>
  stopPreview: () => Promise<void>
  syncFiles: (files?: Record<string, string>) => Promise<void>
  updateFile: (path: string, content: string) => Promise<void>
  refreshSession: () => Promise<void>
}

export function usePreview(
  workspaceId: string | null,
  options: UsePreviewOptions = {}
): UsePreviewReturn {
  const { autoStart = false, autoSync = true } = options

  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<PreviewSession | null>(null)

  // Keep-alive interval ref
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch current session status
  const refreshSession = useCallback(async () => {
    if (!workspaceId) {
      setSession(null)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/preview/start?workspaceId=${workspaceId}`)
      const data = await response.json()

      if (data.active) {
        setSession({
          sessionId: data.sessionId,
          previewUrl: data.previewUrl,
          syncUrl: data.syncUrl,
          status: data.status,
          expiresAt: data.expiresAt,
          lastActivity: data.lastActivity,
          fileCount: data.fileCount,
          filesSyncedAt: data.filesSyncedAt,
        })
      } else {
        setSession(null)
      }

      setError(null)
    } catch (err) {
      console.error('Failed to fetch preview session:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch session')
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  // Start preview
  const startPreview = useCallback(async () => {
    if (!workspaceId) {
      setError('No workspace ID provided')
      return
    }

    setIsStarting(true)
    setError(null)

    try {
      const response = await fetch('/api/preview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start preview')
      }

      setSession({
        sessionId: data.sessionId,
        previewUrl: data.previewUrl,
        syncUrl: data.syncUrl,
        status: data.status,
        expiresAt: data.expiresAt,
      })

      // Auto-sync files after starting
      if (autoSync) {
        await syncFiles()
      }
    } catch (err) {
      console.error('Failed to start preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to start preview')
    } finally {
      setIsStarting(false)
    }
  }, [workspaceId, autoSync])

  // Stop preview
  const stopPreview = useCallback(async () => {
    if (!workspaceId) return

    try {
      await fetch(`/api/preview/start?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      })

      setSession(null)
    } catch (err) {
      console.error('Failed to stop preview:', err)
      setError(err instanceof Error ? err.message : 'Failed to stop preview')
    }
  }, [workspaceId])

  // Sync files
  const syncFiles = useCallback(async (files?: Record<string, string>) => {
    if (!workspaceId) return

    setIsSyncing(true)

    try {
      const response = await fetch('/api/preview/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, files }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync files')
      }

      // Update session with sync info
      if (session) {
        setSession({
          ...session,
          fileCount: data.fileCount,
          filesSyncedAt: data.syncedAt,
        })
      }
    } catch (err) {
      console.error('Failed to sync files:', err)
      setError(err instanceof Error ? err.message : 'Failed to sync files')
    } finally {
      setIsSyncing(false)
    }
  }, [workspaceId, session])

  // Update single file (hot reload)
  const updateFile = useCallback(async (path: string, content: string) => {
    if (!workspaceId || !session) return

    try {
      const response = await fetch('/api/preview/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, path, content }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update file')
      }
    } catch (err) {
      console.error('Failed to update file:', err)
      setError(err instanceof Error ? err.message : 'Failed to update file')
    }
  }, [workspaceId, session])

  // Keep-alive: extend session every 10 minutes
  useEffect(() => {
    if (!session || session.status !== 'running' || !workspaceId) {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }
      return
    }

    const keepAlive = async () => {
      try {
        await fetch('/api/preview/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId }),
        })
      } catch (err) {
        console.error('Keep-alive failed:', err)
      }
    }

    // Extend session every 10 minutes
    keepAliveRef.current = setInterval(keepAlive, 10 * 60 * 1000)

    return () => {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }
    }
  }, [session, workspaceId])

  // Initial load
  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isLoading && !session && !isStarting && workspaceId) {
      startPreview()
    }
  }, [autoStart, isLoading, session, isStarting, workspaceId, startPreview])

  return {
    isLoading,
    isStarting,
    isSyncing,
    error,
    previewUrl: session?.previewUrl || null,
    session,
    startPreview,
    stopPreview,
    syncFiles,
    updateFile,
    refreshSession,
  }
}

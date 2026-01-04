'use client'

import { useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { createClient } from '@/lib/supabase/client'

export function useWorkspace() {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string | undefined

  const {
    workspace,
    brand,
    overview,
    tools,
    isLoading,
    error,
    setWorkspace,
    setBrand,
    setOverview,
    setTools,
    setLoading,
    setError,
    reset,
  } = useWorkspaceStore()

  const loadWorkspace = useCallback(async (slug: string) => {
    // CRITICAL: Reset old data BEFORE loading new workspace to prevent stale data
    reset()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Fetch workspace by slug
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('slug', slug)
        .single()

      if (workspaceError) throw workspaceError

      setWorkspace(workspaceData)

      // Fetch related data in parallel
      const [brandResult, overviewResult, toolsResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .single(),
        supabase
          .from('overviews')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .single(),
        supabase
          .from('internal_tools')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('created_at', { ascending: true }),
      ])

      // Always set values (not conditionally) to ensure old data is cleared
      setBrand(brandResult.data || null)
      setOverview(overviewResult.data || null)
      setTools(toolsResult.data || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace')
    } finally {
      setLoading(false)
    }
  }, [reset, setWorkspace, setBrand, setOverview, setTools, setLoading, setError])

  useEffect(() => {
    if (!workspaceSlug) {
      reset()
      return
    }

    loadWorkspace(workspaceSlug)
  }, [workspaceSlug, loadWorkspace, reset])

  // Refetch function to reload workspace data
  const refetch = useCallback(() => {
    if (workspaceSlug) {
      loadWorkspace(workspaceSlug)
    }
  }, [workspaceSlug, loadWorkspace])

  return {
    workspace,
    brand,
    overview,
    tools,
    isLoading,
    error,
    workspaceSlug,
    refetch,
  }
}

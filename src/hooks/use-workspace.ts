'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (!workspaceSlug) {
      reset()
      return
    }

    const loadWorkspace = async () => {
      setLoading(true)
      setError(null)

      const supabase = createClient()

      try {
        // Fetch workspace by slug
        const { data: workspaceData, error: workspaceError } = await supabase
          .from('workspaces')
          .select('*')
          .eq('slug', workspaceSlug)
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

        if (brandResult.data) setBrand(brandResult.data)
        if (overviewResult.data) setOverview(overviewResult.data)
        if (toolsResult.data) setTools(toolsResult.data)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace')
      } finally {
        setLoading(false)
      }
    }

    loadWorkspace()
  }, [workspaceSlug, setWorkspace, setBrand, setOverview, setTools, setLoading, setError, reset])

  return {
    workspace,
    brand,
    overview,
    tools,
    isLoading,
    error,
    workspaceSlug,
  }
}

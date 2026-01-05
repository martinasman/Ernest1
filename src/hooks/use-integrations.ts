'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Integration {
  id: string
  workspace_id: string
  provider: string
  status: 'connected' | 'disconnected'
  config: Record<string, unknown>
  credentials: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface IntegrationsState {
  // Cal.com
  calcomConnected: boolean
  calcomUsername: string | null
  calcomEventSlug: string | null

  // Stripe
  stripeConnected: boolean
  stripeAccountId: string | null

  // Loading state
  isLoading: boolean
  error: string | null
}

const defaultState: IntegrationsState = {
  calcomConnected: false,
  calcomUsername: null,
  calcomEventSlug: null,
  stripeConnected: false,
  stripeAccountId: null,
  isLoading: false,
  error: null,
}

/**
 * Hook to get integration status for a workspace (client-side)
 * Used in the Ernest app to check what integrations are connected
 */
export function useIntegrations(workspaceId: string | null | undefined) {
  const [state, setState] = useState<IntegrationsState>(defaultState)

  const loadIntegrations = useCallback(async () => {
    if (!workspaceId) {
      setState(defaultState)
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))
    const supabase = createClient()

    try {
      // Fetch integrations for this workspace
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('workspace_id', workspaceId)

      if (error) throw error

      // Also check for Stripe Connect account
      const { data: stripeAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single()

      // Parse integrations
      const calcom = integrations?.find((i: Integration) => i.provider === 'cal.com')
      const stripe = integrations?.find((i: Integration) => i.provider === 'stripe')

      setState({
        calcomConnected: calcom?.status === 'connected',
        calcomUsername: (calcom?.config as { username?: string })?.username || null,
        calcomEventSlug: (calcom?.config as { eventSlug?: string })?.eventSlug || '30min',
        stripeConnected: stripe?.status === 'connected' || stripeAccount?.charges_enabled === true,
        stripeAccountId: stripeAccount?.stripe_account_id || null,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load integrations',
      }))
    }
  }, [workspaceId])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  return {
    ...state,
    refetch: loadIntegrations,
  }
}

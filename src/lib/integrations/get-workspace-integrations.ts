import { createClient } from '@/lib/supabase/server'

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

/**
 * Server-side function to get integration status for a workspace
 * Used in API routes and server components
 */
export async function getWorkspaceIntegrations(workspaceId: string): Promise<{
  calcom: { connected: boolean; username: string | null; eventSlug: string | null }
  stripe: { connected: boolean; accountId: string | null }
}> {
  const supabase = await createClient()

  // Fetch integrations for this workspace
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching integrations:', error)
    return {
      calcom: { connected: false, username: null, eventSlug: null },
      stripe: { connected: false, accountId: null },
    }
  }

  // Also check for Stripe Connect account
  const { data: stripeAccount } = await supabase
    .from('stripe_connect_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  // Parse integrations
  const calcom = integrations?.find((i: Integration) => i.provider === 'cal.com')
  const stripe = integrations?.find((i: Integration) => i.provider === 'stripe')

  return {
    calcom: {
      connected: calcom?.status === 'connected',
      username: (calcom?.config as { username?: string })?.username || null,
      eventSlug: (calcom?.config as { eventSlug?: string })?.eventSlug || '30min',
    },
    stripe: {
      connected: stripe?.status === 'connected' || stripeAccount?.charges_enabled === true,
      accountId: stripeAccount?.stripe_account_id || null,
    },
  }
}

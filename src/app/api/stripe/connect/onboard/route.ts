import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnboardingLink, createDashboardLink } from '@/lib/stripe/connect'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, type = 'onboard' } = await req.json()

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Verify workspace access (owner only)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage payments' }, { status: 403 })
    }

    // Get connect account
    const { data: account, error } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !account) {
      return NextResponse.json({ error: 'No connect account found' }, { status: 404 })
    }

    // Get workspace for URL
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('id', workspaceId)
      .single()

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const baseUrl = `${origin}/${workspace?.slug || ''}/settings/payments`

    let url: string

    if (type === 'dashboard') {
      // Create dashboard login link
      url = await createDashboardLink(account.stripe_account_id)
    } else {
      // Create onboarding link
      url = await createOnboardingLink({
        accountId: account.stripe_account_id,
        refreshUrl: `${baseUrl}?refresh=true`,
        returnUrl: `${baseUrl}?success=true`,
      })
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Onboard error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create link' },
      { status: 500 }
    )
  }
}

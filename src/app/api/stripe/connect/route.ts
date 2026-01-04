import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectedAccount, getAccountStatus } from '@/lib/stripe/connect'

// GET - Get connect account status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Verify workspace access
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get connect account
    const { data: account, error } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !account) {
      return NextResponse.json({ connected: false })
    }

    // Get latest status from Stripe
    const status = await getAccountStatus(account.stripe_account_id)

    // Update local status
    if (
      status.chargesEnabled !== account.charges_enabled ||
      status.payoutsEnabled !== account.payouts_enabled ||
      status.detailsSubmitted !== account.onboarding_complete
    ) {
      await supabase
        .from('stripe_connect_accounts')
        .update({
          charges_enabled: status.chargesEnabled,
          payouts_enabled: status.payoutsEnabled,
          onboarding_complete: status.detailsSubmitted,
        })
        .eq('id', account.id)
    }

    return NextResponse.json({
      connected: true,
      accountId: account.stripe_account_id,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      onboardingComplete: status.detailsSubmitted,
      requirements: status.requirements,
    })
  } catch (error) {
    console.error('Connect status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}

// POST - Create connect account
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, businessName, country } = await req.json()

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
      return NextResponse.json({ error: 'Only owners can set up payments' }, { status: 403 })
    }

    // Check if already connected
    const { data: existing } = await supabase
      .from('stripe_connect_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 400 })
    }

    // Create Stripe connected account
    const account = await createConnectedAccount({
      email: user.email!,
      workspaceId,
      businessName,
      country,
    })

    // Save to database
    const { error: insertError } = await supabase.from('stripe_connect_accounts').insert({
      workspace_id: workspaceId,
      stripe_account_id: account.id,
      charges_enabled: false,
      payouts_enabled: false,
      onboarding_complete: false,
    })

    if (insertError) {
      throw new Error('Failed to save account')
    }

    return NextResponse.json({
      accountId: account.id,
      success: true,
    })
  } catch (error) {
    console.error('Connect create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create account' },
      { status: 500 }
    )
  }
}

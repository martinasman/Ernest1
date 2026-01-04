import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectedSubscription, cancelConnectedSubscription } from '@/lib/stripe/connect'

// GET - List subscriptions
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const customerId = searchParams.get('customerId')

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

    // Get subscriptions
    let query = supabase
      .from('user_subscriptions')
      .select('*, customer:user_customers(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ subscriptions })
  } catch (error) {
    console.error('List subscriptions error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list subscriptions' },
      { status: 500 }
    )
  }
}

// POST - Create subscription
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, customerId, amount, interval, intervalCount = 1 } = await req.json()

    if (!workspaceId || !customerId || !amount || !interval) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Get connect account and customer
    const { data: account } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('workspace_id', workspaceId)
      .single()

    const { data: customerData } = await supabase
      .from('user_customers')
      .select('stripe_customer_id')
      .eq('id', customerId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!account || !customerData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Create subscription in Stripe
    const stripeSubscription = await createConnectedSubscription({
      accountId: account.stripe_account_id,
      customerId: customerData.stripe_customer_id,
      priceAmount: amount,
      interval: interval as 'day' | 'week' | 'month' | 'year',
      intervalCount,
    })

    // Save to database
    const subData = stripeSubscription as unknown as {
      id: string
      status: string
      current_period_start: number
      current_period_end: number
    }

    const { data: subscription, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        workspace_id: workspaceId,
        customer_id: customerId,
        stripe_subscription_id: subData.id,
        status: subData.status,
        amount,
        currency: 'usd',
        interval,
        interval_count: intervalCount,
        current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subscription' },
      { status: 500 }
    )
  }
}

// PUT - Cancel subscription
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscriptionId, workspaceId, cancelAtPeriodEnd = true } = await req.json()

    if (!subscriptionId || !workspaceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Get connect account and subscription
    const { data: account } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('workspace_id', workspaceId)
      .single()

    const { data: subData } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('id', subscriptionId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!account || !subData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Cancel in Stripe
    const stripeSubscription = await cancelConnectedSubscription({
      accountId: account.stripe_account_id,
      subscriptionId: subData.stripe_subscription_id!,
      cancelAtPeriodEnd,
    })

    const subResponse = stripeSubscription as unknown as {
      status: string
      cancel_at_period_end: boolean
      canceled_at?: number
    }

    // Update in database
    const { data: subscription, error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: subResponse.status,
        cancel_at_period_end: subResponse.cancel_at_period_end,
        canceled_at: subResponse.canceled_at
          ? new Date(subResponse.canceled_at * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

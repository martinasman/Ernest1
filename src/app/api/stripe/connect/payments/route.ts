import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectedPayment, createConnectedPaymentLink } from '@/lib/stripe/connect'

// POST - Create payment intent or payment link
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, customerId, amount, description, productName, type = 'intent' } = await req.json()

    if (!workspaceId || !amount) {
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

    // Get connect account
    const { data: account } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('workspace_id', workspaceId)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Payment setup required' }, { status: 400 })
    }

    // Get customer stripe ID if provided
    let stripeCustomerId: string | undefined

    if (customerId) {
      const { data: customerData } = await supabase
        .from('user_customers')
        .select('stripe_customer_id')
        .eq('id', customerId)
        .eq('workspace_id', workspaceId)
        .single()

      stripeCustomerId = customerData?.stripe_customer_id
    }

    if (type === 'link') {
      // Create payment link
      const paymentLink = await createConnectedPaymentLink({
        accountId: account.stripe_account_id,
        amount,
        productName: productName || 'Payment',
      })

      return NextResponse.json({
        type: 'link',
        url: paymentLink.url,
        paymentLinkId: paymentLink.id,
      })
    }

    // Create payment intent
    const paymentIntent = await createConnectedPayment({
      accountId: account.stripe_account_id,
      customerId: stripeCustomerId,
      amount,
      description,
    })

    return NextResponse.json({
      type: 'intent',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    console.error('Create payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    )
  }
}

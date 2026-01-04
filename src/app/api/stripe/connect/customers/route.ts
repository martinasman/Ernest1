import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createConnectedCustomer,
  updateConnectedCustomer,
  deleteConnectedCustomer,
} from '@/lib/stripe/connect'

// GET - List customers
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

    // Get customers
    const { data: customers, error } = await supabase
      .from('user_customers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('List customers error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list customers' },
      { status: 500 }
    )
  }
}

// POST - Create customer
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, email, name, phone, metadata } = await req.json()

    if (!workspaceId || !email) {
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

    // Create customer in Stripe
    const stripeCustomer = await createConnectedCustomer({
      accountId: account.stripe_account_id,
      email,
      name,
      phone,
      metadata,
    })

    // Save to database
    const { data: customer, error: insertError } = await supabase
      .from('user_customers')
      .insert({
        workspace_id: workspaceId,
        stripe_customer_id: stripeCustomer.id,
        email,
        name,
        phone,
        metadata,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create customer' },
      { status: 500 }
    )
  }
}

// PUT - Update customer
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, workspaceId, email, name, phone, metadata } = await req.json()

    if (!customerId || !workspaceId) {
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

    // Update in Stripe
    await updateConnectedCustomer({
      accountId: account.stripe_account_id,
      customerId: customerData.stripe_customer_id,
      email,
      name,
      phone,
      metadata,
    })

    // Update in database
    const { data: customer, error: updateError } = await supabase
      .from('user_customers')
      .update({
        email: email || undefined,
        name: name || undefined,
        phone: phone || undefined,
        metadata: metadata || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE - Delete customer
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const customerId = searchParams.get('customerId')
    const workspaceId = searchParams.get('workspaceId')

    if (!customerId || !workspaceId) {
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

    // Delete from Stripe
    await deleteConnectedCustomer({
      accountId: account.stripe_account_id,
      customerId: customerData.stripe_customer_id,
    })

    // Delete from database
    await supabase.from('user_customers').delete().eq('id', customerId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete customer' },
      { status: 500 }
    )
  }
}

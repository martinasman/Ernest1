import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createConnectedInvoice,
  sendConnectedInvoice,
  voidConnectedInvoice,
} from '@/lib/stripe/connect'

// GET - List invoices
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

    // Get invoices
    let query = supabase
      .from('user_invoices')
      .select('*, customer:user_customers(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    const { data: invoices, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error('List invoices error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list invoices' },
      { status: 500 }
    )
  }
}

// POST - Create invoice
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, customerId, items, dueDate, sendNow = false } = await req.json()

    if (!workspaceId || !customerId || !items?.length) {
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

    // Create invoice in Stripe
    let stripeInvoice = await createConnectedInvoice({
      accountId: account.stripe_account_id,
      customerId: customerData.stripe_customer_id,
      items,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })

    // Send if requested
    if (sendNow) {
      stripeInvoice = await sendConnectedInvoice({
        accountId: account.stripe_account_id,
        invoiceId: stripeInvoice.id,
      })
    }

    // Calculate total
    const amountDue = items.reduce(
      (sum: number, item: { amount: number; quantity?: number }) =>
        sum + item.amount * (item.quantity || 1),
      0
    )

    // Save to database
    const { data: invoice, error: insertError } = await supabase
      .from('user_invoices')
      .insert({
        workspace_id: workspaceId,
        customer_id: customerId,
        stripe_invoice_id: stripeInvoice.id,
        status: stripeInvoice.status,
        amount_due: amountDue,
        currency: 'usd',
        due_date: dueDate || null,
        hosted_invoice_url: stripeInvoice.hosted_invoice_url,
        invoice_pdf: stripeInvoice.invoice_pdf,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invoice' },
      { status: 500 }
    )
  }
}

// PUT - Send or void invoice
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invoiceId, workspaceId, action } = await req.json()

    if (!invoiceId || !workspaceId || !action) {
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

    // Get connect account and invoice
    const { data: account } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id')
      .eq('workspace_id', workspaceId)
      .single()

    const { data: invoiceData } = await supabase
      .from('user_invoices')
      .select('stripe_invoice_id')
      .eq('id', invoiceId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!account || !invoiceData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let stripeInvoice

    if (action === 'send') {
      stripeInvoice = await sendConnectedInvoice({
        accountId: account.stripe_account_id,
        invoiceId: invoiceData.stripe_invoice_id!,
      })
    } else if (action === 'void') {
      stripeInvoice = await voidConnectedInvoice({
        accountId: account.stripe_account_id,
        invoiceId: invoiceData.stripe_invoice_id!,
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update in database
    const { data: invoice, error: updateError } = await supabase
      .from('user_invoices')
      .update({
        status: stripeInvoice.status,
        hosted_invoice_url: stripeInvoice.hosted_invoice_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Update invoice error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update invoice' },
      { status: 500 }
    )
  }
}

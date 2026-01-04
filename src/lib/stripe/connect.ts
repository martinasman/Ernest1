import { getStripe } from './server'

// Platform fee percentage
const PLATFORM_FEE_PERCENT = parseFloat(process.env.STRIPE_PLATFORM_FEE_PERCENT || '2.5')

// Create a connected account
export async function createConnectedAccount({
  email,
  workspaceId,
  businessName,
  country = 'US',
}: {
  email: string
  workspaceId: string
  businessName?: string
  country?: string
}) {
  const stripe = getStripe()

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: businessName || undefined,
    },
    metadata: {
      workspaceId,
    },
  })

  return account
}

// Create account onboarding link
export async function createOnboardingLink({
  accountId,
  refreshUrl,
  returnUrl,
}: {
  accountId: string
  refreshUrl: string
  returnUrl: string
}) {
  const stripe = getStripe()

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })

  return link.url
}

// Create login link for Express dashboard
export async function createDashboardLink(accountId: string) {
  const stripe = getStripe()

  const link = await stripe.accounts.createLoginLink(accountId)
  return link.url
}

// Get account status
export async function getAccountStatus(accountId: string) {
  const stripe = getStripe()

  const account = await stripe.accounts.retrieve(accountId)

  return {
    id: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements,
  }
}

// Create customer on connected account
export async function createConnectedCustomer({
  accountId,
  email,
  name,
  phone,
  metadata,
}: {
  accountId: string
  email: string
  name?: string
  phone?: string
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()

  const customer = await stripe.customers.create(
    {
      email,
      name: name || undefined,
      phone: phone || undefined,
      metadata,
    },
    { stripeAccount: accountId }
  )

  return customer
}

// Update customer on connected account
export async function updateConnectedCustomer({
  accountId,
  customerId,
  email,
  name,
  phone,
  metadata,
}: {
  accountId: string
  customerId: string
  email?: string
  name?: string
  phone?: string
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()

  const customer = await stripe.customers.update(
    customerId,
    {
      email: email || undefined,
      name: name || undefined,
      phone: phone || undefined,
      metadata,
    },
    { stripeAccount: accountId }
  )

  return customer
}

// Delete customer on connected account
export async function deleteConnectedCustomer({
  accountId,
  customerId,
}: {
  accountId: string
  customerId: string
}) {
  const stripe = getStripe()

  await stripe.customers.del(customerId, { stripeAccount: accountId })
}

// Create invoice on connected account
export async function createConnectedInvoice({
  accountId,
  customerId,
  items,
  dueDate,
  metadata,
}: {
  accountId: string
  customerId: string
  items: Array<{ description: string; amount: number; quantity?: number }>
  dueDate?: Date
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()

  // Create invoice
  const invoice = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: 'send_invoice',
      due_date: dueDate ? Math.floor(dueDate.getTime() / 1000) : undefined,
      metadata,
      application_fee_amount: Math.round(
        items.reduce((sum, item) => sum + item.amount * (item.quantity || 1), 0) *
          (PLATFORM_FEE_PERCENT / 100)
      ),
    },
    { stripeAccount: accountId }
  )

  // Add invoice items
  for (const item of items) {
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        invoice: invoice.id,
        description: item.description,
        amount: item.amount,
        quantity: item.quantity || 1,
        currency: 'usd',
      },
      { stripeAccount: accountId }
    )
  }

  // Finalize invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
    stripeAccount: accountId,
  })

  return finalizedInvoice
}

// Send invoice
export async function sendConnectedInvoice({
  accountId,
  invoiceId,
}: {
  accountId: string
  invoiceId: string
}) {
  const stripe = getStripe()

  const invoice = await stripe.invoices.sendInvoice(invoiceId, {
    stripeAccount: accountId,
  })

  return invoice
}

// Void invoice
export async function voidConnectedInvoice({
  accountId,
  invoiceId,
}: {
  accountId: string
  invoiceId: string
}) {
  const stripe = getStripe()

  const invoice = await stripe.invoices.voidInvoice(invoiceId, {
    stripeAccount: accountId,
  })

  return invoice
}

// Create subscription on connected account
export async function createConnectedSubscription({
  accountId,
  customerId,
  priceAmount,
  interval,
  intervalCount = 1,
  metadata,
}: {
  accountId: string
  customerId: string
  priceAmount: number
  interval: 'day' | 'week' | 'month' | 'year'
  intervalCount?: number
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()

  // Create a product and price for the subscription
  const product = await stripe.products.create(
    { name: 'Subscription' },
    { stripeAccount: accountId }
  )

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: priceAmount,
      currency: 'usd',
      recurring: {
        interval,
        interval_count: intervalCount,
      },
    },
    { stripeAccount: accountId }
  )

  // Create subscription
  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: price.id }],
      application_fee_percent: PLATFORM_FEE_PERCENT,
      metadata,
    },
    { stripeAccount: accountId }
  )

  return subscription
}

// Cancel subscription
export async function cancelConnectedSubscription({
  accountId,
  subscriptionId,
  cancelAtPeriodEnd = true,
}: {
  accountId: string
  subscriptionId: string
  cancelAtPeriodEnd?: boolean
}) {
  const stripe = getStripe()

  if (cancelAtPeriodEnd) {
    const subscription = await stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount: accountId }
    )
    return subscription
  }

  const subscription = await stripe.subscriptions.cancel(subscriptionId, {
    stripeAccount: accountId,
  })
  return subscription
}

// Create one-time payment (payment intent)
export async function createConnectedPayment({
  accountId,
  customerId,
  amount,
  description,
  metadata,
}: {
  accountId: string
  customerId?: string
  amount: number
  description?: string
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'usd',
      customer: customerId || undefined,
      description,
      application_fee_amount: Math.round(amount * (PLATFORM_FEE_PERCENT / 100)),
      metadata,
    },
    { stripeAccount: accountId }
  )

  return paymentIntent
}

// Create payment link for quick payments
export async function createConnectedPaymentLink({
  accountId,
  amount,
  productName,
  metadata,
}: {
  accountId: string
  amount: number
  productName: string
  metadata?: Record<string, string>
}) {
  const stripe = getStripe()

  // Create a product and price
  const product = await stripe.products.create(
    { name: productName },
    { stripeAccount: accountId }
  )

  const price = await stripe.prices.create(
    {
      product: product.id,
      unit_amount: amount,
      currency: 'usd',
    },
    { stripeAccount: accountId }
  )

  // Create payment link
  const paymentLink = await stripe.paymentLinks.create(
    {
      line_items: [{ price: price.id, quantity: 1 }],
      application_fee_percent: PLATFORM_FEE_PERCENT,
      metadata,
    },
    { stripeAccount: accountId }
  )

  return paymentLink
}

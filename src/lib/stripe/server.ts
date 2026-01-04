import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backwards compatibility
export const stripe = {
  get checkout() { return getStripe().checkout },
  get customers() { return getStripe().customers },
  get subscriptions() { return getStripe().subscriptions },
  get billingPortal() { return getStripe().billingPortal },
  get webhooks() { return getStripe().webhooks },
}

// Platform subscription plans
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    description: 'For individuals getting started',
    features: [
      '1 workspace',
      '100 AI messages/month',
      '1GB storage',
      'Basic tools',
    ],
    priceMonthly: 0,
    priceYearly: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    features: [
      'Unlimited workspaces',
      '1,000 AI messages/month',
      '10GB storage',
      'All tools',
      'Stripe Connect',
      'Cal.com integration',
      'Priority support',
    ],
    priceMonthly: 29,
    priceYearly: 290,
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    description: 'For teams and enterprises',
    features: [
      'Everything in Pro',
      'Unlimited AI messages',
      '100GB storage',
      'Custom branding',
      'Team members',
      'Advanced analytics',
      'API access',
      'Dedicated support',
    ],
    priceMonthly: 99,
    priceYearly: 990,
    stripePriceIdMonthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  },
} as const

export type PlanId = keyof typeof PLANS

// Create checkout session for subscription
export async function createCheckoutSession({
  workspaceId,
  planId,
  billingCycle,
  customerId,
  successUrl,
  cancelUrl,
}: {
  workspaceId: string
  planId: PlanId
  billingCycle: 'monthly' | 'yearly'
  customerId?: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const plan = PLANS[planId]
  const priceId = billingCycle === 'monthly'
    ? plan.stripePriceIdMonthly
    : plan.stripePriceIdYearly

  if (!priceId) {
    throw new Error(`No price ID configured for ${planId} ${billingCycle}`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId || undefined,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      workspaceId,
      planId,
    },
    subscription_data: {
      metadata: {
        workspaceId,
        planId,
      },
    },
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session')
  }

  return session.url
}

// Create customer portal session
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session.url
}

// Get customer's subscription
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId)
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId)
}

// Get or create customer
export async function getOrCreateCustomer({
  email,
  name,
  workspaceId,
}: {
  email: string
  name?: string
  workspaceId: string
}): Promise<string> {
  // Search for existing customer
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (customers.data.length > 0) {
    return customers.data[0].id
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      workspaceId,
    },
  })

  return customer.id
}

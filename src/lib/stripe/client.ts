'use client'

import { loadStripe, Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null>

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

    if (!key) {
      console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined')
      return Promise.resolve(null)
    }

    stripePromise = loadStripe(key)
  }

  return stripePromise
}

// Redirect to checkout
export async function redirectToCheckout(sessionUrl: string) {
  window.location.href = sessionUrl
}

// Redirect to customer portal
export async function redirectToPortal(portalUrl: string) {
  window.location.href = portalUrl
}

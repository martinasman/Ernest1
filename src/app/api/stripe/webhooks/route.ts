import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@/lib/supabase/server'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionData = await stripe.subscriptions.retrieve(
            session.subscription as string
          ) as unknown as { id: string; status: string; current_period_end: number }

          const workspaceId = session.metadata?.workspaceId
          const planId = session.metadata?.planId

          if (workspaceId) {
            // Create or update subscription record
            await supabase
              .from('subscriptions')
              .upsert({
                workspace_id: workspaceId,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: subscriptionData.id,
                status: subscriptionData.status,
                plan_id: planId || 'pro',
                current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
              }, {
                onConflict: 'workspace_id',
              })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subUpdate = event.data.object as unknown as { id: string; status: string; current_period_end: number; metadata?: { workspaceId?: string; planId?: string } }
        const workspaceId = subUpdate.metadata?.workspaceId

        if (workspaceId) {
          await supabase
            .from('subscriptions')
            .update({
              status: subUpdate.status,
              plan_id: subUpdate.metadata?.planId || undefined,
              current_period_end: new Date(subUpdate.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subUpdate.id)
        } else {
          // Try to find by subscription ID
          await supabase
            .from('subscriptions')
            .update({
              status: subUpdate.status,
              current_period_end: new Date(subUpdate.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subUpdate.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subDeleted = event.data.object as unknown as { id: string }

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', subDeleted.id)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as unknown as { subscription?: string }

        if (invoice.subscription) {
          // Update subscription period
          const subSuccess = await stripe.subscriptions.retrieve(
            invoice.subscription
          ) as unknown as { id: string; status: string; current_period_end: number }

          await supabase
            .from('subscriptions')
            .update({
              status: subSuccess.status,
              current_period_end: new Date(subSuccess.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', subSuccess.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoiceFailed = event.data.object as unknown as { subscription?: string }

        if (invoiceFailed.subscription) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', invoiceFailed.subscription)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

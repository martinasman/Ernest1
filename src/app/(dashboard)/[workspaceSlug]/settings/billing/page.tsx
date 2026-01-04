'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, Loader2, CreditCard, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { createClient } from '@/lib/supabase/client'
import { PLANS, PlanId } from '@/lib/stripe/server'

interface Subscription {
  id: string
  workspace_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string
  plan_id: string
  current_period_end: string | null
}

export default function BillingPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { workspace } = useWorkspaceStore()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    if (workspace?.id) {
      fetchSubscription()
    }
  }, [workspace?.id])

  async function fetchSubscription() {
    if (!workspace?.id) return

    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('workspace_id', workspace.id)
      .single()

    if (!error && data) {
      setSubscription(data)
    }

    setLoading(false)
  }

  async function handleCheckout(planId: PlanId) {
    if (!workspace?.id) return

    setCheckoutLoading(planId)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          planId,
          billingCycle,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      // Redirect to Stripe checkout
      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      alert(error instanceof Error ? error.message : 'Checkout failed')
    } finally {
      setCheckoutLoading(null)
    }
  }

  async function handleManageBilling() {
    if (!workspace?.id) return

    setPortalLoading(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Portal failed')
      }

      // Redirect to Stripe portal
      window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
      alert(error instanceof Error ? error.message : 'Portal failed')
    } finally {
      setPortalLoading(false)
    }
  }

  const currentPlanId = subscription?.plan_id?.toUpperCase() || 'FREE'
  const isActive = subscription?.status === 'active'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your Ernest subscription</p>
      </div>

      {/* Success/Cancel messages */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center gap-2">
          <Check className="h-5 w-5" />
          <span>Your subscription has been activated successfully!</span>
        </div>
      )}

      {canceled && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Checkout was canceled. No charges were made.</span>
        </div>
      )}

      {/* Current subscription */}
      {subscription && isActive && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-semibold">{PLANS[currentPlanId as PlanId]?.name || 'Pro'}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.current_period_end && (
                    <>Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Billing
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
          onClick={() => setBillingCycle('yearly')}
        >
          Yearly
          <Badge variant="secondary" className="ml-2">Save 17%</Badge>
        </Button>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(PLANS).map(([id, plan]) => {
          const planId = id as PlanId
          const isCurrent = currentPlanId === id && isActive
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly

          return (
            <Card
              key={id}
              className={isCurrent ? 'border-primary ring-1 ring-primary' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan.name}
                  {isCurrent && <Badge>Current</Badge>}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {planId === 'FREE' ? (
                  <Button variant="outline" className="w-full" disabled>
                    {isCurrent ? 'Current Plan' : 'Free Forever'}
                  </Button>
                ) : isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                  >
                    {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Manage Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(planId)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === planId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentPlanId !== 'FREE' && isActive ? 'Switch to ' : 'Upgrade to '}{plan.name}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

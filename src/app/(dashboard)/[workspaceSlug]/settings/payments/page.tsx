'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface ConnectStatus {
  connected: boolean
  accountId?: string
  chargesEnabled?: boolean
  payoutsEnabled?: boolean
  onboardingComplete?: boolean
  requirements?: {
    currently_due?: string[]
    eventually_due?: string[]
    past_due?: string[]
  }
}

export default function PaymentsSettingsPage() {
  const searchParams = useSearchParams()
  const { workspace } = useWorkspaceStore()
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const success = searchParams.get('success')
  const refresh = searchParams.get('refresh')

  useEffect(() => {
    if (workspace?.id) {
      fetchStatus()
    }
  }, [workspace?.id])

  async function fetchStatus() {
    if (!workspace?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/stripe/connect?workspaceId=${workspace.id}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAccount() {
    if (!workspace?.id) return

    setActionLoading('create')
    try {
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          businessName: workspace.name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Start onboarding
      await handleOnboard()
    } catch (error) {
      console.error('Create account error:', error)
      alert(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleOnboard() {
    if (!workspace?.id) return

    setActionLoading('onboard')
    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          type: 'onboard',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create onboarding link')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Onboard error:', error)
      alert(error instanceof Error ? error.message : 'Failed to start onboarding')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDashboard() {
    if (!workspace?.id) return

    setActionLoading('dashboard')
    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          type: 'dashboard',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create dashboard link')
      }

      window.open(data.url, '_blank')
    } catch (error) {
      console.error('Dashboard error:', error)
      alert(error instanceof Error ? error.message : 'Failed to open dashboard')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const hasRequirements =
    status?.requirements?.currently_due?.length ||
    status?.requirements?.past_due?.length

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Accept Payments</h1>
        <p className="text-muted-foreground">
          Set up Stripe Connect to accept payments from your customers
        </p>
      </div>

      {/* Success/Refresh messages */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          <span>Your payment account setup has been updated!</span>
        </div>
      )}

      {refresh && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Please complete the remaining onboarding steps.</span>
        </div>
      )}

      {/* Not connected state */}
      {!status?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Get Started with Stripe
            </CardTitle>
            <CardDescription>
              Connect a Stripe account to start accepting payments, create invoices, and manage subscriptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Accept credit cards & more</p>
                  <p className="text-muted-foreground">
                    Visa, Mastercard, American Express, and 135+ other payment methods
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Create invoices</p>
                  <p className="text-muted-foreground">
                    Send professional invoices with automatic payment reminders
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Recurring subscriptions</p>
                  <p className="text-muted-foreground">
                    Set up recurring billing for your customers
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCreateAccount}
              disabled={actionLoading !== null}
              className="w-full"
            >
              {actionLoading === 'create' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Connect with Stripe
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By connecting, you agree to the{' '}
              <a
                href="https://stripe.com/connect-account/legal"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Stripe Connected Account Agreement
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connected state */}
      {status?.connected && (
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Account
                </span>
                {status.onboardingComplete ? (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="secondary">Pending Setup</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Charges</p>
                  <p className="flex items-center gap-1">
                    {status.chargesEnabled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Not enabled
                      </>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Payouts</p>
                  <p className="flex items-center gap-1">
                    {status.payoutsEnabled ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Not enabled
                      </>
                    )}
                  </p>
                </div>
              </div>

              {hasRequirements && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">
                    Additional information required
                  </p>
                  <p className="text-sm text-yellow-700">
                    Please complete your account setup to enable all features.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {!status.onboardingComplete && (
                  <Button
                    onClick={handleOnboard}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'onboard' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Complete Setup
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={handleDashboard}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'dashboard' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Stripe Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          {status.onboardingComplete && (
            <Card>
              <CardHeader>
                <CardTitle>What you can do</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Customers</p>
                    <p className="text-sm text-muted-foreground">
                      Manage your customer database
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Manage <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Invoices</p>
                    <p className="text-sm text-muted-foreground">
                      Create and send invoices
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Create <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Subscriptions</p>
                    <p className="text-sm text-muted-foreground">
                      Set up recurring billing
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Create <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Payment Links</p>
                    <p className="text-sm text-muted-foreground">
                      Create shareable payment links
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Create <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

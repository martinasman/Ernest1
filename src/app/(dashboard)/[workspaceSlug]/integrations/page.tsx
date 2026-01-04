'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  Calendar,
  Cloud,
  Mail,
  MessageSquare,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Zap,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface IntegrationStatus {
  stripeConnect: boolean
  calcom: boolean
  storage: boolean
}

const INTEGRATIONS = [
  {
    id: 'stripe-connect',
    name: 'Stripe Connect',
    description: 'Accept payments, create invoices, and manage subscriptions for your customers',
    icon: CreditCard,
    category: 'Payments',
    path: 'settings/payments',
    features: ['Credit card payments', 'Invoicing', 'Recurring subscriptions', 'Payment links'],
    statusKey: 'stripeConnect' as const,
  },
  {
    id: 'calcom',
    name: 'Cal.com',
    description: 'Sync bookings and embed scheduling widgets on your website',
    icon: Calendar,
    category: 'Scheduling',
    path: 'settings/scheduling',
    features: ['Booking sync', 'Embeddable widgets', 'Webhook notifications', 'AI scheduling'],
    statusKey: 'calcom' as const,
  },
  {
    id: 'storage',
    name: 'File Storage',
    description: 'Upload and manage files, documents, and brand assets',
    icon: Cloud,
    category: 'Storage',
    path: 'settings',
    features: ['File uploads', 'Brand assets', 'Document management', 'Image hosting'],
    statusKey: 'storage' as const,
    alwaysActive: true,
  },
]

const COMING_SOON = [
  {
    id: 'email',
    name: 'Email (Resend)',
    description: 'Send transactional emails and newsletters',
    icon: Mail,
    category: 'Communication',
  },
  {
    id: 'sms',
    name: 'SMS (Twilio)',
    description: 'Send text messages and notifications',
    icon: MessageSquare,
    category: 'Communication',
  },
  {
    id: 'docs',
    name: 'Documents',
    description: 'Generate PDFs and contracts',
    icon: FileText,
    category: 'Documents',
  },
]

export default function IntegrationsPage() {
  const router = useRouter()
  const { workspace } = useWorkspaceStore()
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<IntegrationStatus>({
    stripeConnect: false,
    calcom: false,
    storage: true, // Always active
  })

  useEffect(() => {
    if (workspace?.id) {
      fetchStatus()
    }
  }, [workspace?.id])

  async function fetchStatus() {
    if (!workspace?.id) return

    setLoading(true)
    try {
      // Fetch Stripe Connect status
      const stripeRes = await fetch(`/api/stripe/connect?workspaceId=${workspace.id}`)
      const stripeData = await stripeRes.json()

      // Fetch Cal.com status
      const calRes = await fetch(`/api/calcom/connect?workspaceId=${workspace.id}`)
      const calData = await calRes.json()

      setStatus({
        stripeConnect: stripeData.connected === true,
        calcom: calData.connected === true,
        storage: true,
      })
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleNavigate(path: string) {
    if (workspace) {
      router.push(`/${workspace.slug}/${path}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const activeCount = Object.values(status).filter(Boolean).length

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link2 className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Integrations</h1>
        </div>
        <p className="text-muted-foreground">
          Connect external services to extend Ernest's capabilities
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Link2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{INTEGRATIONS.length}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Zap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{COMING_SOON.length}</p>
                <p className="text-sm text-muted-foreground">Coming Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Integrations */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Available Integrations</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {INTEGRATIONS.map((integration) => {
            const isConnected = status[integration.statusKey]
            const Icon = integration.icon

            return (
              <Card
                key={integration.id}
                className={isConnected ? 'border-green-200 bg-green-50/50' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${isConnected ? 'text-green-700' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    {isConnected && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription>{integration.description}</CardDescription>

                  <div className="flex flex-wrap gap-2">
                    {integration.features.map((feature) => (
                      <span
                        key={feature}
                        className="text-xs px-2 py-1 bg-muted rounded-md"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  <Button
                    variant={isConnected ? 'outline' : 'default'}
                    className="w-full"
                    onClick={() => handleNavigate(integration.path)}
                  >
                    {isConnected ? 'Manage' : 'Connect'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Coming Soon</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {COMING_SOON.map((integration) => {
            const Icon = integration.icon

            return (
              <Card key={integration.id} className="opacity-60">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{integration.description}</CardDescription>
                  <Button variant="outline" className="w-full mt-4" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

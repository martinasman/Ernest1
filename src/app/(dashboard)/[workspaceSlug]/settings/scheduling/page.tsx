'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock,
  User,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface Booking {
  id: string
  calcom_booking_id: string
  attendee_name: string
  attendee_email: string
  start_time: string
  end_time: string
  status: string
  event_type_name: string | null
  location: string | null
}

interface ConnectionStatus {
  connected: boolean
  username?: string
}

export default function SchedulingSettingsPage() {
  const searchParams = useSearchParams()
  const { workspace } = useWorkspaceStore()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)

  useEffect(() => {
    if (workspace?.id) {
      fetchStatus()
      fetchBookings()
    }
  }, [workspace?.id])

  async function fetchStatus() {
    if (!workspace?.id) return

    try {
      const response = await fetch(`/api/calcom/connect?workspaceId=${workspace.id}`)
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBookings(sync = false) {
    if (!workspace?.id) return

    try {
      const url = `/api/calcom/bookings?workspaceId=${workspace.id}${sync ? '&sync=true' : ''}`
      const response = await fetch(url)
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    }
  }

  async function handleConnect() {
    if (!workspace?.id || !apiKey) return

    setActionLoading('connect')
    try {
      const response = await fetch('/api/calcom/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace.id,
          apiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect')
      }

      setStatus({ connected: true, username: data.username })
      setApiKey('')
      setShowApiKeyInput(false)
      fetchBookings(true)
    } catch (error) {
      console.error('Connect error:', error)
      alert(error instanceof Error ? error.message : 'Failed to connect')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDisconnect() {
    if (!workspace?.id) return

    if (!confirm('Are you sure you want to disconnect Cal.com?')) return

    setActionLoading('disconnect')
    try {
      const response = await fetch(`/api/calcom/connect?workspaceId=${workspace.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setStatus({ connected: false })
      setBookings([])
    } catch (error) {
      console.error('Disconnect error:', error)
      alert(error instanceof Error ? error.message : 'Failed to disconnect')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSync() {
    setActionLoading('sync')
    try {
      await fetchBookings(true)
    } finally {
      setActionLoading(null)
    }
  }

  function formatDateTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getStatusBadge(bookingStatus: string) {
    switch (bookingStatus) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{bookingStatus}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <p className="text-muted-foreground">
          Connect Cal.com to manage bookings and appointments
        </p>
      </div>

      {/* Not connected state */}
      {!status?.connected && !showApiKeyInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Connect Cal.com
            </CardTitle>
            <CardDescription>
              Integrate with Cal.com to sync your bookings and embed scheduling widgets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Sync bookings automatically</p>
                  <p className="text-muted-foreground">
                    All your Cal.com bookings synced in real-time
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Embed booking widgets</p>
                  <p className="text-muted-foreground">
                    Add booking calendars to your website
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">AI-powered scheduling</p>
                  <p className="text-muted-foreground">
                    Let Ernest help manage your appointments
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setShowApiKeyInput(true)} className="w-full">
              Connect Cal.com
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Key Input */}
      {!status?.connected && showApiKeyInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Enter API Key
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeyInput(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Get your API key from{' '}
              <a
                href="https://app.cal.com/settings/developer/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Cal.com Settings → Developer → API Keys
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="cal_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            <Button
              onClick={handleConnect}
              disabled={!apiKey || actionLoading !== null}
              className="w-full"
            >
              {actionLoading === 'connect' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Connect
            </Button>
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
                  <Calendar className="h-5 w-5" />
                  Cal.com Connected
                </span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status.username && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium">{status.username}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.open('https://app.cal.com', '_blank')}
                >
                  Open Cal.com
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSync}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'sync' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Bookings
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'disconnect' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
              <CardDescription>
                Your scheduled appointments from Cal.com
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming bookings
                </p>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{booking.attendee_name}</p>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.attendee_email}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(booking.start_time)}
                          </span>
                          {booking.event_type_name && (
                            <span>{booking.event_type_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

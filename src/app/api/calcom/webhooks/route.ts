import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Webhook payload types
interface CalComWebhookPayload {
  triggerEvent: string
  payload: {
    bookingId?: number
    uid?: string
    title?: string
    startTime?: string
    endTime?: string
    status?: string
    attendees?: Array<{
      name: string
      email: string
    }>
    eventType?: {
      id: number
      title: string
    }
    location?: string
    metadata?: Record<string, unknown>
    organizer?: {
      id: number
      username: string
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: CalComWebhookPayload = await req.json()

    const { triggerEvent, payload } = body

    const supabase = await createClient()

    // Find workspace by organizer
    if (!payload.organizer?.id) {
      return NextResponse.json({ error: 'Missing organizer' }, { status: 400 })
    }

    const { data: connection } = await supabase
      .from('calcom_connections')
      .select('workspace_id')
      .eq('user_id', String(payload.organizer.id))
      .single()

    if (!connection) {
      // No connected workspace found, but that's ok - just acknowledge
      return NextResponse.json({ received: true })
    }

    const workspaceId = connection.workspace_id

    switch (triggerEvent) {
      case 'BOOKING_CREATED':
      case 'BOOKING_RESCHEDULED': {
        if (payload.bookingId) {
          await supabase
            .from('calcom_bookings')
            .upsert({
              workspace_id: workspaceId,
              calcom_booking_id: String(payload.bookingId),
              attendee_name: payload.attendees?.[0]?.name || 'Unknown',
              attendee_email: payload.attendees?.[0]?.email || '',
              start_time: payload.startTime,
              end_time: payload.endTime,
              status: (payload.status || 'pending').toLowerCase(),
              event_type_id: payload.eventType?.id ? String(payload.eventType.id) : null,
              event_type_name: payload.eventType?.title || null,
              location: payload.location || null,
              metadata: payload.metadata || {},
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'workspace_id,calcom_booking_id',
            })
        }
        break
      }

      case 'BOOKING_CANCELLED': {
        if (payload.bookingId) {
          await supabase
            .from('calcom_bookings')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('workspace_id', workspaceId)
            .eq('calcom_booking_id', String(payload.bookingId))
        }
        break
      }

      case 'BOOKING_CONFIRMED': {
        if (payload.bookingId) {
          await supabase
            .from('calcom_bookings')
            .update({
              status: 'accepted',
              updated_at: new Date().toISOString(),
            })
            .eq('workspace_id', workspaceId)
            .eq('calcom_booking_id', String(payload.bookingId))
        }
        break
      }

      case 'BOOKING_REJECTED': {
        if (payload.bookingId) {
          await supabase
            .from('calcom_bookings')
            .update({
              status: 'rejected',
              updated_at: new Date().toISOString(),
            })
            .eq('workspace_id', workspaceId)
            .eq('calcom_booking_id', String(payload.bookingId))
        }
        break
      }

      default:
        console.log(`Unhandled Cal.com webhook event: ${triggerEvent}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Cal.com webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

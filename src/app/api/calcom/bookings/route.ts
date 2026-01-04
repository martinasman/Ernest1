import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCalComClient } from '@/lib/calcom/client'

// GET - List bookings
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')
    const sync = searchParams.get('sync') === 'true'

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

    // If sync requested, fetch from Cal.com
    if (sync) {
      const { data: connection } = await supabase
        .from('calcom_connections')
        .select('calcom_api_key')
        .eq('workspace_id', workspaceId)
        .single()

      if (connection?.calcom_api_key) {
        const client = createCalComClient(connection.calcom_api_key)
        const calBookings = await client.getBookings({ status: 'upcoming' })

        // Upsert bookings
        for (const booking of calBookings) {
          await supabase
            .from('calcom_bookings')
            .upsert({
              workspace_id: workspaceId,
              calcom_booking_id: String(booking.id),
              attendee_name: booking.attendees[0]?.name || 'Unknown',
              attendee_email: booking.attendees[0]?.email || '',
              start_time: booking.startTime,
              end_time: booking.endTime,
              status: booking.status.toLowerCase(),
              event_type_id: String(booking.eventType.id),
              event_type_name: booking.eventType.title,
              location: booking.location || null,
              metadata: booking.metadata || {},
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'workspace_id,calcom_booking_id',
            })
        }
      }
    }

    // Get bookings from database
    const { data: bookings, error } = await supabase
      .from('calcom_bookings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('start_time', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('List bookings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list bookings' },
      { status: 500 }
    )
  }
}

// POST - Sync bookings from Cal.com
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, dateFrom, dateTo } = await req.json()

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

    // Get connection
    const { data: connection } = await supabase
      .from('calcom_connections')
      .select('calcom_api_key')
      .eq('workspace_id', workspaceId)
      .single()

    if (!connection?.calcom_api_key) {
      return NextResponse.json({ error: 'Cal.com not connected' }, { status: 400 })
    }

    // Fetch bookings
    const client = createCalComClient(connection.calcom_api_key)
    const calBookings = await client.getBookings({
      dateFrom,
      dateTo,
    })

    // Upsert bookings
    let synced = 0
    for (const booking of calBookings) {
      const { error } = await supabase
        .from('calcom_bookings')
        .upsert({
          workspace_id: workspaceId,
          calcom_booking_id: String(booking.id),
          attendee_name: booking.attendees[0]?.name || 'Unknown',
          attendee_email: booking.attendees[0]?.email || '',
          start_time: booking.startTime,
          end_time: booking.endTime,
          status: booking.status.toLowerCase(),
          event_type_id: String(booking.eventType.id),
          event_type_name: booking.eventType.title,
          location: booking.location || null,
          metadata: booking.metadata || {},
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'workspace_id,calcom_booking_id',
        })

      if (!error) synced++
    }

    return NextResponse.json({
      success: true,
      synced,
      total: calBookings.length,
    })
  } catch (error) {
    console.error('Sync bookings error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync bookings' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel booking
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const bookingId = searchParams.get('bookingId')
    const workspaceId = searchParams.get('workspaceId')

    if (!bookingId || !workspaceId) {
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

    // Get connection and booking
    const { data: connection } = await supabase
      .from('calcom_connections')
      .select('calcom_api_key')
      .eq('workspace_id', workspaceId)
      .single()

    const { data: booking } = await supabase
      .from('calcom_bookings')
      .select('calcom_booking_id')
      .eq('id', bookingId)
      .eq('workspace_id', workspaceId)
      .single()

    if (!connection?.calcom_api_key || !booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Cancel in Cal.com
    const client = createCalComClient(connection.calcom_api_key)
    await client.cancelBooking(parseInt(booking.calcom_booking_id))

    // Update in database
    await supabase
      .from('calcom_bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel booking error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel booking' },
      { status: 500 }
    )
  }
}

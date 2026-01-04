import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyCalComApiKey } from '@/lib/calcom/client'

// GET - Get connection status
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

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
    const { data: connection, error } = await supabase
      .from('calcom_connections')
      .select('status, username, user_id')
      .eq('workspace_id', workspaceId)
      .single()

    if (error || !connection) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      status: connection.status,
      username: connection.username,
      userId: connection.user_id,
    })
  } catch (error) {
    console.error('Cal.com status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}

// POST - Connect Cal.com account
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { workspaceId, apiKey } = await req.json()

    if (!workspaceId || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify workspace access (owner only)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage integrations' }, { status: 403 })
    }

    // Verify API key
    const verification = await verifyCalComApiKey(apiKey)

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid API key' },
        { status: 400 }
      )
    }

    // Save connection
    const { error: upsertError } = await supabase
      .from('calcom_connections')
      .upsert({
        workspace_id: workspaceId,
        calcom_api_key: apiKey,
        status: 'connected',
        user_id: String(verification.user?.id),
        username: verification.user?.username,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workspace_id',
      })

    if (upsertError) {
      throw upsertError
    }

    return NextResponse.json({
      success: true,
      username: verification.user?.username,
    })
  } catch (error) {
    console.error('Cal.com connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect' },
      { status: 500 }
    )
  }
}

// DELETE - Disconnect Cal.com account
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    // Verify workspace access (owner only)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage integrations' }, { status: 403 })
    }

    // Delete connection
    await supabase
      .from('calcom_connections')
      .delete()
      .eq('workspace_id', workspaceId)

    // Delete associated bookings
    await supabase
      .from('calcom_bookings')
      .delete()
      .eq('workspace_id', workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cal.com disconnect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect' },
      { status: 500 }
    )
  }
}

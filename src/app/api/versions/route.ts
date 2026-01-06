import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/versions?workspaceId=xxx - List versions for workspace
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspaceId' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { data: versions, error } = await supabase
      .from('website_versions')
      .select('id, label, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Error fetching versions:', error)
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    return NextResponse.json({ versions: versions || [] })
  } catch (error) {
    console.error('Failed to load versions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/versions - Save a new version
export async function POST(req: Request) {
  try {
    const { workspaceId, files, label } = await req.json()

    if (!workspaceId || !files) {
      return NextResponse.json({ error: 'Missing workspaceId or files' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: version, error } = await supabase
      .from('website_versions')
      .insert({
        workspace_id: workspaceId,
        files,
        label: label || null,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Error saving version:', error)
      return NextResponse.json({ error: 'Failed to save version' }, { status: 500 })
    }

    return NextResponse.json({ version })
  } catch (error) {
    console.error('Failed to save version:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

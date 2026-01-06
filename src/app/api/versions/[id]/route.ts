import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/versions/[id] - Get a specific version's files
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing version id' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    const { data: version, error } = await supabase
      .from('website_versions')
      .select('id, files, label, created_at, workspace_id')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching version:', error)
      return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 })
    }

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    return NextResponse.json({ version })
  } catch (error) {
    console.error('Failed to load version:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

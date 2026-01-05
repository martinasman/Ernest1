import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workspaceId } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner of the workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Only owner can delete
    if (workspace.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the workspace owner can delete it' }, { status: 403 })
    }

    // Delete the workspace (CASCADE will handle related tables)
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId)

    if (deleteError) {
      console.error('Delete workspace error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workspace error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

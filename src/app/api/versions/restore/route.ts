import { createClient } from '@/lib/supabase/server'
import { previewService } from '@/lib/preview'
import { NextResponse } from 'next/server'

// POST /api/versions/restore - Restore a version's files to the workspace
export async function POST(req: Request) {
  try {
    const { workspaceId, files } = await req.json()

    if (!workspaceId || !files) {
      return NextResponse.json({ error: 'Missing workspaceId or files' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get current workspace to preserve other ai_context fields
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('ai_context')
      .eq('id', workspaceId)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const aiContext = workspace.ai_context as Record<string, unknown> | null

    // Update workspace with restored files
    await supabase
      .from('workspaces')
      .update({
        ai_context: {
          ...aiContext,
          generated_files: files,
          websiteFiles: files,
        },
      })
      .eq('id', workspaceId)

    // Sync files to preview
    const session = await previewService.getActiveSession(workspaceId)
    if (session && session.status === 'running') {
      await previewService.syncFiles(workspaceId, files)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to restore version:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

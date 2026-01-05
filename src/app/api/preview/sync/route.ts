import { previewService } from '@/lib/preview/preview-service'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { workspaceId, files: providedFiles } = await req.json()

    if (!workspaceId) {
      return Response.json(
        { error: 'Missing required field: workspaceId' },
        { status: 400 }
      )
    }

    let files: Record<string, string>

    if (providedFiles) {
      // Use provided files directly
      files = providedFiles
    } else {
      // Get pre-generated files from workspace ai_context
      const supabase = await createClient()

      const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('ai_context')
        .eq('id', workspaceId)
        .single()

      if (error || !workspace) {
        return Response.json(
          { error: 'Workspace not found' },
          { status: 404 }
        )
      }

      const aiContext = workspace.ai_context as Record<string, unknown>
      files = aiContext?.websiteFiles as Record<string, string>

      if (!files || Object.keys(files).length === 0) {
        return Response.json(
          { error: 'No website files found. Generate a website first.' },
          { status: 400 }
        )
      }
    }

    // Sync files to preview VM
    const result = await previewService.syncFiles(workspaceId, files)

    return Response.json({
      success: true,
      syncedAt: result.syncedAt,
      fileCount: Object.keys(files).length,
    })
  } catch (error) {
    console.error('Sync preview error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to sync files' },
      { status: 500 }
    )
  }
}

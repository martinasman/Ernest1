import { previewService } from '@/lib/preview/preview-service'
import { convertWebsiteToFiles } from '@/lib/preview/website-to-files'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

interface WebsiteData {
  pages: Array<{
    slug: string
    title: string
    sections: Array<Record<string, unknown>>
  }>
  navigation?: Array<{ label: string; href: string }>
  footer?: { copyright: string; links: Array<{ label: string; href: string }> }
}

interface BrandData {
  colors?: Record<string, string>
  typography?: Record<string, unknown>
  name?: string
  tagline?: string
}

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
      // Generate files from workspace website data
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
      const websiteData = aiContext?.website as WebsiteData | undefined
      const brandData = aiContext?.brand as BrandData | undefined

      if (!websiteData) {
        return Response.json(
          { error: 'No website data found in workspace' },
          { status: 400 }
        )
      }

      // Convert website data to actual files
      files = convertWebsiteToFiles(websiteData, brandData)
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

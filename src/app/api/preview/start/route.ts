import { previewService } from '@/lib/preview/preview-service'

export const maxDuration = 120 // Allow up to 2 minutes for VM startup

export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json()

    if (!workspaceId) {
      return Response.json(
        { error: 'Missing required field: workspaceId' },
        { status: 400 }
      )
    }

    const result = await previewService.startPreview(workspaceId)

    return Response.json({
      success: true,
      sessionId: result.session.id,
      previewUrl: result.previewUrl,
      syncUrl: result.syncUrl,
      status: result.session.status,
      expiresAt: result.session.expires_at,
    })
  } catch (error) {
    console.error('Start preview error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to start preview' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return Response.json(
        { error: 'Missing required parameter: workspaceId' },
        { status: 400 }
      )
    }

    const session = await previewService.getActiveSession(workspaceId)

    if (!session) {
      return Response.json({ active: false })
    }

    return Response.json({
      active: true,
      sessionId: session.id,
      previewUrl: session.preview_url,
      syncUrl: session.sync_url,
      status: session.status,
      expiresAt: session.expires_at,
      lastActivity: session.last_activity_at,
      fileCount: session.file_count,
      filesSyncedAt: session.files_synced_at,
    })
  } catch (error) {
    console.error('Get preview session error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get preview session' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return Response.json(
        { error: 'Missing required parameter: workspaceId' },
        { status: 400 }
      )
    }

    await previewService.stopPreview(workspaceId)

    return Response.json({ success: true })
  } catch (error) {
    console.error('Stop preview error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to stop preview' },
      { status: 500 }
    )
  }
}

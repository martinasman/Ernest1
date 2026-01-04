import { previewService } from '@/lib/preview/preview-service'

export const maxDuration = 30

export async function PUT(req: Request) {
  try {
    const { workspaceId, path, content } = await req.json()

    if (!workspaceId || !path || content === undefined) {
      return Response.json(
        { error: 'Missing required fields: workspaceId, path, content' },
        { status: 400 }
      )
    }

    const result = await previewService.updateFile(workspaceId, path, content)

    return Response.json({
      success: true,
      path,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Update preview file error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update file' },
      { status: 500 }
    )
  }
}

// Extend session lifetime
export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json()

    if (!workspaceId) {
      return Response.json(
        { error: 'Missing required field: workspaceId' },
        { status: 400 }
      )
    }

    await previewService.extendSession(workspaceId)

    return Response.json({
      success: true,
      message: 'Session extended by 30 minutes',
    })
  } catch (error) {
    console.error('Extend session error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to extend session' },
      { status: 500 }
    )
  }
}

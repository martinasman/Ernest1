import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  uploadFile,
  generateFilePath,
  validateFileType,
  validateFileSize,
  FILE_TYPES,
  MAX_FILE_SIZES,
  BUCKETS,
  BucketName,
} from '@/lib/supabase/storage'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const workspaceId = formData.get('workspaceId') as string | null
    const bucket = formData.get('bucket') as BucketName | null
    const folder = formData.get('folder') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspaceId provided' }, { status: 400 })
    }

    if (!bucket || !Object.values(BUCKETS).includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 })
    }

    // Verify user has access to workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Determine allowed file types and max size based on bucket
    let allowedTypes: string[] = []
    let maxSize = MAX_FILE_SIZES.DEFAULT

    switch (bucket) {
      case BUCKETS.BRAND_ASSETS:
        allowedTypes = [...FILE_TYPES.IMAGES]
        maxSize = MAX_FILE_SIZES.IMAGE
        break
      case BUCKETS.DOCUMENTS:
        allowedTypes = [...FILE_TYPES.DOCUMENTS, ...FILE_TYPES.SPREADSHEETS]
        maxSize = MAX_FILE_SIZES.DOCUMENT
        break
      case BUCKETS.ATTACHMENTS:
        allowedTypes = [
          ...FILE_TYPES.IMAGES,
          ...FILE_TYPES.DOCUMENTS,
          ...FILE_TYPES.SPREADSHEETS,
          ...FILE_TYPES.VIDEOS,
          ...FILE_TYPES.AUDIO,
        ]
        maxSize = MAX_FILE_SIZES.VIDEO
        break
    }

    // Validate file type
    if (!validateFileType(file.name, allowedTypes)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (!validateFileSize(file.size, maxSize)) {
      return NextResponse.json(
        { error: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB` },
        { status: 400 }
      )
    }

    // Generate file path
    const path = generateFilePath(workspaceId, file.name, folder || undefined)

    // Upload file
    const result = await uploadFile({
      bucket,
      path,
      file,
      contentType: file.type,
      upsert: false,
    })

    return NextResponse.json({
      success: true,
      data: {
        path: result.path,
        fullPath: result.fullPath,
        publicUrl: result.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      },
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

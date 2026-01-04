import { createClient } from './server'
import { createClient as createBrowserClient } from './client'

// Storage bucket names
export const BUCKETS = {
  BRAND_ASSETS: 'brand-assets',
  DOCUMENTS: 'documents',
  ATTACHMENTS: 'attachments',
} as const

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS]

interface UploadOptions {
  bucket: BucketName
  path: string
  file: File | Blob
  contentType?: string
  upsert?: boolean
}

interface UploadResult {
  path: string
  fullPath: string
  publicUrl: string | null
}

// Server-side upload
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, contentType, upsert = false } = options
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const publicUrl = getPublicUrl(bucket, data.path)

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl,
  }
}

// Client-side upload (for direct browser uploads)
export async function uploadFileClient(options: UploadOptions): Promise<UploadResult> {
  const { bucket, path, file, contentType, upsert = false } = options
  const supabase = createBrowserClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const publicUrl = getPublicUrlClient(bucket, data.path)

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl,
  }
}

// Delete file (server-side)
export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

// Delete file (client-side)
export async function deleteFileClient(bucket: BucketName, path: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

// Get public URL (server-side)
export function getPublicUrl(bucket: BucketName, path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

// Get public URL (client-side)
export function getPublicUrlClient(bucket: BucketName, path: string): string {
  const supabase = createBrowserClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

// Get signed URL for private files (server-side)
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

// Get signed URL (client-side)
export async function getSignedUrlClient(
  bucket: BucketName,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

// List files in a folder
export async function listFiles(bucket: BucketName, folder: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder)

  if (error) {
    throw new Error(`List failed: ${error.message}`)
  }

  return data
}

// Generate a unique file path
export function generateFilePath(
  workspaceId: string,
  fileName: string,
  folder?: string
): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

  const parts = [workspaceId]
  if (folder) parts.push(folder)
  parts.push(`${timestamp}-${randomId}-${safeName}`)

  return parts.join('/')
}

// Get file extension
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

// Validate file type
export function validateFileType(
  fileName: string,
  allowedTypes: string[]
): boolean {
  const ext = getFileExtension(fileName)
  return allowedTypes.includes(ext)
}

// Validate file size (in bytes)
export function validateFileSize(
  size: number,
  maxSize: number
): boolean {
  return size <= maxSize
}

// Common file type groups
export const FILE_TYPES = {
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  DOCUMENTS: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
  SPREADSHEETS: ['xls', 'xlsx', 'csv', 'ods'],
  VIDEOS: ['mp4', 'webm', 'mov', 'avi'],
  AUDIO: ['mp3', 'wav', 'ogg', 'aac'],
} as const

// Max file sizes
export const MAX_FILE_SIZES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DEFAULT: 10 * 1024 * 1024, // 10MB
} as const

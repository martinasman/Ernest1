'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, FileIcon, ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { BucketName } from '@/lib/supabase/storage'

interface FileUploadProps {
  workspaceId: string
  bucket: BucketName
  folder?: string
  accept?: string
  maxSize?: number
  multiple?: boolean
  onUpload?: (files: UploadedFile[]) => void
  onError?: (error: string) => void
  className?: string
  disabled?: boolean
}

interface UploadedFile {
  path: string
  fullPath: string
  publicUrl: string | null
  fileName: string
  fileSize: number
  fileType: string
}

interface FilePreview {
  file: File
  preview: string | null
  uploading: boolean
  error: string | null
  uploaded?: UploadedFile
}

export function FileUpload({
  workspaceId,
  bucket,
  folder,
  accept,
  maxSize,
  multiple = false,
  onUpload,
  onError,
  className,
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FilePreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles)

    // Create previews
    const newFiles: FilePreview[] = fileArray.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploading: true,
      error: null,
    }))

    setFiles(prev => multiple ? [...prev, ...newFiles] : newFiles)

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const filePreview = newFiles[i]
      const formData = new FormData()
      formData.append('file', filePreview.file)
      formData.append('workspaceId', workspaceId)
      formData.append('bucket', bucket)
      if (folder) formData.append('folder', folder)

      try {
        const response = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Upload failed')
        }

        setFiles(prev => prev.map(f =>
          f.file === filePreview.file
            ? { ...f, uploading: false, uploaded: result.data }
            : f
        ))

        if (onUpload) {
          onUpload([result.data])
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed'

        setFiles(prev => prev.map(f =>
          f.file === filePreview.file
            ? { ...f, uploading: false, error: errorMessage }
            : f
        ))

        if (onError) {
          onError(errorMessage)
        }
      }
    }
  }, [workspaceId, bucket, folder, multiple, onUpload, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const { files: droppedFiles } = e.dataTransfer
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles)
    }
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files: selectedFiles } = e.target
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      const removed = newFiles.splice(index, 1)[0]
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview)
      }
      return newFiles
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          isDragging && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragging && !disabled && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <Upload className="h-10 w-10 text-muted-foreground mb-4" />

        <p className="text-sm font-medium text-foreground mb-1">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>

        <p className="text-xs text-muted-foreground">
          {accept ? `Accepted files: ${accept}` : 'Any file type'}
          {maxSize && ` (max ${formatFileSize(maxSize)})`}
        </p>
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.file.name}-${index}`}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3',
                file.error && 'border-destructive bg-destructive/5'
              )}
            >
              {/* Preview/Icon */}
              <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : file.file.type.startsWith('image/') ? (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file.size)}
                  {file.error && (
                    <span className="text-destructive ml-2">{file.error}</span>
                  )}
                  {file.uploaded && (
                    <span className="text-green-600 ml-2">Uploaded</span>
                  )}
                </p>
              </div>

              {/* Status/Actions */}
              <div className="flex-shrink-0">
                {file.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFile(index)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

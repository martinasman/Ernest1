'use client'

import { useEffect, useCallback } from 'react'
import { usePreview } from '@/hooks/use-preview'
import { useWorkspace } from '@/hooks/use-workspace'
import { Loader2, RefreshCw, ExternalLink, AlertCircle, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface WebsitePreviewProps {
  workspaceId: string | null
  className?: string
}

export function WebsitePreview({ workspaceId, className }: WebsitePreviewProps) {
  const { workspace } = useWorkspace()
  const {
    isLoading,
    isStarting,
    isSyncing,
    error,
    previewUrl,
    session,
    startPreview,
    stopPreview,
    syncFiles,
    refreshSession,
  } = usePreview(workspaceId)

  // Check if website data exists
  const hasWebsiteData = !!(workspace?.ai_context as Record<string, unknown>)?.website

  // Auto-sync when website data changes
  const handleSync = useCallback(async () => {
    if (session?.status === 'running' && hasWebsiteData) {
      await syncFiles()
    }
  }, [session?.status, hasWebsiteData, syncFiles])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-gray-50', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // No website data
  if (!hasWebsiteData) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full bg-gray-50 text-gray-500', className)}>
        <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No Website Generated</p>
        <p className="text-sm text-gray-400 mt-1">
          Generate a website first to preview it
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full bg-gray-50', className)}>
        <AlertCircle className="w-12 h-12 mb-4 text-red-400" />
        <p className="text-lg font-medium text-red-600">Preview Error</p>
        <p className="text-sm text-gray-500 mt-1 max-w-md text-center">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshSession}
          className="mt-4"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  // No active session - show start button
  if (!session || session.status !== 'running') {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full bg-gray-50', className)}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-700">Live Preview</p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Start a live preview server to see your website with real-time updates
          </p>
          <Button
            onClick={startPreview}
            disabled={isStarting}
            className="mt-6"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Preview...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Live Preview
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Active session with preview
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">Live</span>
          </div>
          {isSyncing && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Syncing...
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync files"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          </Button>

          {previewUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={stopPreview}
            title="Stop preview"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview iframe */}
      {previewUrl ? (
        <iframe
          src={previewUrl}
          className="flex-1 w-full border-0"
          title="Website Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  )
}

export default WebsitePreview

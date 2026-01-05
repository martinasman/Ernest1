'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { useGenerationStore, getTaskDisplayName, GENERATION_STEPS } from '@/stores/generation-store'
import { Loader2, Globe, ExternalLink, RefreshCw, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export default function WebsitePage() {
  const { workspace, isLoading } = useWorkspace()
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const tasks = useGenerationStore((state) => state.tasks)
  const currentStep = useGenerationStore((state) => state.currentStep)

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isStartingPreview, setIsStartingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const hasStartedRef = useRef(false)
  const tickerIndexRef = useRef(0)
  const [ticker, setTicker] = useState<string>('')

  // Check if we have generated website files
  const aiContext = workspace?.ai_context as Record<string, unknown> | undefined
  const websiteFiles = aiContext?.websiteFiles as Record<string, string> | undefined
  const hasWebsiteFiles = websiteFiles && Object.keys(websiteFiles).length > 0

  // Auto-start preview when page loads with website files
  useEffect(() => {
    if (workspace?.id && hasWebsiteFiles && !previewUrl && !isStartingPreview && !hasStartedRef.current) {
      hasStartedRef.current = true
      startPreview()
    }
  }, [workspace?.id, hasWebsiteFiles, previewUrl, isStartingPreview])

  const startPreview = async (openInNewTab = false) => {
    if (!workspace?.id) return

    setIsStartingPreview(true)
    setPreviewError(null)

    try {
      // Start the preview VM
      const startResponse = await fetch('/api/preview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      })

      if (!startResponse.ok) {
        const error = await startResponse.json()
        throw new Error(error.error || 'Failed to start preview')
      }

      const { previewUrl: url } = await startResponse.json()

      // Sync the files
      const syncResponse = await fetch('/api/preview/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      })

      if (!syncResponse.ok) {
        const error = await syncResponse.json()
        throw new Error(error.error || 'Failed to sync files')
      }

      setPreviewUrl(url)

      if (openInNewTab) {
        window.open(url, '_blank')
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to start preview')
    } finally {
      setIsStartingPreview(false)
    }
  }

  const refreshPreview = async () => {
    if (!workspace?.id) return

    setIsStartingPreview(true)
    try {
      const syncResponse = await fetch('/api/preview/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      })

      if (!syncResponse.ok) {
        const error = await syncResponse.json()
        throw new Error(error.error || 'Failed to sync files')
      }
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to refresh')
    } finally {
      setIsStartingPreview(false)
    }
  }

  // Show generating state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-3" />
        <p className="text-gray-500">Loading workspace…</p>
      </div>
    )
  }

  if (isGenerating) {
    const currentTask = GENERATION_STEPS[currentStep]
    const websiteTask = tasks.website

    const tickerItems = useMemo(() => {
      const subTasks = websiteTask.subTasks || []
      if (subTasks.length === 0) {
        return [
          'Sketching page map',
          'Reading main layout',
          'Laying down hero section',
          'Styling typography',
          'Assembling components',
        ]
      }
      return subTasks.map((sub) => {
        const verb =
          sub.status === 'running'
            ? 'Editing'
            : sub.status === 'completed'
              ? 'Completed'
              : 'Reading'
        return `${verb} ${sub.name}`
      })
    }, [websiteTask.subTasks])

    useEffect(() => {
      if (!isGenerating || tickerItems.length === 0) return

      setTicker(tickerItems[0])
      tickerIndexRef.current = 0

      const interval = setInterval(() => {
        tickerIndexRef.current = (tickerIndexRef.current + 1) % tickerItems.length
        setTicker(tickerItems[tickerIndexRef.current])
      }, 1400)

      return () => clearInterval(interval)
    }, [isGenerating, tickerItems])

    return (
      <div className="min-h-[70vh] w-full bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl bg-white/80 backdrop-blur shadow-2xl rounded-3xl border border-slate-200 px-10 py-8">
          <div className="grid gap-8 md:grid-cols-[1.2fr,0.8fr] items-center">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200 animate-[spin_6s_linear_infinite]" />
              </div>
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Website</p>
                <h2 className="text-2xl font-semibold text-slate-900">Ernest is building</h2>
                <p className="text-slate-500">
                  {currentTask ? getTaskDisplayName(currentTask) : 'Starting...'}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-50 rounded-2xl p-5 shadow-inner border border-slate-800">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-300 mb-3">
                <span>Thinking</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  live
                </span>
              </div>
              <div className="text-lg font-mono leading-relaxed">
                {ticker || 'Planning structure...'}
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-4">
            {GENERATION_STEPS.map((task) => {
              const taskInfo = tasks[task]
              const isActive = taskInfo.status === 'running'
              const isDone = taskInfo.status === 'completed'
              return (
                <div
                  key={task}
                  className={cn(
                    'rounded-2xl border px-4 py-3 flex items-center gap-3 transition-all',
                    isDone
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm'
                      : isActive
                        ? 'border-slate-900 bg-slate-900 text-slate-50 shadow-md'
                        : 'border-slate-200 bg-white text-slate-500'
                  )}
                >
                  {isDone ? (
                    <span className="text-lg">✓</span>
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-current" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.14em]">
                      {getTaskDisplayName(task)}
                    </span>
                    <span className="text-sm font-medium">
                      {taskInfo.message || (isActive ? 'Working...' : 'Waiting...')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Subtle live ticker under the cards */}
          <div className="mt-4 text-sm text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">
              {ticker || 'Planning files...'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // No website generated yet
  if (!hasWebsiteFiles) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-500">
        <Globe className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Website Yet</h2>
        <p className="text-center max-w-md">
          Ask Ernest to build your website. Describe your business and I&apos;ll create a complete
          website with all the pages you need.
        </p>
      </div>
    )
  }

  // Website generated, show preview
  return (
    <div className="relative h-full">
      {/* Preview content - full screen */}
      <div className="h-full bg-gray-100">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Website Preview"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            {previewError ? (
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Globe className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Preview Error
                </h3>
                <p className="text-red-600 mb-4">{previewError}</p>
                <Button
                  onClick={() => startPreview()}
                  disabled={isStartingPreview}
                  className="bg-[#c8ff00] text-gray-900 hover:bg-[#b8ef00]"
                >
                  {isStartingPreview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Starting live preview...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating lime green button with dropdown */}
      <div className="absolute bottom-6 right-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                "h-12 px-5 rounded-full shadow-lg",
                "bg-[#c8ff00] text-gray-900 hover:bg-[#b8ef00]",
                "font-medium text-sm"
              )}
              disabled={isStartingPreview}
            >
              {isStartingPreview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : previewUrl ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-600 mr-2" />
                  Live Preview
                  <ChevronUp className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Preview
                  <ChevronUp className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="mb-2">
            <DropdownMenuItem onClick={() => startPreview()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => refreshPreview()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Files
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => startPreview(true)}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

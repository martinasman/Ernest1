'use client'

import { useEffect, useCallback } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { useGenerationStore, getTaskDisplayName, GENERATION_STEPS } from '@/stores/generation-store'
import { useUIStore, type WebsiteSelection } from '@/stores/ui-store'
import { SectionRenderer, type WebsiteSection, type WebsiteTheme, DEFAULT_THEME, getContrastColor } from '@/components/website/section-renderer'
import { Loader2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebsitePage {
  slug: string
  title: string
  metaTitle?: string
  metaDescription?: string
  sections: WebsiteSection[]
}

interface Navigation {
  label: string
  href: string
  isPrimary?: boolean
}

interface Footer {
  copyright: string
  tagline?: string
  links: Array<{ label: string; href: string }>
}

interface WebsiteData {
  pages: WebsitePage[]
  navigation?: Navigation[]
  footer?: Footer
}

export default function WebsitePage() {
  const { workspace } = useWorkspace()
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const tasks = useGenerationStore((state) => state.tasks)
  const currentStep = useGenerationStore((state) => state.currentStep)

  // Use shared UI store for page selection and view mode
  const selectedPageSlug = useUIStore((state) => state.selectedPage)
  const setSelectedPageSlug = useUIStore((state) => state.setSelectedPage)
  const viewMode = useUIStore((state) => state.viewMode)
  const setWebsitePages = useUIStore((state) => state.setWebsitePages)

  // Selection state for editing
  const selectedElement = useUIStore((state) => state.selectedElement)
  const setSelectedElement = useUIStore((state) => state.setSelectedElement)
  const clearSelection = useUIStore((state) => state.clearSelection)

  // Handle section selection
  const handleSectionSelect = useCallback((sectionIndex: number, sectionType: string) => {
    setSelectedElement({
      type: 'website',
      pageSlug: selectedPageSlug,
      sectionIndex,
      sectionType,
    } as WebsiteSelection)
  }, [selectedPageSlug, setSelectedElement])

  // Check if a section is selected
  const isSectionSelected = (sectionIndex: number) => {
    if (!selectedElement || selectedElement.type !== 'website') return false
    const ws = selectedElement as WebsiteSelection
    return ws.pageSlug === selectedPageSlug && ws.sectionIndex === sectionIndex
  }

  // Handle Escape key to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelection])

  // Clear selection when changing pages
  useEffect(() => {
    clearSelection()
  }, [selectedPageSlug, clearSelection])

  // Extract theme from brand colors
  const brandData = (workspace?.ai_context as Record<string, unknown>)?.brand as Record<string, unknown> | undefined
  const brandColors = brandData?.colors as Record<string, string> | undefined

  const theme: WebsiteTheme = {
    primary: brandColors?.primary || DEFAULT_THEME.primary,
    background: brandColors?.background || DEFAULT_THEME.background,
    foreground: brandColors?.foreground || DEFAULT_THEME.foreground,
    muted: brandColors?.muted || DEFAULT_THEME.muted,
  }

  const websiteData = (workspace?.ai_context as Record<string, unknown>)?.website as WebsiteData | undefined

  // Sync website pages to UI store for header dropdown
  useEffect(() => {
    if (websiteData?.pages) {
      setWebsitePages(websiteData.pages.map(p => ({ slug: p.slug, title: p.title })))
    }
  }, [websiteData?.pages, setWebsitePages])

  // Show generating state
  if (isGenerating) {
    const currentTask = GENERATION_STEPS[currentStep]
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-900 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Building Your Website</h2>
            <p className="text-gray-500 mt-1">
              {currentTask ? getTaskDisplayName(currentTask) : 'Starting...'}
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-6 max-w-xs mx-auto">
            {GENERATION_STEPS.map((task) => {
              const taskInfo = tasks[task]
              return (
                <div
                  key={task}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    taskInfo.status === 'completed' ? 'text-green-600' :
                    taskInfo.status === 'running' ? 'text-gray-900' :
                    'text-gray-400'
                  )}
                >
                  {taskInfo.status === 'completed' ? (
                    <span>✓</span>
                  ) : taskInfo.status === 'running' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-current" />
                  )}
                  <span>{getTaskDisplayName(task)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (!websiteData?.pages?.length) {
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

  const selectedPage = websiteData.pages.find((p) => p.slug === selectedPageSlug) || websiteData.pages[0]
  const navigation = websiteData.navigation || []
  const footer = websiteData.footer

  return (
    <div className="flex flex-col h-full bg-gray-100 overflow-auto">
      {/* Preview container with responsive width */}
      <div
        className={cn(
          'mx-auto w-full transition-all duration-300',
          viewMode === 'desktop' ? 'max-w-full' :
          viewMode === 'tablet' ? 'max-w-[768px]' :
          'max-w-[375px]'
        )}
      >
        {/* Navigation */}
        {navigation.length > 0 && (
          <nav
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{
              backgroundColor: theme.background,
              borderColor: theme.muted,
            }}
          >
            <div
              className="text-lg font-bold"
              style={{ color: theme.foreground }}
            >
              {workspace?.name || 'Your Brand'}
            </div>
            <div className="flex items-center gap-6">
              {navigation.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const pageSlug = item.href.replace('/', '') || 'home'
                    const page = websiteData.pages.find(p => p.slug === pageSlug)
                    if (page) setSelectedPageSlug(page.slug)
                  }}
                  className={cn(
                    'text-sm transition-colors',
                    item.isPrimary && 'px-4 py-2 rounded-lg font-medium'
                  )}
                  style={
                    item.isPrimary
                      ? { backgroundColor: theme.primary, color: getContrastColor(theme.primary) }
                      : { color: theme.foreground, opacity: 0.7 }
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Page content */}
        <div
          className="min-h-[500px]"
          style={{ backgroundColor: theme.background }}
          onClick={(e) => {
            // Clear selection when clicking on empty space (not a section)
            if (e.target === e.currentTarget) {
              clearSelection()
            }
          }}
        >
          {selectedPage.sections.map((section, index) => (
            <SectionRenderer
              key={index}
              section={section}
              theme={theme}
              sectionIndex={index}
              isSelected={isSectionSelected(index)}
              onSelect={handleSectionSelect}
            />
          ))}
        </div>

        {/* Footer */}
        {footer && (
          <footer
            className="px-6 py-8 border-t"
            style={{
              backgroundColor: theme.muted,
              borderColor: theme.muted,
            }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div
                className="text-sm"
                style={{ color: theme.foreground, opacity: 0.6 }}
              >
                {footer.copyright}
                {footer.tagline && <span className="ml-2">{footer.tagline}</span>}
              </div>
              {footer.links.length > 0 && (
                <div className="flex gap-6">
                  {footer.links.map((link, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const pageSlug = link.href.replace('/', '') || 'home'
                        const page = websiteData.pages.find(p => p.slug === pageSlug)
                        if (page) setSelectedPageSlug(page.slug)
                      }}
                      className="text-sm transition-opacity hover:opacity-100"
                      style={{ color: theme.foreground, opacity: 0.6 }}
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

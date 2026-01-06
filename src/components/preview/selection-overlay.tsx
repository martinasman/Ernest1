'use client'

import { useState, useMemo, useEffect } from 'react'
import { useUIStore, type WebsiteSelection } from '@/stores/ui-store'
import { getSectionsForPage, getSectionLabel } from '@/lib/page-sections'
import { cn } from '@/lib/utils'

interface SelectionOverlayProps {
  pageSlug: string
}

export function SelectionOverlay({ pageSlug }: SelectionOverlayProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const setSelectedElement = useUIStore((state) => state.setSelectedElement)
  const setSelectMode = useUIStore((state) => state.setSelectMode)

  // Get sections for current page
  const sections = useMemo(() => getSectionsForPage(pageSlug), [pageSlug])

  // Handle ESC key to exit select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectMode(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectMode])

  const handleSectionClick = (index: number, sectionType: string) => {
    const selection: WebsiteSelection = {
      type: 'website',
      pageSlug: pageSlug,
      sectionIndex: index,
      sectionType: sectionType,
    }
    setSelectedElement(selection)
    setSelectMode(false) // Exit select mode after selection
  }

  return (
    <div className="absolute inset-0 z-10 cursor-crosshair">
      {/* Section zones - distributed evenly */}
      <div className="h-full flex flex-col">
        {sections.map((section, index) => (
          <div
            key={`${section}-${index}`}
            className={cn(
              "flex-1 relative transition-all duration-150",
              "border-2 border-transparent",
              hoveredIndex === index && "border-blue-500 bg-blue-500/20"
            )}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleSectionClick(index, section)}
          >
            {/* Floating label on hover */}
            {hoveredIndex === index && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap">
                  {getSectionLabel(section)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Escape hint at top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20">
        <div className="bg-gray-900/90 text-white px-4 py-2 rounded-full text-sm shadow-lg">
          Click to select a section &bull; Press ESC to cancel
        </div>
      </div>
    </div>
  )
}

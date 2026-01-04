import { create } from 'zustand'

export type SectionTab = 'website' | 'overview' | 'brand' | 'flow' | 'internal' | 'code' | 'settings'
export type ViewMode = 'desktop' | 'tablet' | 'mobile'

// Selection types for editing
export interface WebsiteSelection {
  type: 'website'
  pageSlug: string
  sectionIndex: number
  sectionType: string
}

export interface OverviewSelection {
  type: 'overview'
  field: string // 'problems', 'solutions', 'unique_value_proposition', etc.
  fieldLabel: string // Human readable label
}

export type SelectedElement = WebsiteSelection | OverviewSelection | null

interface UIState {
  // Active section tab
  activeSection: SectionTab
  setActiveSection: (section: SectionTab) => void

  // Pinned tabs (visible in header)
  pinnedTabs: SectionTab[]
  pinTab: (tab: SectionTab) => void
  unpinTab: (tab: SectionTab) => void

  // Website preview state
  selectedPage: string
  setSelectedPage: (page: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  websitePages: Array<{ slug: string; title: string }>
  setWebsitePages: (pages: Array<{ slug: string; title: string }>) => void

  // Selection state for editing
  selectedElement: SelectedElement
  setSelectedElement: (element: SelectedElement) => void
  clearSelection: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeSection: 'website',
  setActiveSection: (section) => set({ activeSection: section }),

  pinnedTabs: ['website', 'overview'],
  pinTab: (tab) => set((state) => ({
    pinnedTabs: state.pinnedTabs.includes(tab) ? state.pinnedTabs : [...state.pinnedTabs, tab]
  })),
  unpinTab: (tab) => set((state) => ({
    pinnedTabs: state.pinnedTabs.filter((t) => t !== tab)
  })),

  // Website preview state
  selectedPage: 'home',
  setSelectedPage: (page) => set({ selectedPage: page }),
  viewMode: 'desktop',
  setViewMode: (mode) => set({ viewMode: mode }),
  websitePages: [],
  setWebsitePages: (pages) => set({ websitePages: pages }),

  // Selection state for editing
  selectedElement: null,
  setSelectedElement: (element) => set({ selectedElement: element }),
  clearSelection: () => set({ selectedElement: null }),
}))

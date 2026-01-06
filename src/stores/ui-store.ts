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

// Version restore callback type
export type RestoreVersionCallback = (files: Record<string, string>, timestamp: string) => void

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

  // Editing state for live feedback
  isEditing: boolean
  setIsEditing: (value: boolean) => void

  // Select mode for visual element selection
  isSelectMode: boolean
  setSelectMode: (mode: boolean) => void
  toggleSelectMode: () => void

  // Working status for shimmer indicator
  workingStatus: string | null
  setWorkingStatus: (status: string | null) => void

  // Version restore (set by chat panel, called by header)
  restoreVersion: RestoreVersionCallback | null
  setRestoreVersionCallback: (callback: RestoreVersionCallback | null) => void
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

  // Editing pulse state
  isEditing: false,
  setIsEditing: (value) => set({ isEditing: value }),

  // Select mode for visual element selection
  isSelectMode: false,
  setSelectMode: (mode) => set({ isSelectMode: mode }),
  toggleSelectMode: () => set((state) => ({ isSelectMode: !state.isSelectMode })),

  // Working status for shimmer indicator
  workingStatus: null,
  setWorkingStatus: (status) => set({ workingStatus: status }),

  // Version restore callback
  restoreVersion: null,
  setRestoreVersionCallback: (callback) => set({ restoreVersion: callback }),
}))

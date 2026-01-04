import { create } from 'zustand'

export type SectionTab = 'website' | 'overview' | 'brand' | 'flow' | 'internal' | 'settings'

interface UIState {
  // Active section tab
  activeSection: SectionTab
  setActiveSection: (section: SectionTab) => void

  // Pinned tabs (visible in header)
  pinnedTabs: SectionTab[]
  pinTab: (tab: SectionTab) => void
  unpinTab: (tab: SectionTab) => void
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
}))

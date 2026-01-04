import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Database } from '@/lib/supabase/types'

type Workspace = Database['public']['Tables']['workspaces']['Row']
type Brand = Database['public']['Tables']['brands']['Row']
type Overview = Database['public']['Tables']['overviews']['Row']
type InternalTool = Database['public']['Tables']['internal_tools']['Row']

interface WorkspaceState {
  // Current workspace data
  workspace: Workspace | null
  brand: Brand | null
  overview: Overview | null
  tools: InternalTool[]

  // Loading states
  isLoading: boolean
  error: string | null

  // Actions
  setWorkspace: (workspace: Workspace | null) => void
  setBrand: (brand: Brand | null) => void
  setOverview: (overview: Overview | null) => void
  setTools: (tools: InternalTool[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Update helpers
  updateBrand: (updates: Partial<Brand>) => void
  updateOverview: (updates: Partial<Overview>) => void
  addTool: (tool: InternalTool) => void
  updateTool: (toolId: string, updates: Partial<InternalTool>) => void
  removeTool: (toolId: string) => void

  // Reset
  reset: () => void
}

const initialState = {
  workspace: null,
  brand: null,
  overview: null,
  tools: [],
  isLoading: false,
  error: null,
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set) => ({
    ...initialState,

    setWorkspace: (workspace) => set({ workspace }),
    setBrand: (brand) => set({ brand }),
    setOverview: (overview) => set({ overview }),
    setTools: (tools) => set({ tools }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),

    updateBrand: (updates) => set((state) => {
      if (state.brand) {
        Object.assign(state.brand, updates)
      }
    }),

    updateOverview: (updates) => set((state) => {
      if (state.overview) {
        Object.assign(state.overview, updates)
      }
    }),

    addTool: (tool) => set((state) => {
      state.tools.push(tool)
    }),

    updateTool: (toolId, updates) => set((state) => {
      const index = state.tools.findIndex((t) => t.id === toolId)
      if (index !== -1) {
        Object.assign(state.tools[index], updates)
      }
    }),

    removeTool: (toolId) => set((state) => {
      state.tools = state.tools.filter((t) => t.id !== toolId)
    }),

    reset: () => set(initialState),
  }))
)

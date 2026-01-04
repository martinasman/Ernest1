import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export type GenerationTask =
  | 'brand'
  | 'overview'
  | 'website'
  | 'flow'
  | 'tools'

export interface TaskProgress {
  task: GenerationTask
  status: 'pending' | 'running' | 'completed' | 'error'
  message: string
  error?: string
}

interface GenerationState {
  isGenerating: boolean
  prompt: string | null
  tasks: Record<GenerationTask, TaskProgress>

  // Actions
  startGeneration: (prompt: string) => void
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void
  completeGeneration: () => void
  reset: () => void
}

const createInitialTasks = (): Record<GenerationTask, TaskProgress> => ({
  brand: { task: 'brand', status: 'pending', message: 'Waiting...' },
  overview: { task: 'overview', status: 'pending', message: 'Waiting...' },
  website: { task: 'website', status: 'pending', message: 'Waiting...' },
  flow: { task: 'flow', status: 'pending', message: 'Waiting...' },
  tools: { task: 'tools', status: 'pending', message: 'Waiting...' },
})

export const useGenerationStore = create<GenerationState>()(
  immer((set) => ({
    isGenerating: false,
    prompt: null,
    tasks: createInitialTasks(),

    startGeneration: (prompt) => set((state) => {
      state.isGenerating = true
      state.prompt = prompt
      state.tasks = createInitialTasks()
    }),

    updateTask: (task, updates) => set((state) => {
      Object.assign(state.tasks[task], updates)
    }),

    completeGeneration: () => set({ isGenerating: false }),

    reset: () => set({
      isGenerating: false,
      prompt: null,
      tasks: createInitialTasks()
    })
  }))
)

// Helper to get task display name
export function getTaskDisplayName(task: GenerationTask): string {
  const names: Record<GenerationTask, string> = {
    brand: 'Brand Identity',
    overview: 'Business Model',
    website: 'Website Pages',
    flow: 'Business Flow',
    tools: 'Internal Tools'
  }
  return names[task]
}

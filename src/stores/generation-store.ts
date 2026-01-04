import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// Generation steps in order - extensible array
export const GENERATION_STEPS = ['plan', 'brand', 'website', 'flow', 'tools'] as const
export type GenerationTask = typeof GENERATION_STEPS[number]

export interface TaskProgress {
  task: GenerationTask
  status: 'pending' | 'running' | 'completed' | 'error'
  message: string
  error?: string
}

interface GenerationState {
  isGenerating: boolean
  prompt: string | null
  currentStep: number // Index into GENERATION_STEPS
  tasks: Record<GenerationTask, TaskProgress>

  // Actions
  startGeneration: (prompt: string) => void
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void
  completeGeneration: () => void
  reset: () => void
}

const createInitialTasks = (): Record<GenerationTask, TaskProgress> => ({
  plan: { task: 'plan', status: 'pending', message: 'Waiting...' },
  brand: { task: 'brand', status: 'pending', message: 'Waiting...' },
  website: { task: 'website', status: 'pending', message: 'Waiting...' },
  flow: { task: 'flow', status: 'pending', message: 'Waiting...' },
  tools: { task: 'tools', status: 'pending', message: 'Waiting...' },
})

export const useGenerationStore = create<GenerationState>()(
  immer((set) => ({
    isGenerating: false,
    prompt: null,
    currentStep: 0,
    tasks: createInitialTasks(),

    startGeneration: (prompt) => set((state) => {
      state.isGenerating = true
      state.prompt = prompt
      state.currentStep = 0
      state.tasks = createInitialTasks()
    }),

    updateTask: (task, updates) => set((state) => {
      Object.assign(state.tasks[task], updates)
      // Update currentStep based on which task is running
      if (updates.status === 'running') {
        state.currentStep = GENERATION_STEPS.indexOf(task)
      }
    }),

    completeGeneration: () => set({ isGenerating: false }),

    reset: () => set({
      isGenerating: false,
      prompt: null,
      currentStep: 0,
      tasks: createInitialTasks()
    })
  }))
)

// Helper to get task display name
export function getTaskDisplayName(task: GenerationTask): string {
  const names: Record<GenerationTask, string> = {
    plan: 'Business Strategy',
    brand: 'Brand Identity',
    website: 'Website',
    flow: 'Business Flow',
    tools: 'Internal Tools'
  }
  return names[task]
}

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

// Generation steps in order - extensible array
export const GENERATION_STEPS = ['plan', 'website', 'flow', 'tools'] as const
export type GenerationTask = typeof GENERATION_STEPS[number]

export interface SubTask {
  name: string
  status: 'pending' | 'running' | 'completed'
}

export interface TaskProgress {
  task: GenerationTask
  status: 'pending' | 'running' | 'completed' | 'error'
  message: string
  error?: string
  subTasks?: SubTask[]
}

interface GenerationState {
  isGenerating: boolean
  prompt: string | null
  currentStep: number // Index into GENERATION_STEPS
  tasks: Record<GenerationTask, TaskProgress>

  // Actions
  startGeneration: (prompt: string) => void
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void
  setSubTasks: (task: GenerationTask, subTasks: SubTask[]) => void
  updateSubTask: (task: GenerationTask, name: string, status: SubTask['status']) => void
  completeGeneration: () => void
  reset: () => void
}

const createInitialTasks = (): Record<GenerationTask, TaskProgress> => ({
  plan: { task: 'plan', status: 'pending', message: 'Waiting...' },
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

    setSubTasks: (task, subTasks) => set((state) => {
      state.tasks[task].subTasks = subTasks
    }),

    updateSubTask: (task, name, status) => set((state) => {
      const subTasks = state.tasks[task].subTasks
      if (subTasks) {
        const subTask = subTasks.find(st => st.name === name)
        if (subTask) {
          subTask.status = status
        }
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
    website: 'Website',
    flow: 'Business Flow',
    tools: 'Internal Tools'
  }
  return names[task]
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OpenRouterModel, DEFAULT_MODEL, OPENROUTER_MODELS } from '@/lib/ai/openrouter'

interface ModelState {
  selectedModel: OpenRouterModel
  setModel: (model: OpenRouterModel) => void
}

export const useModelStore = create<ModelState>()(
  persist(
    (set) => ({
      selectedModel: DEFAULT_MODEL,
      setModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: 'ernest-model-preference',
      // Migrate old model selections to new model IDs
      migrate: (persistedState: unknown) => {
        const state = persistedState as { selectedModel?: string }
        if (state?.selectedModel && !(state.selectedModel in OPENROUTER_MODELS)) {
          // Old model ID not valid anymore, reset to default
          return { selectedModel: DEFAULT_MODEL }
        }
        return state as ModelState
      },
      version: 1,
    }
  )
)

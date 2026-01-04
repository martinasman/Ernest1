import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OpenRouterModel, DEFAULT_MODEL } from '@/lib/ai/openrouter'

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
    }
  )
)

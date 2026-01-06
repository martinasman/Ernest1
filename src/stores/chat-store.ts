import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: any[]
  toolResults?: any[]
  status?: 'streaming' | 'complete' | 'error'
  createdAt?: Date | string
}

export interface PendingChange {
  id: string
  description: string
  changes: Array<{
    target: string
    operation: 'set' | 'update' | 'delete' | 'append'
    value?: any
    reasoning: string
  }>
  status: 'pending' | 'approved' | 'rejected' | 'applied'
}

interface ChatState {
  // Messages
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean

  // Pending changes awaiting user confirmation
  pendingChanges: PendingChange | null

  // Side panel state
  isOpen: boolean

  // Actions
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  clearMessages: () => void

  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void

  setPendingChanges: (changes: PendingChange | null) => void
  approvePendingChanges: () => void
  rejectPendingChanges: () => void

  setOpen: (open: boolean) => void
  toggle: () => void

  // Replace all messages (used for hydration/persistence)
  setMessages: (messages: Message[]) => void
}

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    pendingChanges: null,
    isOpen: true,

    addMessage: (message) => set((state) => {
      state.messages.push(message)
    }),

    updateMessage: (id, updates) => set((state) => {
      const index = state.messages.findIndex((m) => m.id === id)
      if (index !== -1) {
        Object.assign(state.messages[index], updates)
      }
    }),

    clearMessages: () => set({ messages: [] }),

    setLoading: (isLoading) => set({ isLoading }),
    setStreaming: (isStreaming) => set({ isStreaming }),

    setPendingChanges: (pendingChanges) => set({ pendingChanges }),

    approvePendingChanges: () => set((state) => {
      if (state.pendingChanges) {
        state.pendingChanges.status = 'approved'
      }
    }),

    rejectPendingChanges: () => set((state) => {
      if (state.pendingChanges) {
        state.pendingChanges.status = 'rejected'
      }
    }),

    setOpen: (isOpen) => set({ isOpen }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),

    setMessages: (messages) => set({ messages }),
  }))
)

'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUpRight, Loader2, Bot, User, MousePointer2, Plus, Lightbulb, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import { useChatStore } from '@/stores/chat-store'
import { useModelStore } from '@/stores/model-store'
import { useUIStore, type WebsiteSelection, type OverviewSelection } from '@/stores/ui-store'
import { useGenerationStore, getTaskDisplayName, GENERATION_STEPS } from '@/stores/generation-store'
import { ModelPicker } from '@/components/ui/model-picker'
import { InlineTodoList, type TodoItem } from './inline-todo-list'
import { getSectionDisplayName } from '@/lib/ai/generation/website-generator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  todos?: TodoItem[]
}

export function ChatPanel() {
  const { workspace, refetch } = useWorkspace()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { selectedModel, setModel } = useModelStore()

  // Selection state for contextual editing
  const selectedElement = useUIStore((state) => state.selectedElement)
  const clearSelection = useUIStore((state) => state.clearSelection)

  // Get generation tasks for inline todo display
  const generationTasks = useGenerationStore((state) => state.tasks)
  const isGenerating = useGenerationStore((state) => state.isGenerating)

  // Get display name for selected element
  const getEditingLabel = () => {
    if (!selectedElement) return null
    if (selectedElement.type === 'website') {
      const ws = selectedElement as WebsiteSelection
      return getSectionDisplayName(ws.sectionType as Parameters<typeof getSectionDisplayName>[0])
    }
    if (selectedElement.type === 'overview') {
      const os = selectedElement as OverviewSelection
      return os.fieldLabel
    }
    return null
  }

  // Get messages from the chat store (used by business generator)
  const storeMessages = useChatStore((state) => state.messages)

  // Combine store messages and local messages for display
  const allMessages: Message[] = [
    ...storeMessages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    ...localMessages,
  ]

  // Convert generation tasks to todo items
  const currentTodos: TodoItem[] = GENERATION_STEPS.map((taskKey) => {
    const task = generationTasks[taskKey]
    return {
      content: getTaskDisplayName(taskKey),
      status: task.status === 'running' ? 'in_progress' : task.status === 'completed' ? 'completed' : 'pending',
    }
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [allMessages, currentTodos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !workspace?.id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setLocalMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Check if we're editing a website section
      if (selectedElement?.type === 'website') {
        const ws = selectedElement as WebsiteSelection
        const editingLabel = getEditingLabel()

        // Call the edit-section API
        const response = await fetch('/api/ai/edit-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: workspace.id,
            pageSlug: ws.pageSlug,
            sectionIndex: ws.sectionIndex,
            prompt: input.trim(),
            model: selectedModel,
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update section')
        }

        // Add success message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Updated the ${editingLabel}. The changes have been applied.`
        }
        setLocalMessages(prev => [...prev, assistantMessage])

        // Refetch workspace to get updated data
        refetch()

        // Clear selection after successful edit
        clearSelection()
        return
      }

      // Check if we're editing an overview field
      if (selectedElement?.type === 'overview') {
        const os = selectedElement as OverviewSelection
        const editingLabel = getEditingLabel()

        // Call the edit-overview API
        const response = await fetch('/api/ai/edit-overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: workspace.id,
            field: os.field,
            prompt: input.trim(),
            model: selectedModel,
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update field')
        }

        // Add success message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Updated ${editingLabel}. The changes have been applied.`
        }
        setLocalMessages(prev => [...prev, assistantMessage])

        // Refetch workspace to get updated data
        refetch()

        // Clear selection after successful edit
        clearSelection()
        return
      }

      // Regular chat flow
      const requestBody: Record<string, unknown> = {
        messages: [...localMessages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        workspaceId: workspace.id,
        model: selectedModel
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ''
      }
      setLocalMessages(prev => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          assistantContent += chunk
          setLocalMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: assistantContent }
                : m
            )
          )
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const setSuggestion = (text: string) => {
    setInput(text)
  }

  return (
    <div className="flex flex-col h-full bg-[#1c1c1c]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {allMessages.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-[#c8ff00]" />
            </div>
            <h4 className="font-medium text-gray-200 mb-2">How can ernest help you today?</h4>
            <p className="text-sm text-gray-500 mb-6">
              Describe what you want to build and I&apos;ll help you create it.
            </p>
            <div className="grid gap-2 w-full max-w-xs">
              <SuggestionButton onClick={() => setSuggestion('Build me an online store')}>
                Build me an online store
              </SuggestionButton>
              <SuggestionButton onClick={() => setSuggestion('Create a portfolio website')}>
                Create a portfolio website
              </SuggestionButton>
              <SuggestionButton onClick={() => setSuggestion('Help me plan my business')}>
                Help me plan my business
              </SuggestionButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {allMessages.map((message) => (
              <div key={message.id}>
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-[#2a2a2a] rounded-xl px-5 py-3 max-w-[85%]">
                      <p className="text-sm text-gray-200 font-serif">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-base text-gray-300 leading-relaxed">
                      <MessageContent content={message.content} />
                    </p>
                    {message.todos && message.todos.length > 0 && (
                      <InlineTodoList items={message.todos} />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Show inline todos when generating */}
            {isGenerating && currentTodos.length > 0 && (
              <div className="space-y-1">
                <InlineTodoList items={currentTodos} />
              </div>
            )}

            {isLoading && allMessages[allMessages.length - 1]?.role === 'user' && !isGenerating && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/30 text-red-400 text-sm mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4">
        {/* Editing Context Badge */}
        {selectedElement && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
              <Pencil className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">
                Editing: {getEditingLabel()}
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-1 p-0.5 hover:bg-blue-500/20 rounded-full transition-colors"
              >
                <X className="w-3 h-3 text-blue-400" />
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
          <div className="bg-[#2a2a2a] rounded-lg px-4 py-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can ernest help you today?"
              className="w-full bg-transparent text-gray-200 placeholder-gray-400 text-base resize-none focus:outline-none min-h-[60px] max-h-40 font-serif"
              rows={2}
              disabled={!workspace?.id || isLoading}
            />
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-2 rounded-full bg-[#3a3a3a] hover:bg-[#444] text-gray-400 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <ModelPicker
                  value={selectedModel}
                  onChange={setModel}
                  variant="compact"
                />
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg hover:bg-[#3a3a3a] text-gray-400 text-xs transition-colors flex items-center gap-1.5"
                >
                  <MousePointer2 className="w-3.5 h-3.5" />
                  Select
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-lg hover:bg-[#3a3a3a] text-gray-400 text-xs transition-colors flex items-center gap-1.5"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Plan
                </button>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim() || !workspace?.id}
                className="w-8 h-8 aspect-square rounded-full flex items-center justify-center bg-[#c8ff00] text-gray-900 hover:bg-[#b8ef00] transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function SuggestionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-sm px-4 py-3 rounded-xl bg-[#2a2a2a] text-gray-300 hover:bg-[#333] transition-colors border border-[#3a3a3a]"
    >
      {children}
    </button>
  )
}

function MessageContent({ content }: { content: string }) {
  if (!content) return null

  const parts = content.split(/(\*\*.*?\*\*|\n)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-gray-200">{part.slice(2, -2)}</strong>
        }
        if (part === '\n') {
          return <br key={i} />
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

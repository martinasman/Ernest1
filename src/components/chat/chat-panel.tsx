'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUpRight, Loader2, Bot, User, MousePointer2, Plus, Lightbulb, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'
import { useChatStore } from '@/stores/chat-store'
import { useModelStore } from '@/stores/model-store'
import { useUIStore, type WebsiteSelection, type OverviewSelection, type RestoreVersionCallback } from '@/stores/ui-store'
import { useGenerationStore, getTaskDisplayName, GENERATION_STEPS } from '@/stores/generation-store'
import { ModelPicker } from '@/components/ui/model-picker'
import { InlineTodoList, type TodoItem } from './inline-todo-list'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  todos?: TodoItem[]
  createdAt?: string
}

// Parse streaming response content - handles plain text, NDJSON, or JSON array
function parseStreamContent(rawContent: string): string {
  if (!rawContent) return ''

  const trimmed = rawContent.trim()

  // Plain text check FIRST - if it doesn't look like JSON, return immediately
  // This is the common case with compatibility: 'strict'
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return rawContent
  }

  // Try to parse as JSON array (non-streaming response format)
  try {
    const arr = JSON.parse(rawContent)
    if (Array.isArray(arr)) {
      const extracted = arr
        .filter((p: any) => (p.type === 'text' || p.type === 'text-delta') && p.text)
        .map((p: any) => p.text)
        .join('')
      if (extracted) return extracted
    }
  } catch {
    // Not a complete JSON array - try NDJSON or fallback parsing
  }

  // Try to parse as NDJSON (newline-delimited JSON)
  const lines = rawContent.split('\n').filter(Boolean)
  let extracted = ''

  for (const line of lines) {
    try {
      const part = JSON.parse(line)
      if ((part.type === 'text-delta' || part.type === 'text') && part.text) {
        extracted += part.text
      }
    } catch {
      // Not valid JSON - continue to next line
    }
  }

  if (extracted) return extracted

  // Fallback: try regex extraction from JSON-like content
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const textMatches = rawContent.match(/"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)
    if (textMatches && textMatches.length > 0) {
      const textValues = textMatches.map(match => {
        const jsonMatch = match.match(/"text"\s*:\s*"(.*)"$/)
        if (jsonMatch) {
          return jsonMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n')
        }
        return ''
      }).filter(t => t.trim().length > 0)

      if (textValues.length > 0) return textValues.join('')
    }
  }

  // Last resort: return empty to avoid showing raw JSON
  return ''
}

// Timeout for stream reading to prevent infinite hangs
const STREAM_TIMEOUT = 60000 // 60 seconds

// Read from stream with timeout protection
async function readStreamWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number
): Promise<ReadableStreamReadResult<Uint8Array>> {
  return Promise.race([
    reader.read(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Response timeout - please try again')), timeoutMs)
    ),
  ])
}

export function ChatPanel() {
  const { workspace, refetch } = useWorkspace()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorSource, setErrorSource] = useState<'chat' | 'preview' | null>(null)
  const [lastErrorDetails, setLastErrorDetails] = useState<string | null>(null)
  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null)
  const { selectedModel, setModel } = useModelStore()

  // Selection state for contextual editing
  const selectedElement = useUIStore((state) => state.selectedElement)
  const clearSelection = useUIStore((state) => state.clearSelection)
  const setIsEditing = useUIStore((state) => state.setIsEditing)
  const setRestoreVersionCallback = useUIStore((state) => state.setRestoreVersionCallback)
  const workingStatus = useUIStore((state) => state.workingStatus)
  const setWorkingStatus = useUIStore((state) => state.setWorkingStatus)

  // Select mode state
  const isSelectMode = useUIStore((state) => state.isSelectMode)
  const toggleSelectMode = useUIStore((state) => state.toggleSelectMode)

  // Get generation tasks for inline todo display
  const generationTasks = useGenerationStore((state) => state.tasks)
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const aiContext = workspace?.ai_context as Record<string, unknown> | undefined
  const generatedFiles = (aiContext?.generated_files || aiContext?.websiteFiles) as Record<string, string> | undefined
  const canEditCode = !!(generatedFiles && Object.keys(generatedFiles).length > 0)

  const isEditIntent = (text: string) => {
    const lower = text.toLowerCase().trim()
    // Must start with an action verb to trigger code editing
    // This prevents casual mentions of "color", "text" etc from triggering edits
    const actionPrefixes = [
      'make ', 'change ', 'update ', 'add ', 'remove ', 'edit ', 'fix ',
      'set ', 'replace ', 'delete ', 'modify ', 'adjust ', 'increase ', 'decrease ',
    ]
    const hasActionPrefix = actionPrefixes.some(p => lower.startsWith(p))
    // Also trigger if user has explicitly selected an element
    return hasActionPrefix || !!selectedElement
  }

  // Get display name for selected element
  const getEditingLabel = () => {
    if (!selectedElement) return null
    if (selectedElement.type === 'website') {
      const ws = selectedElement as WebsiteSelection
      // Format section type as readable label (e.g., 'hero-section' -> 'Hero Section')
      return ws.sectionType
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
    if (selectedElement.type === 'overview') {
      const os = selectedElement as OverviewSelection
      return os.fieldLabel
    }
    return null
  }

  // Get messages from the chat store (used by business generator)
  const storeMessages = useChatStore((state) => state.messages)
  const setStoreMessages = useChatStore((state) => state.setMessages)

  // Plan Mode state
  const isPlanMode = useChatStore((state) => state.isPlanMode)
  const setPlanMode = useChatStore((state) => state.setPlanMode)
  const currentPlanMessageId = useChatStore((state) => state.currentPlanMessageId)
  const currentPlanContent = useChatStore((state) => state.currentPlanContent)
  const setCurrentPlan = useChatStore((state) => state.setCurrentPlan)
  const clearPlanMode = useChatStore((state) => state.clearPlanMode)

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

  // Register version restore callback
  useEffect(() => {
    const handleRestoreVersion: RestoreVersionCallback = async (files, timestamp) => {
      if (!workspace?.id) return

      try {
        // Call restore API
        const res = await fetch('/api/versions/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: workspace.id,
            files,
          }),
        })

        if (res.ok) {
          // Add confirmation message to chat
          const restoreMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `I've restored your website to the version from ${timestamp}. The preview has been updated with the previous files.`,
            createdAt: new Date().toISOString(),
          }
          setLocalMessages(prev => [...prev, restoreMessage])

          // Refresh workspace data
          refetch()
        }
      } catch (error) {
        console.error('Failed to restore version:', error)
      }
    }

    setRestoreVersionCallback(handleRestoreVersion)

    return () => {
      setRestoreVersionCallback(null)
    }
  }, [workspace?.id, refetch, setRestoreVersionCallback])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !workspace?.id) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    }

    setLocalMessages(prev => [...prev, userMessage])
    setLastUserPrompt(input.trim())
    setInput('')
    setIsLoading(true)
    setWorkingStatus('Thinking...')
    if (errorSource === 'chat') {
      setError(null)
      setLastErrorDetails(null)
      setErrorSource(null)
    }

    // If in plan mode and there's an existing plan, clear it so the new response becomes the plan
    // This enables plan refinement through follow-up messages
    if (isPlanMode && currentPlanContent) {
      setCurrentPlan(null, null)
    }

    try {
      // Check if we're editing an overview field
      if (selectedElement?.type === 'overview') {
        const os = selectedElement as OverviewSelection
        const editingLabel = getEditingLabel()
        setIsEditing(true)
        setWorkingStatus(`Analyzing ${editingLabel}...`)

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
          let message = 'Failed to update field'
          try {
            const errJson = await response.json()
            message = errJson.error || message
          } catch {
            const txt = await response.text()
            message = txt || message
          }
          throw new Error(message)
        }

        // Add success message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Updated ${editingLabel}. The changes have been applied.`,
          createdAt: new Date().toISOString(),
        }
        setLocalMessages(prev => [...prev, assistantMessage])

        // Refetch workspace to get updated data
        refetch()

        // Clear selection after successful edit
        clearSelection()
        return
      }

      // Code editing flow (post-generation)
      if (canEditCode && !isGenerating && isEditIntent(input.trim())) {
        setIsEditing(true)
        const selectedFile =
          selectedElement && selectedElement.type === 'website'
            ? `src/pages/${selectedElement.pageSlug}.tsx`
            : undefined

        setWorkingStatus('Reading files...')
        const response = await fetch('/api/ai/edit-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: workspace.id,
            prompt: input.trim(),
            model: selectedModel,
            context: selectedFile ? { selectedFile } : undefined,
          })
        })

        let result: any
        try {
          result = await response.json()
        } catch {
          const text = await response.text()
          throw new Error(text || 'Invalid response from edit-code')
        }
        if (!response.ok) {
          throw new Error(result.error || 'Failed to edit code')
        }

        setWorkingStatus('Applying changes...')

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.summary || 'Updated your site.',
          createdAt: new Date().toISOString(),
        }
        setLocalMessages(prev => [...prev, assistantMessage])

        // Refresh workspace to pull updated files/context
        refetch()
        return
      }

      // Regular chat flow
      const requestBody: Record<string, unknown> = {
        messages: [...storeMessages, ...localMessages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        })),
        workspaceId: workspace.id,
        model: selectedModel,
        isPlanMode: isPlanMode
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        let message = 'Failed to get response'
        try {
          const txt = await response.text()
          if (txt) message = txt
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }
      setLocalMessages(prev => [...prev, assistantMessage])

      if (!reader) {
        throw new Error('No response stream received')
      }

      let rawContent = ''

      while (true) {
        const { done, value } = await readStreamWithTimeout(reader, STREAM_TIMEOUT)
        if (done) break

        const chunk = decoder.decode(value)
        rawContent += chunk

        // Parse streaming response - handle NDJSON, JSON array, or plain text
        assistantContent = parseStreamContent(rawContent)
        setLocalMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: assistantContent }
              : m
          )
        )
      }

      if (!assistantContent.trim()) {
        setLocalMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: 'I didn\'t get a response. Please try again.' }
              : m
          )
        )
      }

      // Track plan content when in plan mode
      if (isPlanMode && assistantContent.trim()) {
        setCurrentPlan(assistantMessage.id, assistantContent)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setLastErrorDetails(message)
      setErrorSource('chat')
    } finally {
      setIsEditing(false)
      setIsLoading(false)
      setWorkingStatus(null)
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

  // Handle executing an approved plan
  const handleExecutePlan = async () => {
    const planContent = useChatStore.getState().currentPlanContent
    if (!planContent || !workspace?.id) return

    // Exit plan mode
    clearPlanMode()

    // Create execution prompt that references the plan
    const executionPrompt = `Execute the following plan that was created:

${planContent}

Please proceed with implementing this plan step by step. Execute all the actions described.`

    // Create user message showing intent
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: 'Go ahead with the plan',
      createdAt: new Date().toISOString(),
    }

    setLocalMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setWorkingStatus('Executing plan...')

    try {
      // Call API without plan mode - let AI execute normally
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...storeMessages.map(m => ({ role: m.role, content: m.content })),
            ...localMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: executionPrompt }
          ],
          workspaceId: workspace.id,
          model: selectedModel,
          isPlanMode: false, // Execute mode, not plan mode
        })
      })

      if (!response.ok) {
        const txt = await response.text()
        throw new Error(txt || 'Failed to execute plan')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream received')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }
      setLocalMessages(prev => [...prev, assistantMessage])

      let rawContent = ''

      while (true) {
        const { done, value } = await readStreamWithTimeout(reader, STREAM_TIMEOUT)
        if (done) break
        const chunk = decoder.decode(value)
        rawContent += chunk
        assistantContent = parseStreamContent(rawContent)
        setLocalMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: assistantContent }
              : m
          )
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setLastErrorDetails(message)
      setErrorSource('chat')
    } finally {
      setIsLoading(false)
      setWorkingStatus(null)
    }
  }

  // Capture preview runtime errors coming from the iframe and surface them in chat
  useEffect(() => {
    const handlePreviewError = async (event: MessageEvent) => {
      const data = event.data as Record<string, unknown> | null
      if (!data || typeof data !== 'object') return
      if ((data as any).source !== 'ernest-preview') return

      const messageType = (data as any).type

      const rawMessage = typeof data.message === 'string' ? data.message : 'Preview error'
      const stack = typeof (data as any).stack === 'string' ? (data as any).stack : ''
      const url = typeof (data as any).url === 'string' ? (data as any).url : ''

      const details = [rawMessage, stack, url ? `Preview URL: ${url}` : '']
        .filter(Boolean)
        .join('\n')
        .slice(0, 1200)

      setError(`Preview error detected: ${rawMessage.slice(0, 300)}`)
      setLastErrorDetails(details)
      setErrorSource('preview')

      // If this is a fix request from the overlay button, auto-trigger fix after a brief delay
      // so error state is fully set
      if (messageType === 'error-fix-request') {
        setTimeout(() => {
          setInput('')
          setIsLoading(false)
          // Will be triggered by the next effect that watches lastErrorDetails
        }, 100)
      }
    }

    window.addEventListener('message', handlePreviewError)
    return () => window.removeEventListener('message', handlePreviewError)
  }, [])

  // Hydrate chat from database first, then localStorage as fallback
  useEffect(() => {
    if (!workspace?.id) return

    let isCancelled = false

    const loadMessages = async () => {
      const key = `ernest-chat-${workspace.id}`
      try {
        // Load from database first (source of truth)
        const response = await fetch(`/api/messages?workspaceId=${workspace.id}`)
        if (!response.ok) throw new Error('Failed to load from database')

        const { messages: dbMessages } = await response.json()

        if (isCancelled) return

        if (dbMessages && dbMessages.length > 0) {
          // Database has messages - use them
          const normalized = dbMessages.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: m.created_at
          }))
          setStoreMessages(normalized)
          setLocalMessages([])

          // Cache to localStorage for faster subsequent loads
          try {
            window.localStorage.setItem(key, JSON.stringify(normalized))
          } catch (err) {
            console.warn('Failed to cache to localStorage', err)
          }
        } else {
          // No database messages - try localStorage as fallback
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as Array<Message & { createdAt?: string }>
              const normalized = parsed.map((m) => ({
                ...m,
                createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
              }))
              setStoreMessages(normalized as any)
              setLocalMessages([])
            } catch (err) {
              console.error('Failed to parse localStorage', err)
              setStoreMessages([])
              setLocalMessages([])
              window.localStorage.removeItem(key)
            }
          } else {
            setStoreMessages([])
            setLocalMessages([])
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
        // Fallback to localStorage on database error
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            setStoreMessages(parsed)
            setLocalMessages([])
          } catch {
            setStoreMessages([])
            setLocalMessages([])
          }
        } else {
          setStoreMessages([])
          setLocalMessages([])
        }
      }
    }

    loadMessages()

    return () => {
      isCancelled = true
    }
  }, [workspace?.id, setStoreMessages])

  // Persist chat history per workspace
  useEffect(() => {
    if (!workspace?.id) return
    const key = `ernest-chat-${workspace.id}`
    try {
      const payload = allMessages.map((m) => ({
        ...m,
        createdAt: m.createdAt || new Date().toISOString(),
      }))
      window.localStorage.setItem(key, JSON.stringify(payload))
    } catch (err) {
      console.error('Failed to save chat history', err)
    }
  }, [allMessages, workspace?.id])

  const handleFixError = async () => {
    if (!workspace?.id || !lastErrorDetails || isLoading) return

    setIsLoading(true)
    setWorkingStatus('Fixing error...')
    setError(null)
    setErrorSource(null)

    const contextNote = errorSource === 'preview'
      ? 'The live preview reported a runtime error while loading the generated code.'
      : 'The last request failed.'

    const recoveryMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `${contextNote}\n\nError details:\n${lastErrorDetails || 'No details provided.'}\n\nOriginal prompt: "${lastUserPrompt || ''}"`,
      createdAt: new Date().toISOString(),
    }
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'Working on a fix...',
      createdAt: new Date().toISOString(),
    }

    const outboundMessages = [
      ...storeMessages.map((m) => ({ role: m.role, content: m.content })),
      ...localMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: recoveryMessage.content },
    ]

    // Show the recovery attempt immediately
    setLocalMessages(prev => [...prev, recoveryMessage, assistantMessage])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: outboundMessages,
          workspaceId: workspace.id,
          model: selectedModel,
        }),
      })

      if (!response.ok) {
        const txt = await response.text()
        throw new Error(txt || 'Failed to get recovery response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream received')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''

      let rawContent = ''

      while (true) {
        const { done, value } = await readStreamWithTimeout(reader, STREAM_TIMEOUT)
        if (done) break
        const chunk = decoder.decode(value)
        rawContent += chunk
        assistantContent = parseStreamContent(rawContent)
        setLocalMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: assistantContent }
              : m
          )
        )
      }
      setLastErrorDetails(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setLastErrorDetails(message)
      setErrorSource('chat')
      setLocalMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: `Fix attempt failed: ${message}` }
            : m
        )
      )
    } finally {
      setIsEditing(false)
      setIsLoading(false)
      setWorkingStatus(null)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#1c1c1c]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 chat-scroll" ref={scrollRef}>
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
                      <p className="text-sm text-gray-200 font-serif break-words whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300 leading-relaxed break-words whitespace-pre-wrap max-w-full">
                      <MessageContent content={message.content} />
                    </p>
                    {message.todos && message.todos.length > 0 && (
                      <InlineTodoList items={message.todos} />
                    )}
                    {/* Go with Plan Button - only show on current plan message */}
                    {isPlanMode && message.id === currentPlanMessageId && !isLoading && (
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          type="button"
                          onClick={handleExecutePlan}
                          className="px-4 py-2 rounded-lg bg-[#c8ff00] text-gray-900 text-sm font-medium hover:bg-[#b8ef00] transition-colors flex items-center gap-2"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          Go with plan
                        </button>
                        <button
                          type="button"
                          onClick={() => clearPlanMode()}
                          className="px-4 py-2 rounded-lg bg-[#3a3a3a] text-gray-300 text-sm hover:bg-[#444] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
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

            {workingStatus && (
              <div className="space-y-1">
                <p className="text-base leading-relaxed break-words whitespace-pre-wrap max-w-full">
                  <span className="shimmer-status">{workingStatus}</span>
                </p>
              </div>
            )}
          </div>
        )}

      {error && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-900/30 text-red-400 text-sm mt-4 space-y-2">
          <div>{error}</div>
          {lastErrorDetails && (
            <pre className="text-xs text-red-200 whitespace-pre-wrap break-words bg-red-950/30 border border-red-900/40 rounded px-3 py-2">
              {lastErrorDetails}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleFixError}
              disabled={!lastErrorDetails || isLoading || !workspace?.id}
              className="px-3 py-1.5 text-xs rounded-md bg-red-500/20 border border-red-500/40 text-red-100 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Try to fix error
            </button>
          </div>
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
                  onClick={toggleSelectMode}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5",
                    isSelectMode
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "hover:bg-[#3a3a3a] text-gray-400"
                  )}
                >
                  <MousePointer2 className={cn("w-3.5 h-3.5", isSelectMode && "animate-pulse")} />
                  Select
                </button>
                <button
                  type="button"
                  onClick={() => setPlanMode(!isPlanMode)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5",
                    isPlanMode
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "hover:bg-[#3a3a3a] text-gray-400"
                  )}
                >
                  <Lightbulb className={cn("w-3.5 h-3.5", isPlanMode && "fill-amber-400")} />
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

  // Safety: handle raw JSON that may have been saved to database incorrectly
  let cleanContent = content
  if (content.trim().startsWith('[') && content.includes('"type":"text"')) {
    try {
      const arr = JSON.parse(content)
      if (Array.isArray(arr)) {
        cleanContent = arr
          .filter((p: any) => p.type === 'text' && p.text)
          .map((p: any) => p.text)
          .join('')
      }
    } catch {
      // If parsing fails, use original content
    }
  }

  const parts = cleanContent.split(/(\*\*.*?\*\*|\n)/g)

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

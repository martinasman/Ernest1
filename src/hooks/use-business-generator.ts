'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { useChatStore } from '@/stores/chat-store'
import { useGenerationStore, GENERATION_STEPS, GenerationTask, TaskProgress, SubTask, getTaskDisplayName } from '@/stores/generation-store'
import { useModelStore } from '@/stores/model-store'

// Endpoints for each generation task
const TASK_ENDPOINTS: Record<GenerationTask, string> = {
  plan: '/api/ai/generate/plan',
  website: '/api/ai/generate/website',
  flow: '/api/ai/generate/flow',
  tools: '/api/ai/generate/tools',
}

// Messages shown during each task
const TASK_MESSAGES: Record<GenerationTask, { running: string; completed: string }> = {
  plan: { running: 'Understanding your business...', completed: 'Business strategy ready' },
  website: { running: 'Building website pages...', completed: 'Website pages ready' },
  flow: { running: 'Mapping business flow...', completed: 'Business flow mapped' },
  tools: { running: 'Suggesting internal tools...', completed: 'Tools suggested' },
}

// Run a single generation task
async function runTask(
  task: GenerationTask,
  prompt: string,
  workspaceId: string,
  model: string,
  plan: unknown,
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void,
  setSubTasks?: (task: GenerationTask, subTasks: SubTask[]) => void,
  updateSubTask?: (task: GenerationTask, name: string, status: SubTask['status']) => void
): Promise<unknown> {
  updateTask(task, { status: 'running', message: TASK_MESSAGES[task].running })

  try {
    // Website task uses streaming SSE response
    if (task === 'website' && setSubTasks && updateSubTask) {
      return await runWebsiteTaskWithStreaming(
        prompt, workspaceId, model, plan, updateTask, setSubTasks, updateSubTask
      )
    }

    // Regular JSON response for other tasks
    const response = await fetch(TASK_ENDPOINTS[task], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, workspaceId, model, plan }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Generation failed')
    }

    const result = await response.json()
    updateTask(task, { status: 'completed', message: TASK_MESSAGES[task].completed })

    // Return the plan for subsequent tasks
    if (task === 'plan') {
      return result.plan
    }
    return result
  } catch (error) {
    updateTask(task, {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed',
    })
    throw error
  }
}

// Run website task with SSE streaming for page progress
async function runWebsiteTaskWithStreaming(
  prompt: string,
  workspaceId: string,
  model: string,
  plan: unknown,
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void,
  setSubTasks: (task: GenerationTask, subTasks: SubTask[]) => void,
  updateSubTask: (task: GenerationTask, name: string, status: SubTask['status']) => void
): Promise<unknown> {
  const response = await fetch(TASK_ENDPOINTS.website, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, workspaceId, model, plan }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Generation failed')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''
  const subTasksMap = new Map<string, SubTask['status']>()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer

    let eventType = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7)
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))

        if (eventType === 'progress') {
          const { type, name, current, total } = data

          if (type === 'page_start') {
            // Update the message to show current page
            updateTask('website', { message: `Creating ${name}...` })

            // Add/update subtask
            subTasksMap.set(name, 'running')
            updateSubTasksFromMap(setSubTasks, subTasksMap)
          } else if (type === 'page_done') {
            // Mark subtask as complete
            subTasksMap.set(name, 'completed')
            updateSubTasksFromMap(setSubTasks, subTasksMap)

            // Update message with progress
            updateTask('website', {
              message: `Created ${name} (${current}/${total})`,
            })
          } else if (type === 'file_start') {
            updateTask('website', { message: `Creating ${name}...` })
            subTasksMap.set(name, 'running')
            updateSubTasksFromMap(setSubTasks, subTasksMap)
          } else if (type === 'file_done') {
            subTasksMap.set(name, 'completed')
            updateSubTasksFromMap(setSubTasks, subTasksMap)
          }
        } else if (eventType === 'complete') {
          updateTask('website', {
            status: 'completed',
            message: TASK_MESSAGES.website.completed,
          })
          return data
        } else if (eventType === 'error') {
          throw new Error(data.message || 'Website generation failed')
        }
      }
    }
  }

  return null
}

// Helper to convert map to subtasks array
function updateSubTasksFromMap(
  setSubTasks: (task: GenerationTask, subTasks: SubTask[]) => void,
  map: Map<string, SubTask['status']>
) {
  const subTasks: SubTask[] = Array.from(map.entries()).map(([name, status]) => ({
    name,
    status,
  }))
  setSubTasks('website', subTasks)
}

export function useBusinessGenerator() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { workspace, refetch } = useWorkspace()
  const { setOpen, addMessage, updateMessage } = useChatStore()
  const { isGenerating, startGeneration, updateTask, setSubTasks, updateSubTask, completeGeneration } = useGenerationStore()
  const { selectedModel } = useModelStore()

  const promptProcessed = useRef(false)
  const prompt = searchParams.get('prompt')

  const runGeneration = useCallback(async (promptText: string, workspaceId: string, model: string) => {
    // Open chat panel and clear old messages
    setOpen(true)
    useChatStore.getState().clearMessages()

    // Add initial AI message
    const messageId = Date.now().toString()
    addMessage({
      id: messageId,
      role: 'assistant',
      content: `Building your business: "${promptText}"`,
      status: 'streaming',
      createdAt: new Date(),
    })

    startGeneration(promptText)

    // Update message with progress periodically
    const progressInterval = setInterval(() => {
      const state = useGenerationStore.getState()
      const currentTask = GENERATION_STEPS[state.currentStep]
      const currentTaskInfo = state.tasks[currentTask]

      // Show only the current task that's running
      let statusText = ''
      if (currentTaskInfo.status === 'running') {
        statusText = `⏳ ${getTaskDisplayName(currentTask)}: ${currentTaskInfo.message}`
      } else if (currentTaskInfo.status === 'completed') {
        // Show completed count
        const completedCount = GENERATION_STEPS.filter(t => state.tasks[t].status === 'completed').length
        statusText = `✓ ${completedCount}/${GENERATION_STEPS.length} complete`
      }

      updateMessage(messageId, {
        content: `Building your business: "${promptText}"\n\n${statusText}`,
      })
    }, 500)

    let plan: unknown = null
    let errorCount = 0

    try {
      // Run tasks SEQUENTIALLY - one at a time
      for (const task of GENERATION_STEPS) {
        try {
          const result = await runTask(
            task, promptText, workspaceId, model, plan, updateTask, setSubTasks, updateSubTask
          )
          if (task === 'plan') {
            plan = result
          }
        } catch {
          errorCount++
          // Continue to next task even if one fails
        }
      }
    } finally {
      clearInterval(progressInterval)
      completeGeneration()

      // Refetch workspace to get updated data
      refetch()

      // Check final status
      const finalState = useGenerationStore.getState()
      const completedCount = GENERATION_STEPS.filter(t => finalState.tasks[t].status === 'completed').length
      const totalTasks = GENERATION_STEPS.length

      // Final message
      if (errorCount === 0) {
        updateMessage(messageId, {
          content: `✨ **Your business is ready!**\n\nI've generated:\n- Business Strategy\n- Website Pages\n- Business Flow\n- Tool Suggestions\n\nExplore the sidebar to see everything!`,
          status: 'complete',
        })
      } else {
        updateMessage(messageId, {
          content: `⚠️ **Partially complete** (${completedCount}/${totalTasks} succeeded)\n\nSome components failed:\n${GENERATION_STEPS
            .filter(t => finalState.tasks[t].status === 'error')
            .map(t => `- ${getTaskDisplayName(t)}: ${finalState.tasks[t].message}`)
            .join('\n')}`,
          status: 'complete',
        })
      }

      // Clean up URL (remove prompt param)
      const newUrl = pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [setOpen, addMessage, startGeneration, updateTask, setSubTasks, updateSubTask, completeGeneration, updateMessage, router, pathname, refetch])

  useEffect(() => {
    if (prompt && workspace?.id && !promptProcessed.current && !isGenerating) {
      promptProcessed.current = true
      runGeneration(prompt, workspace.id, selectedModel)
    }
  }, [prompt, workspace?.id, isGenerating, runGeneration, selectedModel])

  return { isGenerating, prompt }
}

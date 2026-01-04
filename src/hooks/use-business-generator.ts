'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { useChatStore } from '@/stores/chat-store'
import { useGenerationStore, GENERATION_STEPS, GenerationTask, TaskProgress, getTaskDisplayName } from '@/stores/generation-store'
import { useModelStore } from '@/stores/model-store'

// Endpoints for each generation task
const TASK_ENDPOINTS: Record<GenerationTask, string> = {
  plan: '/api/ai/generate/plan',
  brand: '/api/ai/generate/brand',
  website: '/api/ai/generate/website',
  flow: '/api/ai/generate/flow',
  tools: '/api/ai/generate/tools',
}

// Messages shown during each task
const TASK_MESSAGES: Record<GenerationTask, { running: string; completed: string }> = {
  plan: { running: 'Understanding your business...', completed: 'Business strategy ready' },
  brand: { running: 'Creating brand identity...', completed: 'Brand identity complete' },
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
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void
): Promise<unknown> {
  updateTask(task, { status: 'running', message: TASK_MESSAGES[task].running })

  try {
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

export function useBusinessGenerator() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { workspace, refetch } = useWorkspace()
  const { setOpen, addMessage, updateMessage } = useChatStore()
  const { isGenerating, startGeneration, updateTask, completeGeneration } = useGenerationStore()
  const { selectedModel } = useModelStore()

  const promptProcessed = useRef(false)
  const prompt = searchParams.get('prompt')

  const runGeneration = useCallback(async (promptText: string, workspaceId: string, model: string) => {
    // Open chat panel
    setOpen(true)

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
          const result = await runTask(task, promptText, workspaceId, model, plan, updateTask)
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
          content: `✨ **Your business is ready!**\n\nI've generated:\n- Business Strategy\n- Brand Identity\n- Website Pages\n- Business Flow\n- Tool Suggestions\n\nExplore the sidebar to see everything!`,
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
  }, [setOpen, addMessage, startGeneration, updateTask, completeGeneration, updateMessage, router, pathname, refetch])

  useEffect(() => {
    if (prompt && workspace?.id && !promptProcessed.current && !isGenerating) {
      promptProcessed.current = true
      runGeneration(prompt, workspace.id, selectedModel)
    }
  }, [prompt, workspace?.id, isGenerating, runGeneration, selectedModel])

  return { isGenerating, prompt }
}

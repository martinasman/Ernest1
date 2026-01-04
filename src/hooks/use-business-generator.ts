'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { useChatStore } from '@/stores/chat-store'
import { useGenerationStore, GenerationTask, TaskProgress, getTaskDisplayName } from '@/stores/generation-store'

async function runGenerationTask(
  task: GenerationTask,
  prompt: string,
  workspaceId: string,
  updateTask: (task: GenerationTask, updates: Partial<TaskProgress>) => void
): Promise<void> {
  const endpoints: Record<GenerationTask, string> = {
    brand: '/api/ai/generate/brand',
    overview: '/api/ai/generate/overview',
    website: '/api/ai/generate/website',
    flow: '/api/ai/generate/flow',
    tools: '/api/ai/generate/tools',
  }

  updateTask(task, { status: 'running', message: 'Generating...' })

  try {
    const response = await fetch(endpoints[task], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, workspaceId }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Generation failed')
    }

    updateTask(task, { status: 'completed', message: 'Complete' })
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
  const { workspace } = useWorkspace()
  const { setOpen, addMessage, updateMessage } = useChatStore()
  const { isGenerating, startGeneration, updateTask, completeGeneration } = useGenerationStore()

  const promptProcessed = useRef(false)
  const prompt = searchParams.get('prompt')

  const runGeneration = useCallback(async (promptText: string, workspaceId: string) => {
    // Open chat panel
    setOpen(true)

    // Add initial AI message
    const messageId = Date.now().toString()
    addMessage({
      id: messageId,
      role: 'assistant',
      content: `Building your business: "${promptText}"\n\nGenerating all components in parallel...`,
      status: 'streaming',
      createdAt: new Date(),
    })

    startGeneration(promptText)

    // Define all tasks
    const tasks: GenerationTask[] = ['brand', 'overview', 'website', 'flow', 'tools']

    // Update message with progress periodically
    const progressInterval = setInterval(() => {
      const state = useGenerationStore.getState()
      const progressLines = Object.values(state.tasks).map((t) => {
        const icon = t.status === 'completed' ? '✓' :
          t.status === 'running' ? '⏳' :
          t.status === 'error' ? '✗' : '○'
        return `${icon} **${getTaskDisplayName(t.task)}**: ${t.message}`
      })

      updateMessage(messageId, {
        content: `Building your business: "${promptText}"\n\n${progressLines.join('\n')}`,
      })
    }, 500)

    try {
      // Run all tasks in parallel
      await Promise.allSettled(
        tasks.map((task) =>
          runGenerationTask(task, promptText, workspaceId, updateTask)
        )
      )
    } finally {
      clearInterval(progressInterval)
      completeGeneration()

      // Check final status
      const finalState = useGenerationStore.getState()
      const completedCount = Object.values(finalState.tasks).filter(
        (t) => t.status === 'completed'
      ).length
      const errorCount = Object.values(finalState.tasks).filter(
        (t) => t.status === 'error'
      ).length

      // Final message
      if (errorCount === 0) {
        updateMessage(messageId, {
          content: `✨ **Your business is ready!**\n\nI've generated:\n- Brand identity (colors, fonts, tone)\n- Business model & overview\n- Website content (Home, About, Contact)\n- Business flow diagram\n- Internal tools\n\nExplore the sidebar to see everything, or ask me to make changes!`,
          status: 'complete',
        })
      } else {
        updateMessage(messageId, {
          content: `⚠️ **Partially complete** (${completedCount}/${tasks.length} succeeded)\n\nSome components failed to generate. You can ask me to retry the failed ones:\n${Object.values(finalState.tasks)
            .filter((t) => t.status === 'error')
            .map((t) => `- ${getTaskDisplayName(t.task)}: ${t.message}`)
            .join('\n')}`,
          status: 'complete',
        })
      }

      // Clean up URL (remove prompt param)
      const newUrl = pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [setOpen, addMessage, startGeneration, updateTask, completeGeneration, updateMessage, router, pathname])

  useEffect(() => {
    if (prompt && workspace?.id && !promptProcessed.current && !isGenerating) {
      promptProcessed.current = true
      runGeneration(prompt, workspace.id)
    }
  }, [prompt, workspace?.id, isGenerating, runGeneration])

  return { isGenerating, prompt }
}

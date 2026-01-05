'use client'

import { useGenerationStore, getTaskDisplayName } from '@/stores/generation-store'
import { cn } from '@/lib/utils'
import { Loader2, Check, X, Circle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export function GenerationProgress() {
  const { isGenerating, prompt, tasks } = useGenerationStore()

  if (!isGenerating) return null

  const taskList = Object.values(tasks)
  const completed = taskList.filter((t) => t.status === 'completed').length
  const total = taskList.length
  const progressPercent = (completed / total) * 100

  return (
    <div className="p-4 border-b bg-muted/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Building your business</span>
        <span className="text-xs text-muted-foreground">
          {completed}/{total}
        </span>
      </div>

      <Progress value={progressPercent} className="h-1.5 mb-3" />

      <div className="space-y-1.5">
        {taskList.map((task) => (
          <div key={task.task}>
            <div className="flex items-center gap-2 text-sm">
              {task.status === 'running' && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              )}
              {task.status === 'completed' && (
                <Check className="w-3.5 h-3.5 text-green-500" />
              )}
              {task.status === 'error' && (
                <X className="w-3.5 h-3.5 text-destructive" />
              )}
              {task.status === 'pending' && (
                <Circle className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span
                className={cn(
                  'flex-1',
                  task.status === 'completed' && 'text-muted-foreground',
                  task.status === 'error' && 'text-destructive'
                )}
              >
                {getTaskDisplayName(task.task)}
              </span>
              <span className="text-xs text-muted-foreground">
                {task.status === 'running' && !task.subTasks?.length && task.message}
              </span>
            </div>

            {/* SubTasks - show when task is running or just completed and has subtasks */}
            {task.subTasks && task.subTasks.length > 0 && (task.status === 'running' || task.status === 'completed') && (
              <div className="ml-5 mt-1 space-y-0.5 border-l border-border pl-3">
                {task.subTasks.map((subTask) => (
                  <div
                    key={subTask.name}
                    className="flex items-center gap-2 text-xs"
                  >
                    {subTask.status === 'running' && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    )}
                    {subTask.status === 'completed' && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                    {subTask.status === 'pending' && (
                      <Circle className="w-3 h-3 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        'font-mono',
                        subTask.status === 'completed' && 'text-muted-foreground',
                        subTask.status === 'running' && 'text-foreground'
                      )}
                    >
                      {subTask.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {prompt && (
        <p className="mt-3 text-xs text-muted-foreground truncate">
          "{prompt}"
        </p>
      )}
    </div>
  )
}

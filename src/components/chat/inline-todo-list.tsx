'use client'

import { cn } from '@/lib/utils'
import { Check, Circle, Loader2, ListTodo } from 'lucide-react'

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface InlineTodoListProps {
  title?: string
  items: TodoItem[]
}

export function InlineTodoList({ title = 'Plan', items }: InlineTodoListProps) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 rounded-lg bg-[#2a2a2a] border border-[#3a3a3a] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#3a3a3a] flex items-center gap-2">
        <ListTodo className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">{title}</span>
      </div>

      {/* Todo items */}
      <div className="divide-y divide-[#3a3a3a]">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              'px-3 py-2.5 flex items-start gap-3',
              item.status === 'in_progress' && 'bg-[#2f2f2f]'
            )}
          >
            {/* Status Icon */}
            <div className="mt-0.5">
              {item.status === 'completed' ? (
                <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-green-400" />
                </div>
              ) : item.status === 'in_progress' ? (
                <Loader2 className="w-4 h-4 text-[#c8ff00] animate-spin" />
              ) : (
                <Circle className="w-4 h-4 text-gray-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm',
                  item.status === 'completed' && 'text-gray-500 line-through',
                  item.status === 'in_progress' && 'text-gray-200',
                  item.status === 'pending' && 'text-gray-400'
                )}
              >
                {item.content}
              </span>
            </div>

            {/* Status text */}
            {item.status === 'in_progress' && (
              <span className="text-xs text-[#c8ff00] flex items-center gap-1">
                <span className="inline-block w-1 h-1 rounded-full bg-[#c8ff00] animate-pulse" />
                Thinking...
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

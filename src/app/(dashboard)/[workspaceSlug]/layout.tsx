'use client'

import { ReactNode } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { ChatPanel } from '@/components/chat/chat-panel'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Initialize workspace data
  useWorkspace()
  const isEditing = useUIStore((state) => state.isEditing)

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <DashboardHeader />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden px-2 pb-2 gap-2">
        {/* Left - Chat Panel */}
        <div className="w-[420px] flex-shrink-0 rounded-xl overflow-hidden border border-[#2a2a2a]">
          <ChatPanel />
        </div>

        {/* Right - Preview Area */}
        <div className={cn(
          'flex-1 bg-[#2a2a2a] overflow-auto rounded-xl border border-transparent transition-all',
          isEditing && 'editing-ring'
        )}>
          {children}
        </div>
      </div>
    </div>
  )
}

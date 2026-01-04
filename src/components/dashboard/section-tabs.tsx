'use client'

import { useParams, useRouter } from 'next/navigation'
import { useUIStore, type SectionTab } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import {
  Globe,
  FileText,
  Palette,
  GitBranch,
  Wrench,
  Settings,
  LayoutGrid,
  Plus,
  Pin,
  Code2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TabItem {
  id: SectionTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const allTabs: TabItem[] = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'brand', label: 'Brand', icon: Palette },
  { id: 'flow', label: 'Flow', icon: GitBranch },
  { id: 'internal', label: 'Internal', icon: Wrench },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function SectionTabs() {
  const params = useParams()
  const router = useRouter()
  const workspaceSlug = params?.workspaceSlug as string
  const { activeSection, setActiveSection, pinnedTabs, pinTab } = useUIStore()

  // Get pinned and unpinned tabs
  const pinnedTabItems = allTabs.filter((tab) => pinnedTabs.includes(tab.id))
  const unpinnedTabItems = allTabs.filter((tab) => !pinnedTabs.includes(tab.id))

  const handleTabClick = (tab: TabItem) => {
    setActiveSection(tab.id)
    router.push(`/${workspaceSlug}/${tab.id}`)
  }

  const renderTab = (tab: TabItem) => {
    const isActive = activeSection === tab.id
    const Icon = tab.icon

    return (
      <button
        key={tab.id}
        onClick={() => handleTabClick(tab)}
        className={cn(
          'flex items-center rounded-lg transition-all',
          isActive
            ? 'gap-2 px-3 py-1.5 bg-[#c8ff00] text-gray-900'
            : 'p-2 bg-gray-100 text-gray-500 hover:bg-gray-200'
        )}
      >
        <Icon className="w-4 h-4" />
        {isActive && <span className="text-sm font-medium">{tab.label}</span>}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 pl-2">
      {/* Pinned tabs */}
      {pinnedTabItems.map(renderTab)}

      {/* Plus button dropdown for unpinned tabs */}
      {unpinnedTabItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {unpinnedTabItems.map((tab) => {
              const Icon = tab.icon
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => pinTab(tab.id)}
                  className="cursor-pointer"
                >
                  <Pin className="w-4 h-4 mr-2" />
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

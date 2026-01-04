'use client'

import { useParams } from 'next/navigation'
import { useWorkspace } from '@/hooks/use-workspace'
import { useUIStore } from '@/stores/ui-store'
import { SectionTabs } from './section-tabs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  History,
  LayoutGrid,
  Share2,
  ArrowUp,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Smartphone,
  Maximize2,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  Play,
  Settings,
  Plus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function DashboardHeader() {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string
  const { workspace, isLoading } = useWorkspace()
  const activeSection = useUIStore((state) => state.activeSection)

  return (
    <header className="h-14 bg-white flex items-center px-2">
      {/* Left - Logo and Workspace Name (exactly 420px to match chat panel) */}
      <div className="w-[420px] flex-shrink-0 flex items-center gap-3 px-4">
        {/* Ernest Logo */}
        <span className="font-serif text-2xl text-gray-900">ernest</span>

        <span className="text-gray-300">/</span>

        {/* Workspace Name */}
        {isLoading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <button className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors">
            <span className="font-medium text-gray-900">{workspace?.name || 'My Business'}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
        )}

        {/* History and Layout Icons - at right edge of chat section */}
        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
            <History className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <SectionTabs />

      {/* Preview Toolbar - centered, pill container */}
      <div className="flex-1 flex items-center justify-center">
        {activeSection !== 'settings' && (
          <div className="flex items-center border border-gray-200 rounded-full px-3 py-1">
            {/* Page dropdown - for website */}
            {activeSection === 'website' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mr-2">
                    <span className="text-gray-400">/</span>
                    <span>home</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>home</DropdownMenuItem>
                  <DropdownMenuItem>about</DropdownMenuItem>
                  <DropdownMenuItem>contact</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Website controls */}
            {activeSection === 'website' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Smartphone className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {/* Overview controls */}
            {activeSection === 'overview' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {/* Brand controls */}
            {activeSection === 'brand' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {/* Flow controls */}
            {activeSection === 'flow' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Maximize className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </>
            )}

            {/* Internal tools controls */}
            {activeSection === 'internal' && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Play className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right - Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Integrations */}
        <div className="flex items-center">
          {/* Stacked logos */}
          <div className="flex -space-x-2 mr-2">
            <div className="w-7 h-7 rounded-full bg-[#635bff] border-2 border-white flex items-center justify-center z-30">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
            </div>
            <div className="w-7 h-7 rounded-full bg-black border-2 border-white flex items-center justify-center z-20">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#3ecf8e] border-2 border-white flex items-center justify-center z-10">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>
              </svg>
            </div>
          </div>

          {/* Pill with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1 text-sm text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50">
                Integrations
                <Plus className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Stripe</DropdownMenuItem>
              <DropdownMenuItem>GitHub</DropdownMenuItem>
              <DropdownMenuItem>Supabase</DropdownMenuItem>
              <DropdownMenuItem>Cal.com</DropdownMenuItem>
              <DropdownMenuItem>Slack</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Share Button */}
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="w-4 h-4" />
          Share
        </Button>

        {/* Publish Button */}
        <Button size="sm" className="gap-2 bg-[#c8ff00] hover:bg-[#b8ef00] text-gray-900">
          Publish
          <ArrowUp className="w-3.5 h-3.5" />
        </Button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-orange-400 ml-2" />
      </div>
    </header>
  )
}

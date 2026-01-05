'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ModelPicker } from '@/components/ui/model-picker'
import { useModelStore } from '@/stores/model-store'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Globe,
  Wrench,
  ArrowUpRight,
  Plus,
  Loader2,
  LogOut,
  FileText,
  X
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Workspace {
  id: string
  name: string
  slug: string
  description: string | null
  updated_at: string
  preview_url: string | null
  tools_count: number
  pages_count: number
  website_status: 'draft' | 'live' | 'preview' | null
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  return 'Evening'
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export default function Home() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { selectedModel, setModel } = useModelStore()

  // Check auth state and fetch workspaces on mount
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // RLS handles filtering via workspace_members table
        // Join with preview_sessions, websites, internal_tools, and website_pages
        const { data: workspacesData, error } = await supabase
          .from('workspaces')
          .select(`
            id, name, slug, business_description, updated_at,
            preview_sessions!preview_sessions_workspace_id_fkey(preview_url, status),
            websites(status),
            internal_tools(id),
            website_pages(id)
          `)
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('Error fetching workspaces:', error)
        }
        setWorkspaces(workspacesData?.map(w => {
          const sessions = w.preview_sessions as any[]
          const activeSession = sessions?.find((s: any) => s.status === 'running')
          const websites = w.websites as any[]
          const tools = w.internal_tools as any[]
          const pages = w.website_pages as any[]

          // Determine website status
          let websiteStatus: 'draft' | 'live' | 'preview' | null = null
          if (activeSession) {
            websiteStatus = 'preview'
          } else if (websites?.[0]?.status === 'deployed') {
            websiteStatus = 'live'
          } else if (websites?.length > 0) {
            websiteStatus = 'draft'
          }

          return {
            id: w.id,
            name: w.name,
            slug: w.slug,
            description: w.business_description,
            updated_at: w.updated_at,
            preview_url: activeSession?.preview_url || null,
            tools_count: tools?.length || 0,
            pages_count: pages?.length || 0,
            website_status: websiteStatus
          }
        }) || [])
      }

      setIsLoadingAuth(false)
    }
    fetchData()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setWorkspaces([])
  }

  async function handleSubmit() {
    if (!prompt.trim()) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        if (workspaces.length > 0) {
          router.push(`/${workspaces[0].slug}?prompt=${encodeURIComponent(prompt)}`)
        } else {
          // Call API to create workspace (handles RLS, creates member/brand/overview)
          const response = await fetch('/api/auth/setup-workspace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, email: user.email }),
          })

          if (!response.ok) throw new Error('Failed to create workspace')

          const { slug } = await response.json()
          router.push(`/${slug}?prompt=${encodeURIComponent(prompt)}`)
        }
      } else {
        router.push(`/login?prompt=${encodeURIComponent(prompt)}`)
      }
    } catch (error) {
      console.error('Error handling prompt:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateWorkspace = async () => {
    if (!user) return
    setIsCreatingWorkspace(true)

    try {
      // Call API to create workspace (handles RLS, creates member/brand/overview)
      const response = await fetch('/api/auth/setup-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!response.ok) throw new Error('Failed to create workspace')

      const { slug } = await response.json()
      router.push(`/${slug}`)
    } catch (error) {
      console.error('Error creating workspace:', error)
    } finally {
      setIsCreatingWorkspace(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!workspaceToDelete) return
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/workspaces/${workspaceToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete workspace')
      }

      // Remove from local state
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceToDelete.id))
      setWorkspaceToDelete(null)
    } catch (error) {
      console.error('Error deleting workspace:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ||
                    user?.email?.split('@')[0] ||
                    'there'

  // Show loading state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#c8ff00]" />
      </div>
    )
  }

  // LOGGED IN VIEW - White background with greeting, prompt, and projects
  if (user) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header>
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <span className="text-xl font-serif text-gray-900">Ernest</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4">
          {/* Greeting + Prompt - Centered vertically */}
          <div className="flex flex-col items-center justify-center min-h-[50vh] py-12">
            {/* Greeting */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <span className="text-[#c8ff00] text-3xl">&#10042;</span>
              <h1 className="text-4xl font-serif text-gray-900">
                {getGreeting()}, {firstName}
              </h1>
            </div>

            {/* Prompt Box */}
            <div className="w-full max-w-2xl">
              <div className="bg-[#1c1c1c] rounded-xl px-4 py-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="How can Ernest help you today?"
                  className="w-full bg-transparent text-gray-200 placeholder-gray-500 text-base resize-none focus:outline-none min-h-[60px] max-h-40 font-serif"
                  rows={2}
                />
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                    <ModelPicker
                      value={selectedModel}
                      onChange={setModel}
                      variant="compact"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !prompt.trim()}
                    className="w-8 h-8 aspect-square rounded-full flex items-center justify-center bg-[#c8ff00] text-gray-900 hover:bg-[#b8ef00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Section */}
          <div className="w-full max-w-4xl mx-auto pb-16">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Your Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="relative group">
                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setWorkspaceToDelete(workspace)
                    }}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 text-gray-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link href={`/${workspace.slug}`}>
                    <div className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 hover:border-[#c8ff00]/50 cursor-pointer h-full">
                      {/* Header: Name + Corner Preview */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-medium text-gray-900 group-hover:text-[#9acd00] transition-colors">
                          {workspace.name}
                        </h3>
                      {/* Corner Preview */}
                      <div className="w-16 h-12 rounded-md bg-gray-200 overflow-hidden flex-shrink-0">
                        {workspace.preview_url ? (
                          <iframe
                            src={workspace.preview_url}
                            className="w-[400%] h-[400%] origin-top-left scale-[0.25] pointer-events-none"
                            title={`${workspace.name} preview`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Globe className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {workspace.description || 'No description yet'}
                    </p>

                    {/* Metrics Row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-gray-600">
                        <Wrench className="w-3 h-3" />
                        {workspace.tools_count} tools
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs text-gray-600">
                        <FileText className="w-3 h-3" />
                        {workspace.pages_count} pages
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        workspace.website_status === 'live' ? 'bg-green-100 text-green-700' :
                        workspace.website_status === 'preview' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          workspace.website_status === 'live' ? 'bg-green-500' :
                          workspace.website_status === 'preview' ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`} />
                        {workspace.website_status === 'live' ? 'Live' :
                         workspace.website_status === 'preview' ? 'Preview' : 'Draft'}
                      </span>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-gray-400">
                      Updated {formatRelativeTime(workspace.updated_at)}
                    </p>
                  </div>
                </Link>
              </div>
              ))}

              {/* New Project Card */}
              <button
                onClick={handleCreateWorkspace}
                disabled={isCreatingWorkspace}
                className="rounded-xl border-2 border-dashed border-gray-300 hover:border-[#c8ff00] transition-all flex flex-col items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '176px' }}
              >
                {isCreatingWorkspace ? (
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-[#9acd00] transition-colors" />
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 mt-2">
                      New Project
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Empty State */}
            {workspaces.length === 0 && (
              <div className="text-center mt-8">
                <p className="text-gray-600 mb-2">
                  You don&apos;t have any projects yet.
                </p>
                <p className="text-gray-400 text-sm">
                  Type in the prompt box above to create your first business, or click &quot;New Project&quot; to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!workspaceToDelete} onOpenChange={(open) => !open && setWorkspaceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium text-gray-900">{workspaceToDelete?.name}</span> and all its data including the website, tools, and brand settings. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteWorkspace}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // LOGGED OUT VIEW - Same design, just no projects
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-serif text-gray-900">Ernest</span>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-[#c8ff00] hover:bg-[#b8ef00] text-gray-900">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        {/* Greeting + Prompt - Centered vertically */}
        <div className="flex flex-col items-center justify-center min-h-[70vh] py-12">
          {/* Greeting */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span className="text-[#c8ff00] text-3xl">&#10042;</span>
            <h1 className="text-4xl font-serif text-gray-900">
              How can Ernest help you?
            </h1>
          </div>

          {/* Prompt Box */}
          <div className="w-full max-w-2xl">
            <div className="bg-[#1c1c1c] rounded-xl px-4 py-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your business idea..."
                className="w-full bg-transparent text-gray-200 placeholder-gray-500 text-base resize-none focus:outline-none min-h-[60px] max-h-40 font-serif"
                rows={2}
              />
              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-400 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                  <ModelPicker
                    value={selectedModel}
                    onChange={setModel}
                    variant="compact"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !prompt.trim()}
                  className="w-8 h-8 aspect-square rounded-full flex items-center justify-center bg-[#c8ff00] text-gray-900 hover:bg-[#b8ef00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sign in hint */}
          <p className="mt-6 text-sm text-gray-500">
            <Link href="/login" className="text-gray-700 hover:text-gray-900 underline">Sign in</Link> to access your projects
          </p>
        </div>
      </div>
    </div>
  )
}

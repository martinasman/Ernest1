'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModelPicker } from '@/components/ui/model-picker'
import { useModelStore } from '@/stores/model-store'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Sparkles,
  Globe,
  Palette,
  Wrench,
  GitBranch,
  MessageSquare,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Loader2,
  LogOut,
  FileText
} from 'lucide-react'

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
          const { data: newWorkspace, error } = await supabase
            .from('workspaces')
            .insert({
              name: 'My Business',
              slug: 'my-business-' + Date.now(),
              description: 'Created from home',
            })
            .select()
            .single()

          if (error) throw error
          router.push(`/${newWorkspace.slug}?prompt=${encodeURIComponent(prompt)}`)
        }
      } else {
        router.push(`/login?prompt=${encodeURIComponent(prompt)}`)
      }
    } catch (error) {
      router.push(`/login?prompt=${encodeURIComponent(prompt)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateWorkspace = async () => {
    setIsCreatingWorkspace(true)

    try {
      const supabase = createClient()
      const timestamp = Date.now()

      const { data: newWorkspace, error } = await supabase
        .from('workspaces')
        .insert({
          name: 'New Project',
          slug: `new-project-${timestamp}`,
          description: null,
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/${newWorkspace.slug}`)
    } catch (error) {
      console.error('Error creating workspace:', error)
    } finally {
      setIsCreatingWorkspace(false)
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
                <Link key={workspace.id} href={`/${workspace.slug}`}>
                  <div className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 hover:border-[#c8ff00]/50 group cursor-pointer">
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
      </div>
    )
  }

  // LOGGED OUT VIEW - Original landing page
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Glowing arc decoration */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[600px] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-500/20 via-blue-500/5 to-transparent rounded-[100%] blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-lg font-bold text-white">E</span>
            </div>
            <span className="text-xl font-bold">Ernest</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero with Prompt */}
      <section className="relative z-10 container mx-auto px-4 flex flex-col items-center justify-center min-h-[70vh] pt-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4 text-blue-400" />
          AI-Powered Business OS
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-center mb-4">
          What will you <span className="italic text-blue-400">build</span> today?
        </h1>

        {/* Subheadline */}
        <p className="text-xl text-gray-400 text-center max-w-2xl mb-10">
          Create and run your entire business by chatting with AI
        </p>

        {/* Prompt Box */}
        <div className="w-full max-w-2xl">
          <div className="bg-[#2a2a2a] rounded-lg px-4 py-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="How can ernest help you today?"
              className="w-full bg-transparent text-gray-200 placeholder-gray-400 text-base resize-none focus:outline-none min-h-[60px] max-h-40 font-serif"
              rows={2}
            />
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-full bg-[#3a3a3a] hover:bg-[#444] text-gray-400 transition-colors">
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
                className="w-8 h-8 aspect-square rounded-full flex items-center justify-center bg-[#c8ff00] text-gray-900 hover:bg-[#b8ef00] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-4 mt-6 text-sm text-gray-500">
          <span>or explore</span>
          <Link href="/login" className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
            Sign In
          </Link>
          <Link href="/signup" className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-gray-400 hover:text-white">
            Create Account
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 container mx-auto px-4 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything you need, generated by AI
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-[#12121a] border-white/10 text-white">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Conversational AI</CardTitle>
              <CardDescription className="text-gray-400">
                Just describe what you need. Ernest understands your business context and takes action.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[#12121a] border-white/10 text-white">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Brand Identity</CardTitle>
              <CardDescription className="text-gray-400">
                Generate a complete brand—colors, fonts, tone of voice—that propagates everywhere.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[#12121a] border-white/10 text-white">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-white">AI Website Builder</CardTitle>
              <CardDescription className="text-gray-400">
                Generate beautiful, on-brand websites with React and Tailwind. Edit with natural language.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[#12121a] border-white/10 text-white">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center mb-4">
                <Wrench className="w-6 h-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Dynamic Internal Tools</CardTitle>
              <CardDescription className="text-gray-400">
                Create CRMs, inventory trackers, task managers—any tool you need, with custom schemas.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[#12121a] border-white/10 text-white">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4">
                <GitBranch className="w-6 h-6 text-pink-400" />
              </div>
              <CardTitle className="text-white">Business Flows</CardTitle>
              <CardDescription className="text-gray-400">
                Visualize and optimize how your business operates, from acquisition to delivery.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-[#12121a] border-white/10 text-white">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
              <CardTitle className="text-white">AI-Native</CardTitle>
              <CardDescription className="text-gray-400">
                No templates. Ernest analyzes your business context and generates exactly what you need.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-4 py-12 pb-24">
        <Card className="bg-gradient-to-r from-blue-600 to-blue-500 border-0">
          <CardContent className="py-12 text-center">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Ready to build your business?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto text-white/90">
              Join the future of business operations. Let AI handle the complexity while you focus on what matters.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 gap-2">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">E</span>
            </div>
            <span className="font-semibold">Ernest</span>
          </div>
          <p className="text-sm text-gray-500">
            AI-Powered Business Operating System
          </p>
        </div>
      </footer>
    </div>
  )
}

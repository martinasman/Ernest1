'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModelPicker } from '@/components/ui/model-picker'
import { useModelStore } from '@/stores/model-store'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles,
  Globe,
  Palette,
  Wrench,
  GitBranch,
  MessageSquare,
  ArrowRight,
  Plus
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { selectedModel, setModel } = useModelStore()

  async function handleSubmit() {
    if (!prompt.trim()) return

    setIsSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // User is signed in - get their first workspace or create new
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('slug')
          .limit(1)
          .single()

        if (workspaces?.slug) {
          // Redirect to dashboard with prompt
          router.push(`/${workspaces.slug}?prompt=${encodeURIComponent(prompt)}`)
        } else {
          // No workspace - go to create one
          router.push(`/signup?prompt=${encodeURIComponent(prompt)}`)
        }
      } else {
        // Not signed in - redirect to signup with prompt
        router.push(`/signup?prompt=${encodeURIComponent(prompt)}`)
      }
    } catch (error) {
      // If error, just go to signup
      router.push(`/signup?prompt=${encodeURIComponent(prompt)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

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
          <div className="bg-[#1a1a24] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Let's build a business..."
              className="w-full bg-transparent text-white placeholder-gray-500 p-4 min-h-[100px] resize-none focus:outline-none text-lg"
            />
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
                <ModelPicker
                  value={selectedModel}
                  onChange={setModel}
                  variant="dark"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !prompt.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white gap-2"
              >
                {isSubmitting ? 'Starting...' : 'Build now'}
                <ArrowRight className="w-4 h-4" />
              </Button>
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

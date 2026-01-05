'use client'

import { useWorkspace } from '@/hooks/use-workspace'
import { useBusinessGenerator } from '@/hooks/use-business-generator'
import { useGenerationStore } from '@/stores/generation-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Globe,
  Palette,
  GitBranch,
  FileText,
  Wrench,
  TrendingUp,
  Activity,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { workspace, brand, overview, tools, isLoading } = useWorkspace()
  const isGenerating = useGenerationStore((state) => state.isGenerating)

  // Detect ?prompt param and trigger parallel AI generation
  useBusinessGenerator()

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  // Check if workspace has any generated content
  const isEmptyWorkspace =
    (!tools || tools.length === 0) &&
    !overview?.unique_value_proposition &&
    (!brand || brand.name === 'My Business')

  // Show clean empty state when nothing has been generated OR during generation
  if (isEmptyWorkspace || isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6 bg-white">
        <div className="text-center max-w-md">
          {isGenerating ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Building your business...
              </h1>
              <p className="text-gray-500 text-sm">
                Check the chat panel to see progress
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                What kind of business do you want to create?
              </h1>
              <p className="text-gray-500 text-sm">
                Use the chat on the right to describe your business and Ernest will generate everything for you.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const quickLinks = [
    {
      title: 'Overview',
      description: 'Business model & lean canvas',
      icon: FileText,
      href: `/${workspace?.slug}/overview`,
      color: 'text-blue-500'
    },
    {
      title: 'Brand',
      description: 'Visual identity & tone',
      icon: Palette,
      href: `/${workspace?.slug}/brand`,
      color: 'text-purple-500'
    },
    {
      title: 'Website',
      description: 'Pages & content',
      icon: Globe,
      href: `/${workspace?.slug}/website`,
      color: 'text-green-500'
    },
    {
      title: 'Flow',
      description: 'Business flow diagram',
      icon: GitBranch,
      href: `/${workspace?.slug}/flow`,
      color: 'text-orange-500'
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of {workspace?.name || 'your business'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Internal Tools</CardTitle>
            <Wrench className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tools?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active tools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Brand Status</CardTitle>
            <Palette className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brand ? 'Configured' : 'Not Set'}</div>
            <p className="text-xs text-muted-foreground">
              {brand?.name || 'Set up your brand'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Business Model</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.unique_value_proposition ? 'Defined' : 'Draft'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.solutions?.length || 0} solutions defined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              AI assistant ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <link.icon className={`w-8 h-8 ${link.color}`} />
                  <CardTitle className="text-base">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Internal Tools Section */}
      {tools && tools.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <Link key={tool.id} href={`/${workspace?.slug}/internal/${tool.slug}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                        <CardDescription>{tool.description || 'Custom tool'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Getting Started */}
      {!tools?.length && !overview?.unique_value_proposition && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>Get Started with Ernest</CardTitle>
            <CardDescription>
              Use the AI assistant on the right to set up your business. Try saying:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                &quot;Create a CRM to track my customers&quot;
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                &quot;Set up my brand with blue colors&quot;
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                &quot;Define my value proposition&quot;
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

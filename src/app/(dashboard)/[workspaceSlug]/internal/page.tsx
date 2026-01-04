'use client'

import Link from 'next/link'
import { useWorkspace } from '@/hooks/use-workspace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Wrench,
  Users,
  Package,
  CheckSquare,
  Calendar,
  FileText,
  Plus
} from 'lucide-react'

const iconMap: Record<string, any> = {
  users: Users,
  package: Package,
  'check-square': CheckSquare,
  calendar: Calendar,
  'file-text': FileText,
  'layout-grid': Wrench,
}

export default function InternalToolsPage() {
  const { workspace, tools, isLoading } = useWorkspace()

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Internal Tools</h1>
        <p className="text-muted-foreground">
          AI-generated tools for managing your business
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools?.map((tool) => {
          const IconComponent = iconMap[tool.icon] || Wrench
          const schema = tool.schema_definition as any
          const fieldCount = schema?.fields?.length || 0

          return (
            <Link key={tool.id} href={`/${workspace?.slug}/internal/${tool.slug}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {tool.tool_type || 'custom'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{tool.name}</CardTitle>
                  <CardDescription>
                    {tool.description || 'Custom internal tool'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{fieldCount} fields</span>
                    <span>•</span>
                    <span>Created {new Date(tool.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}

        {/* Create New Tool Card */}
        <Card className="border-dashed hover:bg-muted/50 transition-colors cursor-pointer h-full flex items-center justify-center min-h-[200px]">
          <CardContent className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Create New Tool</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ask the AI to create a custom tool
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {(!tools || tools.length === 0) && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle>No Tools Yet</CardTitle>
            <CardDescription>
              Create your first internal tool using the AI assistant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Try asking Ernest to create tools like:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                &quot;Create a CRM to track customers and deals&quot;
              </li>
              <li className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                &quot;Build an inventory tracker for my products&quot;
              </li>
              <li className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" />
                &quot;Set up a task management system&quot;
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

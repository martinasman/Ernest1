'use client'

import { useState, useMemo } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { useGenerationStore, getTaskDisplayName, GENERATION_STEPS } from '@/stores/generation-store'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Code2,
  FileJson,
  FileType,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  content?: string
  language?: string
}

interface WebsiteSection {
  type: string
  headline: string
  subheadline?: string
  content?: string
  layout?: string
  items?: Array<{ title: string; description: string }>
  ctaText?: string
  ctaHref?: string
  [key: string]: unknown
}

interface WebsitePage {
  slug: string
  title: string
  sections: WebsiteSection[]
}

interface WebsiteData {
  pages: WebsitePage[]
  navigation?: Array<{ label: string; href: string }>
  footer?: { copyright: string; links: Array<{ label: string; href: string }> }
}

export default function CodePage() {
  const { workspace } = useWorkspace()
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const tasks = useGenerationStore((state) => state.tasks)
  const currentStep = useGenerationStore((state) => state.currentStep)

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/pages', 'src/components']))
  const [copied, setCopied] = useState(false)

  // Get website data from workspace
  const websiteData = (workspace?.ai_context as Record<string, unknown>)?.website as WebsiteData | undefined
  const brandData = (workspace?.ai_context as Record<string, unknown>)?.brand as Record<string, unknown> | undefined

  // Generate file tree based on website data
  const fileTree = useMemo<FileNode[]>(() => {
    if (!websiteData?.pages) {
      return []
    }

    const pages = websiteData.pages
    const pageComponents: FileNode[] = pages.map((page) => ({
      name: `${page.slug}.tsx`,
      type: 'file' as const,
      path: `src/pages/${page.slug}.tsx`,
      language: 'tsx',
      content: generatePageCode(page, brandData),
    }))

    const sectionComponents: FileNode[] = []
    const sectionTypes = new Set<string>()
    pages.forEach((page) => {
      page.sections.forEach((section) => {
        sectionTypes.add(section.type)
      })
    })

    sectionTypes.forEach((type) => {
      sectionComponents.push({
        name: `${type}-section.tsx`,
        type: 'file' as const,
        path: `src/components/sections/${type}-section.tsx`,
        language: 'tsx',
        content: generateSectionComponent(type),
      })
    })

    return [
      {
        name: 'src',
        type: 'folder',
        path: 'src',
        children: [
          {
            name: 'pages',
            type: 'folder',
            path: 'src/pages',
            children: pageComponents,
          },
          {
            name: 'components',
            type: 'folder',
            path: 'src/components',
            children: [
              {
                name: 'sections',
                type: 'folder',
                path: 'src/components/sections',
                children: sectionComponents,
              },
              {
                name: 'ui',
                type: 'folder',
                path: 'src/components/ui',
                children: [
                  { name: 'button.tsx', type: 'file', path: 'src/components/ui/button.tsx', language: 'tsx', content: buttonComponentCode },
                  { name: 'card.tsx', type: 'file', path: 'src/components/ui/card.tsx', language: 'tsx', content: cardComponentCode },
                ],
              },
            ],
          },
          {
            name: 'styles',
            type: 'folder',
            path: 'src/styles',
            children: [
              { name: 'globals.css', type: 'file', path: 'src/styles/globals.css', language: 'css', content: generateGlobalStyles(brandData) },
              { name: 'theme.ts', type: 'file', path: 'src/styles/theme.ts', language: 'ts', content: generateThemeCode(brandData) },
            ],
          },
        ],
      },
      {
        name: 'package.json',
        type: 'file',
        path: 'package.json',
        language: 'json',
        content: packageJsonCode,
      },
      {
        name: 'tailwind.config.js',
        type: 'file',
        path: 'tailwind.config.js',
        language: 'javascript',
        content: tailwindConfigCode,
      },
    ]
  }, [websiteData, brandData])

  // Find selected file content
  const selectedFileContent = useMemo(() => {
    if (!selectedFile) return null
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === selectedFile) return node
        if (node.children) {
          const found = findFile(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findFile(fileTree)
  }, [selectedFile, fileTree])

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const copyToClipboard = async () => {
    if (selectedFileContent?.content) {
      await navigator.clipboard.writeText(selectedFileContent.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getFileIcon = (name: string) => {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileType className="w-4 h-4 text-blue-400" />
    if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />
    if (name.endsWith('.css')) return <File className="w-4 h-4 text-pink-400" />
    if (name.endsWith('.js')) return <FileType className="w-4 h-4 text-yellow-300" />
    return <File className="w-4 h-4 text-gray-400" />
  }

  const renderTreeNode = (node: FileNode, depth = 0) => {
    const isExpanded = expandedFolders.has(node.path)
    const isSelected = selectedFile === node.path

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleFolder(node.path)}
            className={cn(
              'flex items-center gap-1.5 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded text-left',
              isSelected && 'bg-blue-50'
            )}
            style={{ paddingLeft: depth * 12 + 8 }}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-400" />
            ) : (
              <Folder className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-gray-700">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <button
        key={node.path}
        onClick={() => setSelectedFile(node.path)}
        className={cn(
          'flex items-center gap-1.5 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded text-left',
          isSelected && 'bg-blue-100'
        )}
        style={{ paddingLeft: depth * 12 + 24 }}
      >
        {getFileIcon(node.name)}
        <span className={cn('text-gray-700', isSelected && 'font-medium')}>{node.name}</span>
      </button>
    )
  }

  // Show generating state
  if (isGenerating) {
    const currentTask = GENERATION_STEPS[currentStep]
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-gray-900 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Generating Code</h2>
            <p className="text-gray-500 mt-1">
              {currentTask ? getTaskDisplayName(currentTask) : 'Starting...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!websiteData?.pages?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-gray-500">
        <Code2 className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Code Generated Yet</h2>
        <p className="text-center max-w-md">
          Generate a website first and the code will appear here. You can view, copy, and export the generated code.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-white">
      {/* File Tree Sidebar */}
      <div className="w-64 border-r border-gray-200 overflow-y-auto bg-gray-50">
        <div className="p-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Files</h3>
        </div>
        <div className="py-2">
          {fileTree.map((node) => renderTreeNode(node))}
        </div>
      </div>

      {/* Code Editor Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFileContent ? (
          <>
            {/* File Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                {getFileIcon(selectedFileContent.name)}
                <span className="text-sm font-medium text-gray-700">{selectedFileContent.path}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-900">
              <pre className="text-sm font-mono text-gray-100 whitespace-pre-wrap">
                <code>{selectedFileContent.content}</code>
              </pre>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
            <div className="text-center">
              <Code2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a file to view its code</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Code generation helpers
function generatePageCode(page: WebsitePage, brandData?: Record<string, unknown>): string {
  const sections = page.sections
    .map((s) => `      <${capitalizeFirst(s.type)}Section />`)
    .join('\n')

  return `import { ${page.sections.map((s) => `${capitalizeFirst(s.type)}Section`).join(', ')} } from '@/components/sections'

export default function ${capitalizeFirst(page.slug)}Page() {
  return (
    <main className="min-h-screen">
${sections}
    </main>
  )
}
`
}

function generateSectionComponent(type: string): string {
  return `import { cn } from '@/lib/utils'

interface ${capitalizeFirst(type)}SectionProps {
  className?: string
}

export function ${capitalizeFirst(type)}Section({ className }: ${capitalizeFirst(type)}SectionProps) {
  return (
    <section className={cn('py-16 px-6', className)}>
      <div className="max-w-6xl mx-auto">
        {/* ${capitalizeFirst(type)} section content */}
        <h2 className="text-3xl font-bold mb-4">
          ${capitalizeFirst(type)}
        </h2>
        {/* Add your ${type} content here */}
      </div>
    </section>
  )
}
`
}

function generateGlobalStyles(brandData?: Record<string, unknown>): string {
  const colors = brandData?.colors as Record<string, string> | undefined
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${colors?.primary || '#000000'};
  --background: ${colors?.background || '#ffffff'};
  --foreground: ${colors?.foreground || '#111111'};
  --muted: ${colors?.muted || '#f5f5f5'};
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
}
`
}

function generateThemeCode(brandData?: Record<string, unknown>): string {
  const colors = brandData?.colors as Record<string, string> | undefined
  return `export const theme = {
  colors: {
    primary: '${colors?.primary || '#000000'}',
    background: '${colors?.background || '#ffffff'}',
    foreground: '${colors?.foreground || '#111111'}',
    muted: '${colors?.muted || '#f5f5f5'}',
  },
  fonts: {
    heading: 'var(--font-heading)',
    body: 'var(--font-body)',
  },
}
`
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const buttonComponentCode = `import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          variant === 'primary' && 'bg-primary text-white hover:bg-primary/90',
          variant === 'secondary' && 'bg-muted text-foreground hover:bg-muted/80',
          variant === 'outline' && 'border border-gray-300 hover:bg-gray-50',
          size === 'sm' && 'px-3 py-1.5 text-sm',
          size === 'md' && 'px-4 py-2 text-base',
          size === 'lg' && 'px-6 py-3 text-lg',
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
`

const cardComponentCode = `import { cn } from '@/lib/utils'
import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
          className
        )}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'
`

const packageJsonCode = `{
  "name": "generated-website",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0"
  }
}
`

const tailwindConfigCode = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
      },
    },
  },
  plugins: [],
}
`

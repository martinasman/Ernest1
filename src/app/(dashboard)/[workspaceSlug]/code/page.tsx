'use client'

import { useEffect, useMemo, useState } from 'react'
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

export default function CodePage() {
  const { workspace, isLoading } = useWorkspace()
  const isGenerating = useGenerationStore((state) => state.isGenerating)
  const currentStep = useGenerationStore((state) => state.currentStep)

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/pages', 'src/components']))
  const [copied, setCopied] = useState(false)

  // Get pre-generated files directly from ai_context.websiteFiles
  const generatedFiles = useMemo(() => {
    const aiContext = workspace?.ai_context as Record<string, unknown> | undefined
    const files = aiContext?.websiteFiles as Record<string, string> | undefined
    if (!files || Object.keys(files).length === 0) return null
    return files
  }, [workspace?.ai_context])

  const fileTree = useMemo<FileNode[]>(() => {
    if (!generatedFiles) return []
    const nodes: FileNode[] = []
    Object.entries(generatedFiles).forEach(([path, content]) => {
      insertFile(nodes, path, content)
    })
    return sortFileTree(nodes)
  }, [generatedFiles])

  const fileIndex = useMemo(() => buildFileIndex(fileTree), [fileTree])

  useEffect(() => {
    if (selectedFile && !fileIndex.has(selectedFile)) {
      setSelectedFile(null)
    }
    if (!selectedFile) {
      const first = findFirstFile(fileTree)
      if (first) {
        setSelectedFile(first.path)
      }
    }
  }, [selectedFile, fileIndex, fileTree])

  const selectedFileContent = selectedFile ? fileIndex.get(selectedFile) || null : null

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
    if (name.endsWith('.js')) return <FileType className="w-4 h-4 text-yellow-300" />
    if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />
    if (name.endsWith('.css')) return <File className="w-4 h-4 text-pink-400" />
    if (name.endsWith('.html')) return <FileType className="w-4 h-4 text-red-400" />
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
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-3" />
        <p className="text-gray-500">Loading workspace…</p>
      </div>
    )
  }

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

  if (!generatedFiles) {
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

// File tree helpers
function insertFile(tree: FileNode[], filePath: string, content: string) {
  const parts = filePath.split('/')
  let currentLevel = tree
  let currentPath = ''

  parts.forEach((part, index) => {
    currentPath = currentPath ? `${currentPath}/${part}` : part
    const isFile = index === parts.length - 1

    if (isFile) {
      currentLevel.push({
        name: part,
        type: 'file',
        path: currentPath,
        content,
        language: getLanguageFromExtension(part),
      })
      return
    }

    let folder = currentLevel.find((node) => node.name === part && node.type === 'folder')
    if (!folder) {
      folder = { name: part, type: 'folder', path: currentPath, children: [] }
      currentLevel.push(folder)
    }
    if (!folder.children) folder.children = []
    currentLevel = folder.children
  })
}

function sortFileTree(nodes: FileNode[]): FileNode[] {
  return nodes
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name)
      return a.type === 'folder' ? -1 : 1
    })
    .map((node) =>
      node.children
        ? { ...node, children: sortFileTree(node.children) }
        : node
    )
}

function buildFileIndex(nodes: FileNode[]): Map<string, FileNode> {
  const map = new Map<string, FileNode>()

  const walk = (items: FileNode[]) => {
    items.forEach((item) => {
      map.set(item.path, item)
      if (item.children) {
        walk(item.children)
      }
    })
  }

  walk(nodes)
  return map
}

function findFirstFile(nodes: FileNode[]): FileNode | null {
  for (const node of nodes) {
    if (node.type === 'file') return node
    if (node.children) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}

function getLanguageFromExtension(filename: string): string | undefined {
  if (filename.endsWith('.tsx')) return 'tsx'
  if (filename.endsWith('.ts')) return 'ts'
  if (filename.endsWith('.js')) return 'javascript'
  if (filename.endsWith('.json')) return 'json'
  if (filename.endsWith('.css')) return 'css'
  if (filename.endsWith('.html')) return 'html'
  return undefined
}

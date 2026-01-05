import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { previewService } from '@/lib/preview'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { EDITING_ENGINE_SYSTEM_PROMPT, EDITING_USER_PROMPT } from '@/lib/ai/prompts/editing-engine'

export const maxDuration = 60

const FileChangeSchema = z.object({
  action: z.enum(['update', 'create', 'delete']),
  path: z.string(),
  content: z.string().optional(),
})

const EditResponseSchema = z.object({
  thinking: z.string(),
  changes: z.array(FileChangeSchema),
  summary: z.string(),
})

function getRelevantFiles(prompt: string, files: Record<string, string>, context?: { selectedFile?: string }) {
  const relevant: Record<string, string> = {}
  const p = prompt.toLowerCase()

  const pick = (path: string) => {
    if (files[path]) relevant[path] = files[path]
  }

  if (p.includes('color') || p.includes('style') || p.includes('font')) {
    pick('src/index.css')
    pick('tailwind.config.js')
    pick('tailwind.config.ts')
  }
  if (p.includes('nav') || p.includes('menu') || p.includes('header')) {
    pick('src/components/Navigation.tsx')
  }
  if (p.includes('footer')) {
    pick('src/components/Footer.tsx')
  }
  if (p.includes('page') || p.includes('route')) {
    pick('src/App.tsx')
  }

  const sectionKeywords: Record<string, string> = {
    hero: 'HeroSection',
    feature: 'FeaturesSection',
    pricing: 'PricingSection',
    faq: 'FAQSection',
    testimonial: 'TestimonialsSection',
    cta: 'CTASection',
    contact: 'ContactSection',
    about: 'AboutSection',
    team: 'TeamSection',
    stat: 'StatsSection',
  }

  for (const [keyword, component] of Object.entries(sectionKeywords)) {
    if (p.includes(keyword)) {
      pick(`src/components/sections/${component}.tsx`)
    }
  }

  if (context?.selectedFile) {
    pick(context.selectedFile)
  }

  if (Object.keys(relevant).length === 0) {
    pick('src/index.css')
    pick('src/App.tsx')
    const firstPage = Object.keys(files).find((f) => f.startsWith('src/pages/'))
    if (firstPage) pick(firstPage)
  }

  return relevant
}

export async function POST(req: Request) {
  try {
    const { workspaceId, prompt, model, context } = await req.json()

    if (!workspaceId || !prompt) {
      return Response.json(
        { error: 'Missing workspaceId or prompt' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const modelId = getModelId(model || DEFAULT_MODEL)

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('ai_context, name')
      .eq('id', workspaceId)
      .single()

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const aiContext = workspace.ai_context as Record<string, unknown> | null
    const brand = aiContext?.brand as Record<string, unknown> | undefined
    const generatedFiles = (aiContext?.generated_files ||
      aiContext?.websiteFiles) as Record<string, string> | undefined

    if (!generatedFiles) {
      return Response.json(
        { error: 'No generated files found. Generate a website first.' },
        { status: 400 }
      )
    }

    const relevantFiles = getRelevantFiles(prompt, generatedFiles, context)

    const { object: result } = await generateObject({
      model: openrouter(modelId),
      schema: EditResponseSchema,
      system: EDITING_ENGINE_SYSTEM_PROMPT,
      prompt: EDITING_USER_PROMPT(prompt, relevantFiles, brand as any),
    })

    const updatedFiles = { ...generatedFiles }
    const applied: Array<{ path: string; action: string }> = []

    for (const change of result.changes) {
      if (change.action === 'delete') {
        delete updatedFiles[change.path]
      } else if (change.content) {
        updatedFiles[change.path] = change.content
      }
      applied.push({ path: change.path, action: change.action })
    }

    await supabase
      .from('workspaces')
      .update({
        ai_context: {
          ...aiContext,
          generated_files: updatedFiles,
          websiteFiles: updatedFiles,
        },
      })
      .eq('id', workspaceId)

    const session = await previewService.getActiveSession(workspaceId)
    if (session && session.status === 'running') {
      if (result.changes.length === 1 && result.changes[0].action !== 'delete') {
        await previewService.updateFile(workspaceId, result.changes[0].path, result.changes[0].content!)
      } else {
        await previewService.syncFiles(workspaceId, updatedFiles)
      }
    }

    return Response.json({
      success: true,
      thinking: result.thinking,
      summary: result.summary,
      changes: applied,
    })
  } catch (error) {
    console.error('edit-code error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to edit code' },
      { status: 500 }
    )
  }
}

import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Section item schema
const SectionItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  price: z.string().optional(),
  features: z.array(z.string()).optional(),
  question: z.string().optional(),
  answer: z.string().optional(),
})

// Image placeholder schema
const ImagePlaceholderSchema = z.object({
  alt: z.string(),
  description: z.string(),
})

// Layout variants
const LayoutSchema = z.enum([
  'centered',
  'split',
  'split-reverse',
  'grid',
  'stacked',
  'alternating',
  'minimal',
  'bold',
  'cards',
  'bento',
])

// Website section schema - matches website-generator.ts
const WebsiteSectionSchema = z.object({
  type: z.enum([
    'hero',
    'features',
    'benefits',
    'testimonials',
    'pricing',
    'faq',
    'team',
    'about',
    'cta',
    'gallery',
    'contact',
    'booking',
    'products',
    'stats',
    'process',
    'trust',
  ]),
  layout: LayoutSchema.optional(),
  darkSection: z.boolean().optional(),
  headline: z.string(),
  subheadline: z.string().optional(),
  content: z.string().optional(),
  items: z.array(SectionItemSchema).optional(),
  ctaText: z.string().optional(),
  ctaHref: z.string().optional(),
  image: ImagePlaceholderSchema.optional(),
  stats: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(),
  testimonials: z.array(z.object({
    quote: z.string(),
    author: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
  })).optional(),
})

export type WebsiteSection = z.infer<typeof WebsiteSectionSchema>

const EDIT_SYSTEM_PROMPT = `You are Ernest's website section editor. You modify website sections based on user requests while maintaining consistency with the brand and existing content.

Your job is to:
1. Make the specific changes the user requests
2. Keep everything else the same unless it needs to change for consistency
3. Maintain the existing layout and structure unless explicitly asked to change it
4. Preserve the brand voice and tone

Be precise and surgical - only change what the user asks for.`

export async function POST(req: Request) {
  try {
    const { workspaceId, pageSlug, sectionIndex, prompt, currentSection, model } = await req.json()

    if (!workspaceId || pageSlug === undefined || sectionIndex === undefined || !prompt) {
      return Response.json(
        { error: 'Missing required fields: workspaceId, pageSlug, sectionIndex, prompt' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const modelId = getModelId(model || DEFAULT_MODEL)

    // Get workspace context for brand info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('ai_context, name')
      .eq('id', workspaceId)
      .single()

    if (!workspace) {
      return Response.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const aiContext = workspace.ai_context as Record<string, unknown> | null
    const websiteData = aiContext?.website as { pages: Array<{ slug: string; sections: WebsiteSection[] }> } | undefined
    const brandData = aiContext?.brand as Record<string, unknown> | undefined

    if (!websiteData?.pages) {
      return Response.json({ error: 'No website data found' }, { status: 400 })
    }

    // Find the page and section
    const pageIndex = websiteData.pages.findIndex(p => p.slug === pageSlug)
    if (pageIndex === -1) {
      return Response.json({ error: `Page "${pageSlug}" not found` }, { status: 404 })
    }

    const page = websiteData.pages[pageIndex]
    if (sectionIndex < 0 || sectionIndex >= page.sections.length) {
      return Response.json({ error: `Section index ${sectionIndex} out of bounds` }, { status: 400 })
    }

    const existingSection = currentSection || page.sections[sectionIndex]

    // Generate the updated section
    const { object: updatedSection } = await generateObject({
      model: openrouter(modelId),
      schema: WebsiteSectionSchema,
      system: EDIT_SYSTEM_PROMPT,
      prompt: `Edit this website section based on the user's request.

CURRENT SECTION:
${JSON.stringify(existingSection, null, 2)}

BRAND CONTEXT:
- Business: ${workspace.name || 'Business'}
${brandData ? `- Voice: ${(brandData as Record<string, unknown>).voiceDescription || 'Professional'}` : ''}

USER REQUEST:
${prompt}

Return the complete updated section with the requested changes applied. Keep the same section type and structure unless the user explicitly asks to change it.`,
    })

    // Update the section in the website data
    const updatedPages = [...websiteData.pages]
    updatedPages[pageIndex] = {
      ...page,
      sections: page.sections.map((s, i) => i === sectionIndex ? updatedSection : s),
    }

    // Save to database
    const updatedAiContext = {
      ...aiContext,
      website: {
        ...websiteData,
        pages: updatedPages,
      },
    }

    const { error } = await supabase
      .from('workspaces')
      .update({
        ai_context: updatedAiContext,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    if (error) {
      console.error('Failed to save section:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      section: updatedSection,
      pageSlug,
      sectionIndex,
    })
  } catch (error) {
    console.error('Edit section error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Edit failed' },
      { status: 500 }
    )
  }
}

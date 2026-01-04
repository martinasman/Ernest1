import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const WebsiteSchema = z.object({
  pages: z.array(z.object({
    slug: z.string().describe('URL path like "home", "about", "contact"'),
    title: z.string().describe('Page title'),
    description: z.string().describe('Meta description for SEO'),
    sections: z.array(z.object({
      type: z.enum(['hero', 'features', 'cta', 'testimonials', 'faq', 'team', 'pricing', 'contact', 'about', 'gallery']),
      headline: z.string(),
      subheadline: z.string().optional(),
      content: z.string().optional(),
      items: z.array(z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string().optional(),
      })).optional(),
    })),
  })),
})

export async function POST(req: Request) {
  try {
    const { prompt, workspaceId, model } = await req.json()

    if (!workspaceId) {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const supabase = await createClient()
    const modelId = getModelId(model || DEFAULT_MODEL)

    // Get brand info for context
    const { data: brand } = await supabase
      .from('brands')
      .select('name, tagline, tone_of_voice')
      .eq('workspace_id', workspaceId)
      .single()

    const { object: website } = await generateObject({
      model: openrouter(modelId),
      schema: WebsiteSchema,
      system: `You are a web designer creating website content for a business.

${brand ? `
Brand: ${brand.name}
Tagline: ${brand.tagline}
Tone: ${brand.tone_of_voice}
` : ''}

Create website pages that:
1. Have compelling, clear headlines
2. Use persuasive but authentic copy
3. Include relevant sections for each page type
4. Are optimized for conversions
5. Match the brand's tone of voice

Generate at least Home, About, and Contact pages.`,
      prompt: `Create website content for: "${prompt}"`,
    })

    // Store in workspace ai_context
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('ai_context')
      .eq('id', workspaceId)
      .single()

    const existingContext = (workspace?.ai_context as Record<string, unknown>) || {}

    const { error } = await supabase
      .from('workspaces')
      .update({
        ai_context: {
          ...existingContext,
          website: website,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    if (error) {
      console.error('Failed to save website:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ website })
  } catch (error) {
    console.error('Website generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BrandSchema = z.object({
  name: z.string().describe('Business name'),
  tagline: z.string().describe('Short catchy tagline'),
  colors: z.object({
    primary: z.string().describe('Primary color hex code'),
    secondary: z.string().describe('Secondary color hex code'),
    accent: z.string().describe('Accent color hex code'),
    background: z.string().describe('Background color hex code'),
    foreground: z.string().describe('Text/foreground color hex code'),
  }),
  fonts: z.object({
    heading: z.string().describe('Google Font name for headings'),
    body: z.string().describe('Google Font name for body text'),
  }),
  tone_of_voice: z.enum(['professional', 'friendly', 'playful', 'authoritative', 'casual']),
  brand_values: z.array(z.string()).describe('3-5 core brand values'),
  border_radius: z.enum(['none', 'sm', 'md', 'lg', 'full']),
})

export async function POST(req: Request) {
  try {
    const { prompt, workspaceId, model } = await req.json()

    if (!workspaceId) {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const supabase = await createClient()
    const modelId = getModelId(model || DEFAULT_MODEL)

    const { object: brand } = await generateObject({
      model: openrouter(modelId),
      schema: BrandSchema,
      system: `You are a brand strategist creating a compelling brand identity for a new business.

Create a modern, memorable brand that:
1. Has a clear, professional business name (not generic)
2. Uses a harmonious color palette with proper contrast
3. Selects appropriate typography from Google Fonts
4. Defines a consistent tone of voice
5. Establishes 3-5 meaningful brand values

Use hex color codes (e.g., #2563eb). For fonts, use actual Google Font names like "Inter", "Poppins", "Playfair Display".`,
      prompt: `Create a complete brand identity for this business concept: "${prompt}"`,
    })

    // Save to database
    const { data: savedBrand, error } = await supabase
      .from('brands')
      .update({
        name: brand.name,
        tagline: brand.tagline,
        colors: brand.colors,
        fonts: brand.fonts,
        tone_of_voice: brand.tone_of_voice,
        brand_values: brand.brand_values,
        border_radius: brand.border_radius,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Failed to save brand:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Also update workspace name
    await supabase
      .from('workspaces')
      .update({
        name: brand.name,
        business_description: prompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    return Response.json({ brand: savedBrand })
  } catch (error) {
    console.error('Brand generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

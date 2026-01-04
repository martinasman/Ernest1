import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const OverviewSchema = z.object({
  problems: z.array(z.string()).describe('Top 3 problems this business solves'),
  existing_alternatives: z.string().describe('What alternatives exist in the market'),
  solutions: z.array(z.string()).describe('Key solutions/features offered'),
  unique_value_proposition: z.string().describe('Single clear value proposition statement'),
  high_level_concept: z.string().describe('X for Y analogy (e.g., "Uber for dog walking")'),
  unfair_advantage: z.string().describe('What cannot be easily copied or bought'),
  customer_segments: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  early_adopters: z.string().describe('Profile of ideal early adopter customers'),
  channels: z.array(z.string()).describe('Marketing and distribution channels'),
  revenue_streams: z.array(z.object({
    name: z.string(),
    type: z.enum(['one-time', 'recurring', 'transactional']),
    description: z.string(),
  })),
  key_metrics: z.array(z.string()).describe('Key performance indicators to track'),
  key_resources: z.array(z.string()).describe('Critical resources needed'),
  key_activities: z.array(z.string()).describe('Critical activities to perform'),
  key_partners: z.array(z.string()).describe('Key partnerships needed'),
  cost_structure: z.array(z.object({
    category: z.string(),
    items: z.array(z.string()),
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

    const { object: overview } = await generateObject({
      model: openrouter(modelId),
      schema: OverviewSchema,
      system: `You are a business strategist creating a lean canvas / business model overview.

Create a comprehensive yet practical business model that:
1. Identifies real problems worth solving
2. Proposes viable solutions
3. Defines clear customer segments
4. Outlines sustainable revenue streams
5. Identifies realistic costs and resources

Be specific and actionable, not generic. Think about what would actually work for this business.`,
      prompt: `Create a complete business model overview for: "${prompt}"`,
    })

    // Save to database
    const { data: savedOverview, error } = await supabase
      .from('overviews')
      .update({
        problems: overview.problems,
        existing_alternatives: overview.existing_alternatives,
        solutions: overview.solutions,
        unique_value_proposition: overview.unique_value_proposition,
        high_level_concept: overview.high_level_concept,
        unfair_advantage: overview.unfair_advantage,
        customer_segments: overview.customer_segments,
        early_adopters: overview.early_adopters,
        channels: overview.channels,
        revenue_streams: overview.revenue_streams,
        key_metrics: overview.key_metrics,
        key_resources: overview.key_resources,
        key_activities: overview.key_activities,
        key_partners: overview.key_partners,
        cost_structure: overview.cost_structure,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Failed to save overview:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ overview: savedOverview })
  } catch (error) {
    console.error('Overview generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

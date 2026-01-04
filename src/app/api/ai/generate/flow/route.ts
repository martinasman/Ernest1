import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const FlowSchema = z.object({
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['acquisition', 'activation', 'retention', 'revenue', 'referral']),
    description: z.string(),
    activities: z.array(z.string()),
    metrics: z.array(z.string()),
    tools: z.array(z.string()),
  })),
  connections: z.array(z.object({
    from: z.string(),
    to: z.string(),
    label: z.string().optional(),
  })),
  keyInsights: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    const { prompt, workspaceId, model } = await req.json()

    if (!workspaceId) {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const supabase = await createClient()
    const modelId = getModelId(model || DEFAULT_MODEL)

    // Get overview for context
    const { data: overview } = await supabase
      .from('overviews')
      .select('customer_segments, channels, revenue_streams')
      .eq('workspace_id', workspaceId)
      .single()

    const { object: flow } = await generateObject({
      model: openrouter(modelId),
      schema: FlowSchema,
      system: `You are a business process designer creating a customer journey flow.

${overview ? `
Existing business context:
- Customer segments: ${JSON.stringify(overview.customer_segments)}
- Channels: ${JSON.stringify(overview.channels)}
- Revenue streams: ${JSON.stringify(overview.revenue_streams)}
` : ''}

Create a business flow that:
1. Maps the complete customer journey (AARRR: Acquisition, Activation, Retention, Revenue, Referral)
2. Identifies key activities at each stage
3. Defines measurable metrics
4. Suggests tools needed at each stage
5. Shows clear connections between stages`,
      prompt: `Create a business flow diagram for: "${prompt}"`,
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
          flow: flow,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    if (error) {
      console.error('Failed to save flow:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ flow })
  } catch (error) {
    console.error('Flow generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

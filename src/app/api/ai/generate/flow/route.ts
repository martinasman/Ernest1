import { createClient } from '@/lib/supabase/server'
import { generateFlow, flowToReactFlow, type Flow } from '@/lib/ai/generation'
import type { BusinessPlan } from '@/lib/ai/generation'

export async function POST(req: Request) {
  try {
    const { prompt, workspaceId, model, plan: providedPlan } = await req.json()

    if (!workspaceId) {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the plan from the request or fetch from workspace ai_context
    let plan: BusinessPlan | null = providedPlan

    if (!plan) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('ai_context')
        .eq('id', workspaceId)
        .single()

      plan = (workspace?.ai_context as { businessPlan?: BusinessPlan })?.businessPlan || null
    }

    if (!plan) {
      return Response.json(
        { error: 'No business plan found. Generate a plan first.' },
        { status: 400 }
      )
    }

    // Generate flow using the new pipeline
    const flow = await generateFlow(plan, model)

    // Convert to React Flow format for visualization
    const reactFlowData = flowToReactFlow(flow)

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
          flowReactFlow: reactFlowData,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    if (error) {
      console.error('Failed to save flow:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      flow,
      reactFlow: reactFlowData,
      insights: flow.keyInsights
    })
  } catch (error) {
    console.error('Flow generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

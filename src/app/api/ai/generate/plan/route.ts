import { createClient } from '@/lib/supabase/server'
import { generateBusinessPlan, getPlanSummary, type BusinessPlan } from '@/lib/ai/generation'

export async function POST(req: Request) {
  try {
    const { prompt, workspaceId, model } = await req.json()

    if (!workspaceId) {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    if (!prompt) {
      return Response.json({ error: 'Missing prompt' }, { status: 400 })
    }

    // Generate the business plan
    const plan = await generateBusinessPlan(prompt, model)

    // Save plan to workspace ai_context
    const supabase = await createClient()
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('ai_context')
      .eq('id', workspaceId)
      .single()

    const existingContext = (workspace?.ai_context as Record<string, unknown>) || {}

    // Reset stale generated artifacts when creating a new plan
    const cleanedContext = {
      ...existingContext,
      businessPlan: plan,
      website: null,
      flow: null,
      flowReactFlow: null,
    }

    const { error } = await supabase
      .from('workspaces')
      .update({
        ai_context: cleanedContext,
        business_description: prompt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    if (error) {
      console.error('Failed to save plan:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      plan,
      summary: getPlanSummary(plan)
    })
  } catch (error) {
    console.error('Plan generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

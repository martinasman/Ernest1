import { createClient } from '@/lib/supabase/server'
import { generateWebsite, type Website } from '@/lib/ai/generation'
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

    // Fetch brand data from brands table
    const { data: brand } = await supabase
      .from('brands')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    // Fetch overview data from overviews table
    const { data: overview } = await supabase
      .from('overviews')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    // Generate website using the new pipeline with brand and overview context
    const website = await generateWebsite(plan, brand, overview, model)

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

    return Response.json({
      website,
      pageCount: website.pages.length,
      pages: website.pages.map(p => ({ slug: p.slug, title: p.title }))
    })
  } catch (error) {
    console.error('Website generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

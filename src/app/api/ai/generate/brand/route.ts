import { createClient } from '@/lib/supabase/server'
import { generateBrand, generateBrandCSS, type Brand } from '@/lib/ai/generation'
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

    // Generate brand using the new pipeline
    const brand = await generateBrand(plan, undefined, model)

    // Map to database schema (the new brand has more fields)
    const dbBrand = {
      name: brand.name,
      tagline: brand.tagline,
      colors: {
        primary: brand.colors.primary,
        primaryLight: brand.colors.primaryLight,
        primaryDark: brand.colors.primaryDark,
        secondary: brand.colors.secondary,
        secondaryLight: brand.colors.secondaryLight,
        accent: brand.colors.accent,
        background: brand.colors.background,
        foreground: brand.colors.foreground,
        muted: brand.colors.muted,
        mutedForeground: brand.colors.mutedForeground,
        success: brand.colors.success,
        warning: brand.colors.warning,
        destructive: brand.colors.destructive,
      },
      fonts: {
        heading: brand.fonts.heading,
        headingWeight: brand.fonts.headingWeight,
        body: brand.fonts.body,
        bodyWeight: brand.fonts.bodyWeight,
      },
      tone_of_voice: brand.toneOfVoice.formality,
      brand_values: brand.values,
      border_radius: brand.borderRadius,
      updated_at: new Date().toISOString(),
    }

    // Save to database
    const { data: savedBrand, error } = await supabase
      .from('brands')
      .update(dbBrand)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) {
      console.error('Failed to save brand:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Fetch existing ai_context so we can persist the full brand for previews/exports
    const { data: workspaceContext } = await supabase
      .from('workspaces')
      .select('ai_context')
      .eq('id', workspaceId)
      .single()

    const existingContext = (workspaceContext?.ai_context as Record<string, unknown>) || {}

    // Also update workspace name and ai_context.brand for downstream generators
    await supabase
      .from('workspaces')
      .update({
        name: brand.name,
        business_description: prompt || plan.business.description,
        ai_context: {
          ...existingContext,
          brand,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', workspaceId)

    // Generate CSS from brand for immediate use in preview
    const brandCSS = generateBrandCSS(brand)

    return Response.json({ brand: savedBrand, fullBrand: brand, brandCSS })
  } catch (error) {
    console.error('Brand generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { generateWebsite, type GeneratedWebsite, type PageProgressCallback } from '@/lib/ai/generation'
import type { BusinessPlan } from '@/lib/ai/generation'

export const maxDuration = 300 // 5 minutes - generating multiple pages takes time

export async function POST(req: Request) {
  try {
    const { workspaceId, model, plan: providedPlan } = await req.json()

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

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Helper to send SSE event
    const sendEvent = async (event: string, data: unknown) => {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
    }

    // Progress callback for streaming updates
    const onProgress: PageProgressCallback = async (update) => {
      try {
        await sendEvent('progress', update)
      } catch {
        // Stream may be closed, ignore
      }
    }

    // Start generation in background
    ;(async () => {
      try {
        // Generate website with actual React code
        const website = await generateWebsite(plan!, brand, overview, model, workspaceId, onProgress)

        // Get or create website record
        let websiteRecord = await getOrCreateWebsiteRecord(supabase, workspaceId)

        // Save each page's code to website_pages table
        for (const page of website.pages) {
          await supabase.from('website_pages').upsert(
            {
              website_id: websiteRecord.id,
              workspace_id: workspaceId,
              slug: page.slug,
              title: page.title,
              code: page.code,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'website_id,slug' }
          )
        }

        // Update website record
        await supabase
          .from('websites')
          .update({
            status: 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', websiteRecord.id)

        // Store complete file bundle in ai_context for preview sync
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('ai_context')
          .eq('id', workspaceId)
          .single()

        const existingContext = (workspace?.ai_context as Record<string, unknown>) || {}

        // Remove old website JSON structure, keep only websiteFiles
        const { website: _oldWebsite, ...restContext } = existingContext as { website?: unknown } & Record<string, unknown>

        const { error: updateError } = await supabase
          .from('workspaces')
          .update({
            ai_context: {
              ...restContext,
              websiteFiles: website.files,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', workspaceId)

        if (updateError) {
          await sendEvent('error', { message: updateError.message })
        } else {
          await sendEvent('complete', {
            success: true,
            pageCount: website.pages.length,
            fileCount: Object.keys(website.files).length,
            pages: website.pages.map(p => ({ slug: p.slug, title: p.title })),
          })
        }
      } catch (error) {
        console.error('Website generation error:', error)
        await sendEvent('error', {
          message: error instanceof Error ? error.message : 'Generation failed',
        })
      } finally {
        await writer.close()
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Website generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

/**
 * Get existing website record or create a new one
 */
async function getOrCreateWebsiteRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string
) {
  // Try to get existing website
  const { data: existingWebsite } = await supabase
    .from('websites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (existingWebsite) {
    return existingWebsite
  }

  // Create new website record
  const { data: newWebsite, error } = await supabase
    .from('websites')
    .insert({
      workspace_id: workspaceId,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create website record: ${error.message}`)
  }

  return newWebsite
}

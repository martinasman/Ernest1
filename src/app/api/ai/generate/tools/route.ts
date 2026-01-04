import { generateObject } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getDefaultUI } from '@/lib/ai/schema-generator'

const ToolsSchema = z.object({
  tools: z.array(z.object({
    name: z.string().describe('Human-readable tool name'),
    slug: z.string().describe('URL-safe identifier (lowercase, hyphens)'),
    description: z.string().describe('What this tool does'),
    icon: z.string().describe('Lucide icon name'),
    tool_type: z.string().describe('Category like crm, inventory, tasks'),
    schema: z.object({
      fields: z.array(z.object({
        name: z.string().describe('snake_case field identifier'),
        type: z.enum([
          'text', 'email', 'phone', 'url',
          'number', 'currency', 'percentage',
          'date', 'datetime', 'time',
          'select', 'multiselect',
          'boolean',
          'richtext', 'textarea',
          'file', 'image',
        ]),
        label: z.string(),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
      })),
      indexes: z.array(z.string()),
      primaryDisplay: z.string(),
    }),
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

    // Get overview for context
    const { data: overview } = await supabase
      .from('overviews')
      .select('customer_segments, revenue_streams, key_activities')
      .eq('workspace_id', workspaceId)
      .single()

    const { object: result } = await generateObject({
      model: openrouter(modelId),
      schema: ToolsSchema,
      system: `You are creating internal business tools for a company.

${overview ? `
Business context:
- Customer segments: ${JSON.stringify(overview.customer_segments)}
- Revenue streams: ${JSON.stringify(overview.revenue_streams)}
- Key activities: ${JSON.stringify(overview.key_activities)}
` : ''}

Create 2-3 essential internal tools that:
1. Address real operational needs of this business
2. Have practical, useful fields
3. Use appropriate field types
4. Include status fields where workflow tracking makes sense
5. Use Lucide icon names (e.g., users, clipboard-list, package, dollar-sign)

Common tool types: crm, tasks, inventory, orders, contacts, products, appointments, projects`,
      prompt: `Create essential internal tools for: "${prompt}"`,
    })

    // Save each tool to database
    const savedTools = []

    for (const tool of result.tools) {
      const uiDefinition = getDefaultUI(tool.schema)

      const { data: savedTool, error } = await supabase
        .from('internal_tools')
        .insert({
          workspace_id: workspaceId,
          name: tool.name,
          slug: tool.slug,
          description: tool.description,
          icon: tool.icon,
          tool_type: tool.tool_type,
          schema_definition: tool.schema,
          ui_definition: uiDefinition,
          connections: [],
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save tool:', error)
      } else {
        savedTools.push(savedTool)
      }
    }

    return Response.json({ tools: savedTools })
  } catch (error) {
    console.error('Tools generation error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import type { BusinessPlan } from '@/lib/ai/generation'

export async function POST(req: Request) {
  try {
    const { workspaceId } = await req.json()

    if (!workspaceId) {
      return Response.json({ error: 'Missing workspaceId' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get the business plan from workspace ai_context
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('ai_context')
      .eq('id', workspaceId)
      .single()

    const plan = (workspace?.ai_context as { businessPlan?: BusinessPlan })?.businessPlan

    if (!plan?.suggestedTools || plan.suggestedTools.length === 0) {
      return Response.json(
        { error: 'No suggested tools in business plan. Generate a plan first.' },
        { status: 400 }
      )
    }

    // CRITICAL: Delete existing tools for this workspace before creating new ones
    // This prevents tools from accumulating across multiple generation sessions
    const { error: deleteError } = await supabase
      .from('internal_tools')
      .delete()
      .eq('workspace_id', workspaceId)

    if (deleteError) {
      console.error('Failed to delete existing tools:', deleteError)
    }

    // Create tools from the plan's suggestedTools
    const savedTools = []

    for (const tool of plan.suggestedTools) {
      // Build schema with indexes and primaryDisplay
      const schemaDefinition = {
        fields: tool.schema.fields,
        indexes: ['created_at'],
        primaryDisplay: tool.schema.fields[0]?.name || 'name',
      }

      // Generate UI definition based on schema and view type
      const uiDefinition = generateUIFromSchema(schemaDefinition, tool.viewType)

      const { data: savedTool, error } = await supabase
        .from('internal_tools')
        .insert({
          workspace_id: workspaceId,
          name: tool.name,
          slug: tool.slug,
          description: tool.description,
          icon: tool.icon,
          tool_type: tool.viewType,
          schema_definition: schemaDefinition,
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

// View configuration types
interface ViewConfig {
  columns?: string[]
  groupBy?: string
  dateField?: string
  titleField?: string
  descriptionField?: string
}

interface UIView {
  name: string
  type: string
  config: ViewConfig
}

interface UIDefinition {
  views: UIView[]
  defaultView: string
  detailLayout: {
    sections: Array<{
      title: string
      fields: string[]
    }>
  }
}

// Generate UI definition based on schema and view type
function generateUIFromSchema(
  schema: { fields: Array<{ name: string; type: string; label: string }> },
  viewType: string
): UIDefinition {
  // Get columns for table view (first 5 non-id fields)
  const columns = schema.fields
    .filter(f => !['id', 'created_at', 'updated_at'].includes(f.name))
    .slice(0, 5)
    .map(f => f.name)

  // Find status and date fields for special views
  const statusField = schema.fields.find(f => f.name === 'status' || f.type === 'select')
  const dateField = schema.fields.find(f => ['date', 'datetime', 'time'].includes(f.type))

  const baseUI: UIDefinition = {
    views: [
      {
        name: 'All Records',
        type: 'table',
        config: { columns },
      },
    ],
    defaultView: 'All Records',
    detailLayout: {
      sections: [
        {
          title: 'Details',
          fields: schema.fields.map(f => f.name),
        },
      ],
    },
  }

  // Add view-type specific configuration
  if (viewType === 'kanban' && statusField) {
    baseUI.views.push({
      name: 'Board',
      type: 'kanban',
      config: {
        groupBy: statusField.name,
        columns,
      },
    })
    baseUI.defaultView = 'Board'
  }

  if (viewType === 'calendar' && dateField) {
    baseUI.views.push({
      name: 'Calendar',
      type: 'calendar',
      config: {
        dateField: dateField.name,
        titleField: columns[0],
      },
    })
    baseUI.defaultView = 'Calendar'
  }

  if (viewType === 'cards') {
    baseUI.views.push({
      name: 'Cards',
      type: 'cards',
      config: {
        titleField: columns[0],
        descriptionField: columns[1],
      },
    })
    baseUI.defaultView = 'Cards'
  }

  return baseUI
}

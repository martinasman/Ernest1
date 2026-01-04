import { generateObject } from 'ai'
import { z } from 'zod'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

// Schema for different overview field types
const FieldSchemas = {
  problems: z.array(z.string()),
  solutions: z.array(z.string()),
  unique_value_proposition: z.string(),
  unfair_advantage: z.string(),
  customer_segments: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  key_metrics: z.array(z.string()),
  channels: z.array(z.string()),
  cost_structure: z.array(z.object({
    name: z.string(),
    type: z.string().optional(),
    amount: z.number().optional(),
  })),
  revenue_streams: z.array(z.object({
    name: z.string(),
    type: z.string(),
    price: z.number().optional(),
  })),
} as const

type FieldName = keyof typeof FieldSchemas

const FIELD_LABELS: Record<FieldName, string> = {
  problems: 'Problems',
  solutions: 'Solutions',
  unique_value_proposition: 'Unique Value Proposition',
  unfair_advantage: 'Unfair Advantage',
  customer_segments: 'Customer Segments',
  key_metrics: 'Key Metrics',
  channels: 'Channels',
  cost_structure: 'Cost Structure',
  revenue_streams: 'Revenue Streams',
}

const EDIT_SYSTEM_PROMPT = `You are Ernest's business overview editor. You modify lean canvas fields based on user requests while maintaining consistency with the overall business model.

Your job is to:
1. Make the specific changes the user requests
2. Keep existing items unless the user asks to remove or replace them
3. Ensure new content fits the field's purpose
4. Be concise and actionable

Be precise and surgical - only change what the user asks for.`

export async function POST(req: Request) {
  try {
    const { workspaceId, field, prompt, currentValue, model } = await req.json()

    if (!workspaceId || !field || !prompt) {
      return Response.json(
        { error: 'Missing required fields: workspaceId, field, prompt' },
        { status: 400 }
      )
    }

    if (!(field in FieldSchemas)) {
      return Response.json(
        { error: `Invalid field: ${field}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const modelId = getModelId(model || DEFAULT_MODEL)

    // Get current overview
    const { data: overview, error: fetchError } = await supabase
      .from('overviews')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (fetchError || !overview) {
      return Response.json({ error: 'Overview not found' }, { status: 404 })
    }

    const fieldName = field as FieldName
    const existingValue = currentValue || overview[fieldName]
    const fieldLabel = FIELD_LABELS[fieldName]

    // Generate the updated field value
    const schema = z.object({
      value: FieldSchemas[fieldName],
    })

    const { object: result } = await generateObject({
      model: openrouter(modelId),
      schema,
      system: EDIT_SYSTEM_PROMPT,
      prompt: `Edit the "${fieldLabel}" field based on the user's request.

CURRENT VALUE:
${JSON.stringify(existingValue, null, 2)}

USER REQUEST:
${prompt}

Return the complete updated value for this field. If the user asks to add something, include both existing items and the new item. If they ask to change something, modify the relevant item.`,
    })

    // Update the overview in the database
    const updateData = {
      [fieldName]: result.value,
      updated_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('overviews')
      .update(updateData)
      .eq('workspace_id', workspaceId)

    if (updateError) {
      console.error('Failed to save overview:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      field: fieldName,
      value: result.value,
    })
  } catch (error) {
    console.error('Edit overview error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Edit failed' },
      { status: 500 }
    )
  }
}

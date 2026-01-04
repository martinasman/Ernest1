import { generateObject } from 'ai'
import { openrouter, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { z } from 'zod'

// Field definition schema
const FieldSchema = z.object({
  name: z.string().describe('Snake_case field identifier'),
  type: z.enum([
    'text', 'email', 'phone', 'url',
    'number', 'currency', 'percentage',
    'date', 'datetime', 'time',
    'select', 'multiselect',
    'boolean',
    'richtext', 'textarea',
    'file', 'image',
    'relation'
  ]).describe('Field data type'),
  label: z.string().describe('Human-readable label'),
  required: z.boolean().default(false),
  unique: z.boolean().optional(),
  default: z.any().optional(),
  options: z.array(z.string()).optional().describe('For select/multiselect types'),
  relationTo: z.string().optional().describe('For relation type - target tool slug'),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional()
  }).optional()
})

// Tool schema definition
const ToolSchemaSchema = z.object({
  fields: z.array(FieldSchema),
  indexes: z.array(z.string()).describe('Fields to index for fast lookup'),
  primaryDisplay: z.string().describe('Main field shown in lists'),
  defaultSort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  }).optional()
})

// UI definition schema
const UIDefinitionSchema = z.object({
  views: z.array(z.object({
    name: z.string(),
    type: z.enum(['table', 'kanban', 'calendar', 'gallery', 'list']),
    config: z.record(z.string(), z.any()).describe('View-specific configuration')
  })),
  defaultView: z.string(),
  detailLayout: z.object({
    sections: z.array(z.object({
      title: z.string(),
      fields: z.array(z.string())
    }))
  }),
  actions: z.array(z.object({
    name: z.string(),
    label: z.string(),
    icon: z.string().describe('Lucide icon name'),
    type: z.enum(['button', 'menu']).optional()
  })).optional()
})

// Full tool spec
const ToolSpecSchema = z.object({
  name: z.string().describe('Human-readable tool name'),
  slug: z.string().describe('URL-safe identifier'),
  description: z.string().describe('What this tool does'),
  icon: z.string().describe('Lucide icon name'),
  schema: ToolSchemaSchema,
  ui: UIDefinitionSchema,
  connections: z.array(z.object({
    sourceTable: z.string(),
    sourceField: z.string(),
    relationship: z.enum(['one-to-one', 'one-to-many', 'many-to-many'])
  })).describe('Connections to other tools')
})

export type GeneratedToolSpec = z.infer<typeof ToolSpecSchema>
export type SchemaDefinition = z.infer<typeof ToolSchemaSchema>
export type UIDefinition = z.infer<typeof UIDefinitionSchema>

interface GenerateToolOptions {
  request: string
  businessContext: string
  existingTools?: Array<{ name: string; slug: string; schema: any }>
}

export async function generateToolSchema(options: GenerateToolOptions): Promise<GeneratedToolSpec> {
  const { request, businessContext, existingTools = [] } = options

  const { object } = await generateObject({
    model: openrouter(DEFAULT_MODEL),
    schema: ToolSpecSchema,
    system: `You are generating a schema for an internal business tool. Create something practical and useful that fits the business context.

${businessContext}

${existingTools.length > 0 ? `
## Existing Tools
${existingTools.map(t => `- ${t.name} (${t.slug}): Fields: ${t.schema?.fields?.map((f: any) => f.name).join(', ') || 'none'}`).join('\n')}
` : ''}

## Guidelines
1. Use appropriate field types for the data
2. Include sensible validation where needed
3. Create useful views:
   - Table view is always good for data management
   - Kanban for status-based workflows
   - Calendar for date-based data
   - Gallery for visual content
4. Suggest connections to existing tools when relevant
5. Add practical actions (email, export, etc)
6. Use clear, user-friendly labels
7. Make field names snake_case
8. Choose appropriate icons from Lucide`,
    prompt: `Create a tool based on this request: "${request}"

Think about:
- What fields would be most useful for this type of data?
- What views make sense for this data?
- How does this connect to existing business data?
- What actions would users want to take?`
  })

  return object
}

// Generate a simple schema for common tool types
export function getDefaultSchema(toolType: string): SchemaDefinition {
  const schemas: Record<string, SchemaDefinition> = {
    crm: {
      fields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'email', type: 'email', label: 'Email', required: true, unique: true },
        { name: 'phone', type: 'phone', label: 'Phone', required: false },
        { name: 'company', type: 'text', label: 'Company', required: false },
        { name: 'status', type: 'select', label: 'Status', required: false, options: ['lead', 'prospect', 'customer', 'churned'], default: 'lead' },
        { name: 'value', type: 'currency', label: 'Deal Value', required: false },
        { name: 'notes', type: 'richtext', label: 'Notes', required: false }
      ],
      indexes: ['email', 'status'],
      primaryDisplay: 'name',
      defaultSort: { field: 'created_at', direction: 'desc' }
    },
    tasks: {
      fields: [
        { name: 'title', type: 'text', label: 'Title', required: true },
        { name: 'description', type: 'textarea', label: 'Description', required: false },
        { name: 'status', type: 'select', label: 'Status', required: false, options: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
        { name: 'priority', type: 'select', label: 'Priority', required: false, options: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        { name: 'due_date', type: 'date', label: 'Due Date', required: false },
        { name: 'assignee', type: 'text', label: 'Assignee', required: false }
      ],
      indexes: ['status', 'priority'],
      primaryDisplay: 'title',
      defaultSort: { field: 'due_date', direction: 'asc' }
    },
    inventory: {
      fields: [
        { name: 'name', type: 'text', label: 'Product Name', required: true },
        { name: 'sku', type: 'text', label: 'SKU', required: false, unique: true },
        { name: 'quantity', type: 'number', label: 'Quantity', required: false, default: 0 },
        { name: 'price', type: 'currency', label: 'Price', required: false },
        { name: 'category', type: 'select', label: 'Category', required: false, options: ['electronics', 'clothing', 'food', 'other'] },
        { name: 'image', type: 'image', label: 'Image', required: false },
        { name: 'description', type: 'textarea', label: 'Description', required: false }
      ],
      indexes: ['sku', 'category'],
      primaryDisplay: 'name',
      defaultSort: { field: 'name', direction: 'asc' }
    }
  }

  return schemas[toolType] || schemas.tasks
}

export function getDefaultUI(schema: SchemaDefinition): UIDefinition {
  const hasStatus = schema.fields.some(f => f.name === 'status' && f.type === 'select')
  const hasDate = schema.fields.some(f => f.type === 'date' || f.type === 'datetime')
  const hasImage = schema.fields.some(f => f.type === 'image')

  const views: UIDefinition['views'] = [
    {
      name: 'table',
      type: 'table',
      config: {
        columns: schema.fields.slice(0, 5).map(f => f.name),
        sortable: true,
        filterable: true
      }
    }
  ]

  if (hasStatus) {
    const statusField = schema.fields.find(f => f.name === 'status')
    views.push({
      name: 'kanban',
      type: 'kanban',
      config: {
        groupBy: 'status',
        columns: statusField?.options || [],
        cardFields: [schema.primaryDisplay, 'created_at']
      }
    })
  }

  if (hasDate) {
    const dateField = schema.fields.find(f => f.type === 'date' || f.type === 'datetime')
    views.push({
      name: 'calendar',
      type: 'calendar',
      config: {
        dateField: dateField?.name,
        titleField: schema.primaryDisplay
      }
    })
  }

  if (hasImage) {
    views.push({
      name: 'gallery',
      type: 'gallery',
      config: {
        imageField: schema.fields.find(f => f.type === 'image')?.name,
        titleField: schema.primaryDisplay
      }
    })
  }

  // Group fields into sections
  const sections: { title: string; fields: string[] }[] = []
  const basicFields = schema.fields.filter(f => !['richtext', 'textarea', 'file', 'image'].includes(f.type)).map(f => f.name)
  const detailFields = schema.fields.filter(f => ['richtext', 'textarea'].includes(f.type)).map(f => f.name)
  const mediaFields = schema.fields.filter(f => ['file', 'image'].includes(f.type)).map(f => f.name)

  if (basicFields.length) sections.push({ title: 'Basic Info', fields: basicFields })
  if (detailFields.length) sections.push({ title: 'Details', fields: detailFields })
  if (mediaFields.length) sections.push({ title: 'Media', fields: mediaFields })

  return {
    views,
    defaultView: 'table',
    detailLayout: { sections },
    actions: [
      { name: 'edit', label: 'Edit', icon: 'pencil' },
      { name: 'delete', label: 'Delete', icon: 'trash-2' }
    ]
  }
}

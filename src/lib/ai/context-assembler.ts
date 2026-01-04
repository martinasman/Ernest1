import { createClient } from '@/lib/supabase/server'

interface ContextAssemblerOptions {
  workspaceId: string
  query: string
  maxTokens?: number
  includeHistory?: boolean
  contextType?: string
}

interface AssembledContext {
  systemContext: string
  businessContext: string
  totalTokens: number
}

// Simple token estimation (roughly 4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '...'
}

export async function assembleContext(options: ContextAssemblerOptions): Promise<AssembledContext> {
  const {
    workspaceId,
    maxTokens = 8000,
    contextType
  } = options

  const supabase = await createClient()

  // Budget allocation
  const systemBudget = Math.floor(maxTokens * 0.3)
  const businessBudget = Math.floor(maxTokens * 0.7)

  // Fetch core business context
  const [workspaceResult, brandResult, overviewResult, toolsResult] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', workspaceId).single(),
    supabase.from('brands').select('*').eq('workspace_id', workspaceId).single(),
    supabase.from('overviews').select('*').eq('workspace_id', workspaceId).single(),
    supabase.from('internal_tools').select('name, slug, description, schema_definition, tool_type').eq('workspace_id', workspaceId)
  ])

  const workspace = workspaceResult.data
  const brand = brandResult.data
  const overview = overviewResult.data
  const tools = toolsResult.data || []

  // Build system context
  const systemContext = buildSystemContext(contextType)

  // Build business context
  const businessContext = buildBusinessContext({
    workspace,
    brand,
    overview,
    tools,
    contextType
  })

  const totalTokens = estimateTokens(systemContext + businessContext)

  return {
    systemContext: truncateToTokenLimit(systemContext, systemBudget),
    businessContext: truncateToTokenLimit(businessContext, businessBudget),
    totalTokens
  }
}

function buildSystemContext(contextType?: string): string {
  return `You are Ernest, an AI assistant that helps users build and run their businesses. You have full context of this business and can:

1. **Edit Components**: Modify any part of the business (website, brand, flows, internal tools)
2. **Generate New Things**: Create pages, internal tools, content, and more
3. **Answer Questions**: Provide insights about the business data
4. **Take Actions**: Send emails, create invoices, manage data

## Guidelines
- Always confirm before making significant changes
- Explain what you're doing and why
- Reference specific data when relevant
- Ask clarifying questions when needed
- Be concise but helpful

${contextType ? `## Current Focus: ${contextType}` : ''}`
}

function buildBusinessContext({
  workspace,
  brand,
  overview,
  tools,
  contextType
}: {
  workspace: any
  brand: any
  overview: any
  tools: any[]
  contextType?: string
}): string {
  let context = ''

  if (workspace) {
    context += `
## Business Information
- **Name**: ${workspace.name}
- **Type**: ${workspace.business_type || 'Not specified'}
- **Description**: ${workspace.business_description || 'No description'}
- **Target Market**: ${workspace.target_market || 'Not specified'}
- **Country**: ${workspace.country_code || 'US'}
`
  }

  if (brand) {
    context += `
## Brand Identity
- **Brand Name**: ${brand.name}
- **Tagline**: ${brand.tagline || 'None'}
- **Tone**: ${brand.tone_of_voice || 'professional'}
- **Values**: ${brand.brand_values?.join(', ') || 'None specified'}
- **Primary Color**: ${brand.colors?.primary || '#2563eb'}
- **Font**: ${brand.fonts?.heading || 'Inter'}
`
  }

  if (overview) {
    context += `
## Business Model
- **Value Proposition**: ${overview.unique_value_proposition || 'Not defined'}
- **Problems Solved**: ${overview.problems?.join('; ') || 'None listed'}
- **Solutions**: ${overview.solutions?.join('; ') || 'None listed'}
- **Customer Segments**: ${JSON.stringify(overview.customer_segments) || '[]'}
- **Revenue Streams**: ${JSON.stringify(overview.revenue_streams) || '[]'}
`
  }

  if (tools && tools.length > 0) {
    context += `
## Available Internal Tools
${tools.map((t: any) => {
      const fields = t.schema_definition?.fields?.map((f: any) => f.name).join(', ') || 'No fields'
      return `- **${t.name}** (${t.slug}): ${t.description || 'No description'} [Fields: ${fields}]`
    }).join('\n')}
`
  }

  return context
}

export async function getRecentMessages(workspaceId: string, limit: number = 10) {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!messages?.length) return []

  return messages.reverse()
}

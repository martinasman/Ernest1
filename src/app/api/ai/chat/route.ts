import { streamText } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { assembleContext } from '@/lib/ai/context-assembler'

export const maxDuration = 60

// Normalize message content to plain string (handles arrays and raw JSON)
function normalizeMessageContent(content: any): string {
  if (typeof content === 'string') {
    // Handle raw JSON strings that look like arrays
    if (content.trim().startsWith('[') && content.includes('"type":"text"')) {
      try {
        const arr = JSON.parse(content)
        if (Array.isArray(arr)) {
          return arr
            .filter((p: any) => p.type === 'text' && p.text)
            .map((p: any) => p.text)
            .join('')
        }
      } catch {
        // Not valid JSON, return as-is
      }
    }
    return content
  }
  if (Array.isArray(content)) {
    return content
      .filter((p: any) => p.type === 'text' && p.text)
      .map((p: any) => p.text)
      .join('')
  }
  return String(content || '')
}

export async function POST(req: Request) {
  const { messages, workspaceId, model, isPlanMode } = await req.json()

  if (!workspaceId) {
    return new Response('Missing workspaceId', { status: 400 })
  }

  const supabase = await createClient()

  // Use provided model or default
  const modelId = getModelId(model || DEFAULT_MODEL)

  // Assemble context for AI
  const context = await assembleContext({
    workspaceId,
    query: messages[messages.length - 1]?.content || '',
  })

  // Build system prompt
  let systemPrompt = `${context.systemContext}

${context.businessContext}

You are Ernest, an AI assistant for business management. Help users with their questions and tasks.
Be concise and helpful. Reference the business context when relevant.`

  // Add plan mode instructions when active
  if (isPlanMode) {
    systemPrompt += `

## PLAN MODE ACTIVE

You are in PLAN MODE. Your response MUST follow these rules:

1. **DO NOT** execute any actions, make changes, or generate code
2. **ONLY** create a detailed plan of what you would do
3. Format your plan as a clear numbered list with:
   - Each step clearly described
   - Expected outcomes for each step
   - Any decisions that need user input
4. Start with a brief summary of what the user wants to achieve
5. End by asking if the user wants to proceed with this plan or make modifications

Remember: In plan mode, you are ONLY planning, not executing. The user will click "Go with plan" to execute after reviewing.`
  }

  // Normalize all message content to plain strings before sending to API
  const normalizedMessages = messages.map((m: any) => ({
    role: m.role,
    content: normalizeMessageContent(m.content)
  }))

  // Stream the response
  const result = streamText({
    model: openrouter(modelId),
    system: systemPrompt,
    messages: normalizedMessages,
    onFinish: async ({ response }) => {
      // Save conversation to database
      try {
        // Get or create conversation
        let { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('context_type', 'general')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!conversation) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ workspace_id: workspaceId, context_type: 'general' })
            .select()
            .single()
          conversation = newConv
        }

        if (conversation) {
          const lastUserMessage = messages[messages.length - 1]
          await supabase.from('messages').insert([
            {
              conversation_id: conversation.id,
              workspace_id: workspaceId,
              role: 'user',
              content: lastUserMessage.content
            },
            {
              conversation_id: conversation.id,
              workspace_id: workspaceId,
              role: 'assistant',
              content: response.messages.map((m: any) => {
                if (typeof m.content === 'string') return m.content
                if (Array.isArray(m.content)) {
                  return m.content
                    .filter((p: any) => p.type === 'text' && p.text)
                    .map((p: any) => p.text)
                    .join('')
                }
                return ''
              }).join('\n')
            }
          ])
        }
      } catch (err) {
        console.error('Failed to save conversation:', err)
      }
    }
  })

  return result.toTextStreamResponse()
}

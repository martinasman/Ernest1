import { streamText } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { assembleContext } from '@/lib/ai/context-assembler'

export const maxDuration = 60

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

  // Stream the response
  const result = streamText({
    model: openrouter(modelId),
    system: systemPrompt,
    messages,
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
              content: response.messages.map((m: any) =>
                typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
              ).join('\n')
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

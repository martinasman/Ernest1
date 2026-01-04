import { streamText } from 'ai'
import { openrouter, getModelId, DEFAULT_MODEL } from '@/lib/ai/openrouter'
import { createClient } from '@/lib/supabase/server'
import { assembleContext } from '@/lib/ai/context-assembler'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, workspaceId, model } = await req.json()

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
  const systemPrompt = `${context.systemContext}

${context.businessContext}

You are Ernest, an AI assistant for business management. Help users with their questions and tasks.
Be concise and helpful. Reference the business context when relevant.`

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

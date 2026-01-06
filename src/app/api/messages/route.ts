import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')

  if (!workspaceId) {
    return new Response('Missing workspaceId', { status: 400 })
  }

  const supabase = await createClient()

  try {
    // Get the active general conversation for this workspace
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('context_type', 'general')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (convError && convError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Error fetching conversation:', convError)
      return Response.json({ messages: [] })
    }

    if (!conversation) {
      return Response.json({ messages: [] })
    }

    // Load all messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return Response.json({ messages: [] })
    }

    return Response.json({ messages: messages || [] })
  } catch (error) {
    console.error('Failed to load messages:', error)
    return Response.json({ messages: [] })
  }
}

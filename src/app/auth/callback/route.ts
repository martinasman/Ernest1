import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (user) {
      // Use admin client to bypass RLS for workspace operations
      const adminClient = createAdminClient()

      // Check if user has a workspace
      const { data: member } = await adminClient
        .from('workspace_members')
        .select('workspaces(slug)')
        .eq('user_id', user.id)
        .limit(1)
        .single()

      const workspace = member?.workspaces as any

      if (workspace?.slug) {
        // User has a workspace, redirect to main page
        return NextResponse.redirect(`${origin}/`)
      }

      // New user via OAuth - create workspace using admin client (bypasses RLS)
      const emailPrefix = user.email?.split('@')[0] || 'user'
      const randomSuffix = Math.random().toString(36).substring(2, 6)
      const slug = `${emailPrefix}-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '')

      const { data: newWorkspace, error: workspaceError } = await adminClient
        .from('workspaces')
        .insert({
          name: 'My Business',
          slug,
          owner_id: user.id,
        })
        .select()
        .single()

      if (workspaceError) {
        console.error('Workspace creation error:', workspaceError)
        return NextResponse.redirect(`${origin}/login?error=workspace_failed`)
      }

      // Add user as workspace member
      await adminClient.from('workspace_members').insert({
        workspace_id: newWorkspace.id,
        user_id: user.id,
        role: 'owner',
      })

      // Create default brand
      await adminClient.from('brands').insert({
        workspace_id: newWorkspace.id,
        name: 'My Business',
      })

      // Create default overview
      await adminClient.from('overviews').insert({
        workspace_id: newWorkspace.id,
      })

      // Redirect to main page after OAuth signup
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // If no code or something went wrong, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}

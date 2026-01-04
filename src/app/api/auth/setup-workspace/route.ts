import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if user already has a workspace
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('workspaces(slug)')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (existingMember?.workspaces) {
      const workspace = existingMember.workspaces as any
      return NextResponse.json({ slug: workspace.slug })
    }

    // Create workspace with slug from email prefix
    const emailPrefix = email.split('@')[0]
    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const slug = `${emailPrefix}-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '')

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: 'My Business',
        slug,
        owner_id: userId,
      })
      .select()
      .single()

    if (workspaceError) {
      console.error('Workspace creation error:', workspaceError)
      return NextResponse.json(
        { error: workspaceError.message },
        { status: 500 }
      )
    }

    // Add user as workspace member
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner',
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
    }

    // Create default brand
    const { error: brandError } = await supabase
      .from('brands')
      .insert({
        workspace_id: workspace.id,
        name: 'My Business',
      })

    if (brandError) {
      console.error('Brand creation error:', brandError)
    }

    // Create default overview
    const { error: overviewError } = await supabase
      .from('overviews')
      .insert({
        workspace_id: workspace.id,
      })

    if (overviewError) {
      console.error('Overview creation error:', overviewError)
    }

    return NextResponse.json({ slug: workspace.slug })
  } catch (error) {
    console.error('Setup workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to setup workspace' },
      { status: 500 }
    )
  }
}

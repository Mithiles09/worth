import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, name, password } = body

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: token, name, password' },
        { status: 400 }
      )
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Fetch invitation by token
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Check if expired
    if (invitation.status === 'EXPIRED' || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
    }

    // Check if already accepted
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 410 })
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        organization_id: invitation.organization_id,
        role: 'MEMBER',
      },
    })

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Create user record
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email: invitation.email,
      name,
      organization_id: invitation.organization_id,
      org_unit_id: invitation.org_unit_id,
      employment_type: 'FULL_TIME',
      progress_percentage: 0,
      quality_score: 100,
      marketplace_locked: false,
      skills: [],
      status: 'ACTIVE',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (userError) {
      // Clean up auth user if user creation fails
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    // Assign role to user
    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: userId,
      role_id: invitation.intended_role_id,
    })

    if (roleError) {
      // Clean up on failure
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: roleError.message }, { status: 500 })
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: invitation.email,
          name,
          organization_id: invitation.organization_id,
        },
        message: 'Account created successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

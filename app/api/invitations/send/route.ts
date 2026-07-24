import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSecureToken } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, organization_id, org_unit_id, intended_role_id } = body

    if (!email || !organization_id || !org_unit_id || !intended_role_id) {
      return NextResponse.json(
        { error: 'Missing required fields: email, organization_id, org_unit_id, intended_role_id' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const invitedByUserId = req.headers.get('x-user-id') || 'system'

    // Verify org_unit exists and belongs to organization
    const { data: orgUnit } = await supabase
      .from('org_units')
      .select('id, organization_id')
      .eq('id', org_unit_id)
      .eq('organization_id', organization_id)
      .single()

    if (!orgUnit) {
      return NextResponse.json(
        { error: 'Org unit not found or does not belong to organization' },
        { status: 404 }
      )
    }

    // Verify role exists and belongs to organization
    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('id', intended_role_id)
      .eq('organization_id', organization_id)
      .single()

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found or does not belong to organization' },
        { status: 404 }
      )
    }

    // Check if user already exists in organization
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organization_id)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 409 }
      )
    }

    // Check if pending invitation already exists
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('organization_id', organization_id)
      .eq('status', 'PENDING')
      .maybeSingle()

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Pending invitation already exists for this email' },
        { status: 409 }
      )
    }

    // Generate invitation token
    const token = generateSecureToken()

    // Create invitation record
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: email.toLowerCase(),
        organization_id,
        org_unit_id,
        intended_role_id,
        token,
        status: 'PENDING',
        invited_by: invitedByUserId,
        invited_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // In production, would send email here with invitation link:
    // const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invitations/${token}`
    // await sendInvitationEmail(email, invitationUrl)

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          expires_at: invitation.expires_at,
        },
        message: `Invitation sent to ${email}`,
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

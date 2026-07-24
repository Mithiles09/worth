import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'token required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Find invitation by token
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(
        `
        id,
        email,
        organization_id,
        org_unit_id,
        intended_role_id,
        status,
        expires_at,
        organizations(name),
        org_units(name),
        roles(name)
      `
      )
      .eq('token', token)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        organization_name: invitation.organizations?.name,
        org_unit_name: invitation.org_units?.name,
        role_name: invitation.roles?.name,
        expires_at: invitation.expires_at,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

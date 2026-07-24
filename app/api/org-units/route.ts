import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateNoCircularReferences, buildOrgTree } from '@/lib/org-utils'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organization_id')

    if (!organizationId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const { data: units, error } = await supabase
      .from('org_units')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ units })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { organization_id, parent_id, unit_type, name } = body

    if (!organization_id || !unit_type || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, unit_type, name' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()
    const userId = req.headers.get('x-user-id') || 'system'

    // Verify user is director of this organization
    const { data: user } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', userId)
      .eq('organization_id', organization_id)
      .maybeSingle()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - not member of organization' },
        { status: 403 }
      )
    }

    // Create org unit
    const { data: newUnit, error } = await supabase
      .from('org_units')
      .insert({
        organization_id,
        parent_id: parent_id || null,
        unit_type,
        name,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ unit: newUnit }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, lead_user_id, parent_id } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const userId = req.headers.get('x-user-id') || 'system'

    // Fetch current unit to get organization_id
    const { data: currentUnit } = await supabase
      .from('org_units')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (!currentUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Verify user is member of org
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('organization_id', currentUnit.organization_id)
      .maybeSingle()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - not member of organization' },
        { status: 403 }
      )
    }

    // Build tree to validate no circular references
    if (parent_id !== undefined) {
      const { data: allUnits } = await supabase
        .from('org_units')
        .select('*')
        .eq('organization_id', currentUnit.organization_id)

      if (allUnits) {
        const tree = buildOrgTree(allUnits)
        if (!validateNoCircularReferences(id, parent_id, tree)) {
          return NextResponse.json(
            { error: 'Cannot create circular reference in hierarchy' },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (lead_user_id !== undefined) updateData.lead_user_id = lead_user_id
    if (parent_id !== undefined) updateData.parent_id = parent_id

    const { data: updated, error } = await supabase
      .from('org_units')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ unit: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const userId = req.headers.get('x-user-id') || 'system'

    // Fetch unit to get organization_id
    const { data: unit } = await supabase
      .from('org_units')
      .select('organization_id')
      .eq('id', id)
      .single()

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Verify user is member of org
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .eq('organization_id', unit.organization_id)
      .maybeSingle()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - not member of organization' },
        { status: 403 }
      )
    }

    // Soft delete - mark as inactive
    const { error } = await supabase
      .from('org_units')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

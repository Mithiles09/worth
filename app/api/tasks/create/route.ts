import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient()
    const { data: { user } } = await supabaseAdmin.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      tokens,
      priority,
      deadline,
      departmentId,
      organizationId,
    } = body

    // Validate inputs
    if (!title || !organizationId || !departmentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user has permission to create tasks in this organization
    const { data: userOrg } = await supabaseAdmin
      .from('users')
      .select('organization_id, org_unit_id')
      .eq('id', user.id)
      .single()

    if (!userOrg || userOrg.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Create task
    const { data: task, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        title,
        description,
        tokens: tokens || 10,
        priority: priority || 'MEDIUM',
        status: 'OPEN',
        created_by: user.id,
        organization_id: organizationId,
        org_unit_id: departmentId,
        deadline: deadline || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error creating task:', error)
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json(task, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/tasks/create:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createClient()
    const { data: { user } } = await supabaseAdmin.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get pending approvals for this user
    const { data: approvals, error } = await supabaseAdmin
      .from('approvals')
      .select(`
        id,
        task_id,
        status,
        submitted_by,
        assigned_to_user_id,
        submission_proof,
        created_at,
        updated_at,
        tasks:task_id(id, title, tokens)
      `)
      .eq('assigned_to_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching approvals:', error)
      return NextResponse.json(
        { error: 'Failed to fetch approvals' },
        { status: 500 }
      )
    }

    return NextResponse.json(approvals)
  } catch (err) {
    console.error('Error in GET /api/approvals:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { approvalId, action, feedback } = body

    if (!approvalId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    // Get approval record
    const { data: approval } = await supabaseAdmin
      .from('approvals')
      .select('id, task_id, submitted_by, assigned_to_user_id')
      .eq('id', approvalId)
      .single()

    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      )
    }

    // Verify user has permission
    if (approval.assigned_to_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Update approval
    const { data: updatedApproval, error } = await supabaseAdmin
      .from('approvals')
      .update({
        status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        feedback,
        reviewed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error updating approval:', error)
      return NextResponse.json(
        { error: 'Failed to update approval' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedApproval)
  } catch (err) {
    console.error('Error in POST /api/approvals:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

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
      userId,
      organizationId,
      amount,
      reason,
      repaymentMonths,
    } = body

    // Validate inputs
    if (!userId || !organizationId || !amount || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user owns this request
    if (user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Verify user belongs to this organization
    const { data: userOrg } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (!userOrg || userOrg.organization_id !== organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get member wallet to check balance
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('owner_user_id', userId)
      .eq('purpose', 'MEMBER_BALANCE')
      .maybeSingle()

    const currentBalance = wallet?.balance || 0
    const maxLoan = Math.max(0, 1000 - currentBalance)

    if (amount > maxLoan) {
      return NextResponse.json(
        { error: `Loan amount exceeds maximum of ${maxLoan} tokens` },
        { status: 400 }
      )
    }

    // Create loan request
    const requestHash = crypto.randomBytes(16).toString('hex')

    const { data: loanRequest, error } = await supabaseAdmin
      .from('loan_requests')
      .insert({
        request_hash: requestHash,
        member_id: userId,
        organization_id: organizationId,
        amount_requested: amount,
        reason,
        repayment_months: repaymentMonths || 3,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error creating loan request:', error)
      return NextResponse.json(
        { error: 'Failed to create loan request' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        loanRequest,
        message: 'Loan request submitted for review',
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error in POST /api/loans/request:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

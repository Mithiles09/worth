import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, organizationName } = await req.json()

    // 1. Structural Field Validations
    if (!email || !password || !firstName || !lastName || !organizationName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (password.length < 12) {
      return NextResponse.json({ error: 'Password must be at least 12 characters' }, { status: 400 })
    }

    const supabaseAdmin = await createAdminClient()
    const combinedName = `${firstName.trim()} ${lastName.trim()}`

    // 2. Validate uniquely reserved organization strings
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('org_id')
      .eq('name', organizationName.trim())
      .maybeSingle()

    if (existingOrg) {
      return NextResponse.json({ error: 'Organization name already taken' }, { status: 400 })
    }

    // 3. Register standard credential sets into GoTrue Engine
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName, role: 'PLATFORM_ADMIN' },
    })

    if (authError || !authData?.user) {
      console.error('[CRITICAL_AUTH_FAILURE]', authError)
      return NextResponse.json({ error: authError?.message || 'Authentication layout rejected execution context.' }, { status: 500 })
    }

    const userId = authData.user.id

    // 4. Provision primary tenant block structure matching enum constraints
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        type: 'ENTERPRISE', // Matches custom type options explicitly [Page 8]
        template_key: 'GENERIC',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('org_id')
      .single()

    if (orgError || !orgData) {
      console.error('[ORG_WRITE_ERROR]', orgError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Organization storage partition allocation crashed.' }, { status: 500 })
    }

    const tenantOrgId = orgData.org_id

    // 5. Build core entity rows into platform_admins instead of normal tenancy partitions
    const { error: adminTableError } = await supabaseAdmin
      .from('platform_admins')
      .insert({
        auth_user_id: userId, // Maps cleanly to your Page 8 column layout criteria
        email: email.trim(),
        name: combinedName,
        created_at: new Date().toISOString()
      })

    if (adminTableError) {
      console.error('[PLATFORM_ADMIN_TABLE_CRASH]', adminTableError)
      // Sequential transaction rollbacks
      await supabaseAdmin.from('organizations').delete().eq('org_id', tenantOrgId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to bind security roles to platform administrative registries.' }, { status: 500 })
    }

    // 6. Build mirrored entry inside global users for dashboard statistics consistency
    const { error: userTableError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        organization_id: tenantOrgId, // Maps to schema constraint criteria references [Page 1]
        email: email.trim(),
        name: combinedName,
        employment_type: 'FULL_TIME', // Matches valid custom domain options explicitly [Page 9]
        progress_percentage: 0.00,
        quality_score: 0.00,
        marketplace_locked: false,
        skills: [],
        status: 'ACTIVE', // Matches valid custom domain status lists [Page 9]
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (userTableError) {
      console.error('[WARNING_USERS_FALLBACK_SKIPPED]', userTableError)
      // Non-blocking fallback warning, allowing entry completion
    }

    return NextResponse.json({
      success: true,
      message: 'Global architecture provisioned successfully',
      org_id: tenantOrgId,
      user_id: userId
    }, { status: 201 })

  } catch (error) {
    console.error('[SIGNUP_FATAL_CRASH]', error)
    return NextResponse.json({ error: 'An unexpected processing event occurred' }, { status: 500 })
  }
}

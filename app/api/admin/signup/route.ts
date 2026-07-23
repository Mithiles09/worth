import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, organizationName } = await req.json()

    // 1. Validation
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

    // 2. Check if organization name exists using a wildcard layout select
    const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('name', organizationName.trim())

    if (existingOrg && existingOrg.length > 0) {
      return NextResponse.json({ error: 'Organization name already taken' }, { status: 400 })
    }

    // 3. Register Account Identity inside Supabase Auth
    let authData
    try {
      const response = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { firstName, lastName, role: 'PLATFORM_ADMIN' },
      })

      if (response.error) {
        console.error('[CRITICAL_AUTH_FAILURE]', response.error)
        return NextResponse.json({ error: response.error.message }, { status: 500 })
      }
      authData = response.data
    } catch (err: any) {
      console.error('[AUTH_EXCEPTION_CONTAINED]', err)
      return NextResponse.json({ error: 'Authentication engine interface error' }, { status: 500 })
    }

    const userId = authData.user!.id

    // 4. Insert Organization Row - Stripped of direct selection filters to bypass key name mismatches
    // We select '*' so Postgres returns every column it has, letting JavaScript inspect the keys.
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        type: 'ENTERPRISE', 
        template_key: 'GENERIC',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .maybeSingle()

    if (orgError || !orgData) {
      console.error('[ORG_INSERT_ERROR_DETAILS]', orgError)
      // Cleanup: delete auth user if org creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ 
        error: `Organization creation aborted internally: ${orgError?.message || 'The table returned an unexpected layout array instead of an object.'}` 
      }, { status: 500 })
    }

    // Inspect the returned record dynamically to find whatever primary key was assigned
    console.log('[DEBUG_ORG_DATA_KEYS]', Object.keys(orgData))
    const organizationId = orgData.id || orgData.org_id || orgData.organization_id

    if (!organizationId) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Could not discover a valid primary key identifier on your organizations table.' }, { status: 500 })
    }

    // 5. Create User Profile in public.users matching your exact schema layout
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId, 
        organization_id: organizationId, 
        email: email.trim(),
        name: combinedName, 
        employment_type: 'FULL_TIME',
        progress_percentage: 0.00,
        quality_score: 0.00,
        marketplace_locked: false,
        skills: [],
        capacity_hours_weekly: 40,
        status: 'ACTIVE',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('[PROFILE_ERROR]', profileError)
      // Cleanup elements sequentially on failure
      await supabaseAdmin.from('organizations').delete().eq(Object.keys(orgData)[0], organizationId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Profile configuration failed: ${profileError.message}` }, { status: 500 })
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: 'Platform administrator provisioned successfully',
      organization_id: organizationId,
      user_id: userId,
    }, { status: 201 })

  } catch (error) {
    console.error('[SIGNUP_ERROR]', error)
    return NextResponse.json({ error: 'An unexpected processing event occurred' }, { status: 500 })
  }
}

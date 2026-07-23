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

    // 2. Check if organization name exists
    const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', organizationName.trim())
      .maybeSingle()

    if (orgCheckError) {
      console.error('[ORG_CHECK_ERROR]', orgCheckError)
    }

    if (existingOrg) {
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

    // 4. Insert Organization Row matching your strict Enum and Constraints
    // Note: 'type' is required by your schema. Assuming a standard first type like 'ENTERPRISE' or 'ROOT'.
    // Change 'ENTERPRISE' below if your 'organization_type' enum values are named differently.
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        type: 'ENTERPRISE', // Replace with your valid organization_type enum value if needed
        template_key: 'GENERIC',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (orgError || !orgData) {
      console.error('[ORG_ERROR_DETAILS]', orgError)
      // Cleanup: delete auth user if org creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ 
        error: `Organization creation aborted internally: ${orgError?.message || 'No data returned'}` 
      }, { status: 500 })
    }

    const organizationId = orgData.id

    // 5. Create User Profile in public.users matching your exact schema layout
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId, // Primary Key map
        organization_id: organizationId, // References organizations(id)
        email: email.trim(),
        name: combinedName, // Combines first and last name strings
        employment_type: 'FULL_TIME',
        progress_percentage: 0.00,
        quality_score: 0.00,
        marketplace_locked: false,
        skills: JSON.stringify([]),
        capacity_hours_weekly: 40,
        status: 'ACTIVE',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('[PROFILE_ERROR]', profileError)
      // Cleanup transaction elements sequentially on failure
      await supabaseAdmin.from('organizations').delete().eq('id', organizationId)
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

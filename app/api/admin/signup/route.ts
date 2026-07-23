import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, organizationName } = await req.json()

    // Validation
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

    // 1. Check if organization name exists
    const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('name', organizationName.trim())

    if (existingOrg && existingOrg.length > 0) {
      return NextResponse.json({ error: 'Organization name already taken' }, { status: 400 })
    }

    // 2. Register Account Identity
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

    // 3. Insert Organization Row (Robust column mapping)
    let orgId: string | number | null = null
    const orgPayload = {
      name: organizationName.trim(),
      created_by: userId,
      created_at: new Date().toISOString(),
    }

    // Select '*' to automatically fetch whichever primary key column exists ('id' or 'org_id')
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert(orgPayload)
      .select('*')
      .maybeSingle()

    if (orgError || !orgData) {
      console.error('[ORG_ERROR_DETAILS]', orgError)
      // Cleanup: delete auth user if org creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ 
        error: `Organization creation aborted internally: ${orgError?.message || 'No data returned'}` 
      }, { status: 500 })
    }

    // Dynamically look for either column name from database schema
    orgId = orgData.org_id || orgData.id

    if (!orgId) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Could not resolve organization primary key identifier column' }, { status: 500 })
    }

    // 4. Create User Data Row
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        user_id: userId,
        email,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        org_id: orgId,
        role: 'PLATFORM_ADMIN',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      })

    if (profileError) {
      console.error('[PROFILE_ERROR]', profileError)
      // Cleanup everything on fail
      await supabaseAdmin.from('organizations').delete().match({ id: orgId })
      await supabaseAdmin.from('organizations').delete().match({ org_id: orgId })
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: `Profile configuration failed: ${profileError.message}` }, { status: 500 })
    }

    // 5. Build Membership Row Mapping
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        org_id: orgId,
        user_id: userId,
        role: 'PLATFORM_ADMIN',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('[MEMBER_ERROR]', memberError)
    }

    // Return exact matching key name structure for safety
    return NextResponse.json({
      success: true,
      message: 'Platform administrator provisioned successfully',
      org_id: orgId,
      user_id: userId,
    }, { status: 201 })

  } catch (error) {
    console.error('[SIGNUP_ERROR]', error)
    return NextResponse.json({ error: 'An unexpected processing event occurred' }, { status: 500 })
  }
}

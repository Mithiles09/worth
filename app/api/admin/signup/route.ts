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

    // 1. Safe Organization Check (Tolerates structural variation between 'id' and 'org_id')
    let existingOrg = null
    const { data: orgCheck1, error: err1 } = await supabaseAdmin
      .from('organizations')
      .select('org_id')
      .eq('name', organizationName.trim())
      .maybeSingle()

    if (!err1 && orgCheck1) {
      existingOrg = orgCheck1
    } else if (err1?.code === '42703') {
      // Fallback query matching the 'id' schema definition
      const { data: orgCheck2 } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('name', organizationName.trim())
        .maybeSingle()
      if (orgCheck2) existingOrg = { org_id: orgCheck2.id }
    }

    if (existingOrg) {
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
        return NextResponse.json({ 
          error: `Database Auth Failure: ${response.error.message}. NOTE: Check Supabase 'Database Functions' page for a broken 'auth.users' trigger/hook referencing 'organizations.org_id'.` 
        }, { status: 500 })
      }
      authData = response.data
    } catch (err: any) {
      console.error('[AUTH_EXCEPTION_CONTAINED]', err)
      return NextResponse.json({ error: 'Authentication engine interface error' }, { status: 500 })
    }

    const userId = authData.user!.id

    // 3. Insert Organization Row
    let orgId: any = null
    const orgPayload = {
      name: organizationName.trim(),
      created_by: userId,
      created_at: new Date().toISOString(),
    }

    // Attempt insert catching identity key variations natively
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert(orgPayload)
      .select('org_id')
      .maybeSingle()

    if (orgError?.code === '42703' || (!orgData && !orgError)) {
      // Fallback structural initialization path
      const { data: orgFallback, error: fallbackError } = await supabaseAdmin
        .from('organizations')
        .insert(orgPayload)
        .select('id')
        .maybeSingle()

      if (fallbackError || !orgFallback) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json({ error: 'Failed to complete transaction structural layout setup' }, { status: 500 })
      }
      orgId = orgFallback.id
    } else if (orgError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Organization creation aborted internally' }, { status: 500 })
    } else {
      orgId = orgData.org_id
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
      await supabaseAdmin.from('organizations').delete().match({ org_id: orgId })
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Profile configuration failed' }, { status: 500 })
    }

    // 5. Build Membership Row Mapping
    await supabaseAdmin.from('organization_members').insert({
      org_id: orgId,
      user_id: userId,
      role: 'PLATFORM_ADMIN',
      joined_at: new Date().toISOString(),
    })

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

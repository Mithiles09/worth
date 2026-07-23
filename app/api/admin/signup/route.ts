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
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('name', organizationName.trim())
      .maybeSingle()

    if (existingOrg) {
      return NextResponse.json({ error: 'Organization name already taken' }, { status: 400 })
    }

    // 3. Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // 4. Register Account Identity inside Supabase Auth
    let userId: string
    try {
      const response = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: { 
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'PLATFORM_ADMIN'
        },
      })

      if (response.error) {
        console.error('[AUTH_ERROR]', response.error)
        return NextResponse.json({ error: response.error?.message || 'Failed to create auth account' }, { status: 500 })
      }

      if (!response.data?.user?.id) {
        return NextResponse.json({ error: 'Auth user creation returned no ID' }, { status: 500 })
      }

      userId = response.data.user.id
    } catch (err: any) {
      console.error('[AUTH_EXCEPTION]', err?.message)
      return NextResponse.json({ error: 'Authentication service error' }, { status: 500 })
    }

    // 5. Insert Organization (no version/timestamps - let DB handle)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        type: 'GENERIC',
        template_key: 'GENERIC',
      })
      .select('id')
      .single()

    if (orgError || !orgData) {
      console.error('[ORG_INSERT_ERROR]', orgError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    const organizationId = orgData.id

    // 6. Create User Profile in public.users
    const { error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        organization_id: organizationId,
        email: email.trim(),
        name: combinedName,
        employment_type: 'FULL_TIME',
        status: 'ACTIVE',
      })

    if (userInsertError) {
      console.error('[USER_INSERT_ERROR]', userInsertError)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      await supabaseAdmin.from('organizations').delete().eq('id', organizationId)
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
    }

    // Success
    return NextResponse.json({
      success: true,
      message: 'Organization created successfully',
      organization_id: organizationId,
      user_id: userId,
    }, { status: 201 })

  } catch (error) {
    console.error('[SIGNUP_ERROR]', error)
    return NextResponse.json({ error: 'An unexpected processing event occurred' }, { status: 500 })
  }
}

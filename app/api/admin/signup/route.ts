import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { validateEmail } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, organizationName } = await req.json()

    // Validation
    if (!email || !password || !firstName || !lastName || !organizationName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters' },
        { status: 400 }
      )
    }

    // Initialize clients
    const supabaseAdmin = await createAdminClient()
    const supabase = await createClient()

    // FIX: Using supabaseAdmin here to bypass Row-Level Security (RLS) policies 
    // since the anonymous user cannot read the organizations table yet.
    const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
      .from('organizations')
      .select('org_id')
      .eq('name', organizationName.trim())
      .maybeSingle()

    if (orgCheckError) {
      console.error('[ORG_CHECK_ERROR]', orgCheckError)
    }

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization name already taken' },
        { status: 400 }
      )
    }

    // 1. Create auth user using the Admin Client
    let authData
    try {
      const response = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm admin email
        user_metadata: {
          firstName,
          lastName,
          role: 'PLATFORM_ADMIN',
        },
      })

      if (response.error) {
        console.error('[AUTH_ERROR]', response.error)
        
        // Detailed error messages based on Supabase service codes
        if (response.error?.message?.includes('already exists')) {
          return NextResponse.json(
            { error: 'Email already registered' },
            { status: 400 }
          )
        }
        
        return NextResponse.json(
          { error: `Authentication provider failed: ${response.error.message}. Tip: Try resetting your Supabase database password in your dashboard to fix internal network connection drops.` },
          { status: 500 }
        )
      }
      authData = response.data
    } catch (err) {
      console.error('[AUTH_EXCEPTION]', err)
      return NextResponse.json(
        { error: 'Authentication service encountered a network connection failure' },
        { status: 500 }
      )
    }

    if (!authData?.user?.id) {
      console.error('[AUTH_NO_USER]', authData)
      return NextResponse.json(
        { error: 'Failed to generate a valid user session account ID' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Create organization (using admin privileges for initialization consistency)
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: organizationName.trim(),
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .select('org_id')
      .single()

    if (orgError || !orgData) {
      console.error('[ORG_ERROR]', orgError)
      // Cleanup: delete auth user if org creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create organization entry' },
        { status: 500 }
      )
    }

    const orgId = orgData.org_id

    // 3. Create user profile in public.users
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
      // Cleanup: delete org and auth user if profile creation fails
      await supabaseAdmin.from('organizations').delete().eq('org_id', orgId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to build user identity profile' },
        { status: 500 }
      )
    }

    // 4. Create organization member record
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

    // Success
    return NextResponse.json(
      {
        success: true,
        message: 'Organization and administrator profile configured successfully',
        org_id: orgId,
        user_id: userId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[SIGNUP_ERROR]', error)
    return NextResponse.json(
      { error: 'An unexpected processing event occurred' },
      { status: 500 }
    )
  }
}

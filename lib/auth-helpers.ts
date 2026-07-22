import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  // Fetch the user profile from public.users
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, name, organization_id, org_unit_id, status')
    .eq('id', authUser.id)
    .single()

  if (error || !profile) {
    return null
  }

  return {
    ...profile,
    authId: authUser.id,
  }
}

export async function getUserRoles(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles (
        id,
        name,
        scope_level
      )
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user roles:', error)
    return []
  }

  return data || []
}

export async function getOrganizationByUserId(userId: string) {
  const supabase = await createClient()
  
  const { data: user } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (!user) return null

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, type')
    .eq('id', user.organization_id)
    .single()

  if (error) {
    console.error('Error fetching organization:', error)
    return null
  }

  return org
}

export async function getPlatformAdmin(authUserId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('platform_admins')
    .select('id, email, name')
    .eq('auth_user_id', authUserId)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

export async function createInvitation(
  organizationId: string,
  email: string,
  roleId: string,
  invitedByUserId: string,
  orgUnitId?: string
) {
  const supabase = await createClient()
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36)

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      intended_role_id: roleId,
      invited_by: invitedByUserId,
      org_unit_id: orgUnitId || null,
      token,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating invitation:', error)
    throw error
  }

  return data
}

export async function getInvitationByToken(token: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('invitations')
    .select(`
      id,
      email,
      token,
      status,
      expires_at,
      organizations (
        id,
        name
      ),
      roles (
        id,
        name
      )
    `)
    .eq('token', token)
    .eq('status', 'PENDING')
    .single()

  if (error || !data) {
    return null
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return null
  }

  return data
}

export async function resolveDashboardRoute(roleData: any[]) {
  // Determine the primary route based on role scope_level
  const roleHierarchy = ['PLATFORM_ADMIN', 'DIRECTOR', 'DEAN', 'ORG_UNIT_LEAD', 'MEMBER', 'FINANCE_ADMIN']
  
  let highestRole = null
  let highestIndex = -1

  for (const role of roleData) {
    const index = roleHierarchy.indexOf(role.roles.scope_level)
    if (index > highestIndex) {
      highestIndex = index
      highestRole = role.roles.scope_level
    }
  }

  // Route mapping
  const routeMap: Record<string, string> = {
    PLATFORM_ADMIN: '/platform/dashboard',
    DIRECTOR: '/director',
    DEAN: '/dean',
    ORG_UNIT_LEAD: '/lead',
    MEMBER: '/member',
    FINANCE_ADMIN: '/finance',
  }

  return routeMap[highestRole] || '/member'
}

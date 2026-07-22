import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getUserRoles(userId: string) {
  const supabase = await createClient()
  
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)

  return roles || []
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

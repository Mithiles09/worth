import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  // On the server, we can read raw, un-prefixed variables directly
  const url = process.env.SUPABASE_URL!
  const anonKey = process.env.SUPABASE_ANON_KEY!

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method can be ignored if called from a Server Component
        }
      },
    },
  })
}

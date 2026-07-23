import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Map the environment variables provided by the platform environment
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase URL or Anon Key is missing from the environment.')
  }

  return createBrowserClient(url, anonKey)
}

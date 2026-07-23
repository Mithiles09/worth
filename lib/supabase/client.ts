import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // FIX: Dynamically checks for any custom prefix variations natively
  const url = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.Biryani_SUPABASE_URL ||
    "https://mdmqoalxjzfjnoavdjey.supabase.co"

  const anonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    process.env.Biryani_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbXFvYWx4anpmam5vYXZkamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjI3ODUsImV4cCI6MjEwMDI5ODc4NX0.Y-R6uAqSb6q3O_Uj06AJPSq7X3AmUnotj8B1j_byejQ"

  return createBrowserClient(url, anonKey)
}

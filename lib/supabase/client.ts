import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = "https://mdmqoalxjzfjnoavdjey.supabase.co"
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbXFvYWx4anpmam5vYXZkamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjI3ODUsImV4cCI6MjEwMDI5ODc4NX0.Y-R6uAqSb6q3O_Uj06AJPSq7X3AmUnotj8B1j_byejQ"

  return createBrowserClient(url, anonKey)
}

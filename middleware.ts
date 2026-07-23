import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 1. Defined matching runtime execution logic
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const url = "https://mdmqoalxjzfjnoavdjey.supabase.co"
  const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbXFvYWx4anpmam5vYXZkamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjI3ODUsImV4cCI6MjEwMDI5ODc4NX0.Y-R6uAqSb6q3O_Uj06AJPSq7X3AmUnotj8B1j_byejQ"

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }))
      },
    },
  })

  // Safely refresh token states with upstream servers
  const { data: { user } } = await supabase.auth.getUser()

  const isUrlAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isLoginPage = request.nextUrl.pathname === '/admin/login' || request.nextUrl.pathname === '/login'
  const isSignupPage = request.nextUrl.pathname === '/admin/signup'

  // If trying to access protected dashboards without a session, route to login
  if (!user && isUrlAdmin && !isLoginPage && !isSignupPage) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // If already logged in, prevent the user from getting trapped on the login screens
  if (user && isLoginPage) {
    if (isUrlAdmin) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// 2. FIX: Duplicate export explicitly as default to satisfy the Next.js compilation engine error
export default middleware

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

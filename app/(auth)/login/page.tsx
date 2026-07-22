'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { validateEmail } from '@/lib/security'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'login' | 'no-profile'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const supabase = createClient()

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Security validations
    if (!email || !password) {
      setError('Email and password are required')
      setIsLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Invalid email or password')
      setIsLoading(false)
      return
    }

    // Rate limiting check (client-side)
    if (failedAttempts >= 5) {
      setError('Too many failed login attempts. Please try again in 15 minutes.')
      setIsLoading(false)
      return
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setFailedAttempts(prev => prev + 1)
        setError('Invalid email or password. Please try again.')
        setIsLoading(false)
        return
      }

      // Reset failed attempts on successful login
      setFailedAttempts(0)

      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('id', data.user?.id)
        .single()

      if (profileError || !profile) {
        // Profile doesn't exist - show waiting message
        setState('no-profile')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      // Profile exists - fetch roles and redirect
      const { data: roles } = await supabase
        .from('user_roles')
        .select('roles(scope_level)')
        .eq('user_id', data.user?.id)

      let redirectPath = '/member'
      if (roles && roles.length > 0) {
        const firstRole = roles[0] as any
        const scopeLevel = firstRole?.roles?.scope_level
        const routeMap: Record<string, string> = {
          PLATFORM_ADMIN: '/platform',
          DIRECTOR: '/director',
          DEAN: '/dean',
          ORG_UNIT_LEAD: '/lead',
          MEMBER: '/member',
          FINANCE_ADMIN: '/finance',
        }
        redirectPath = routeMap[scopeLevel] || '/member'
      }

      router.push(redirectPath)
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  if (state === 'no-profile') {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xl">
                W
              </div>
            </div>
            <div className="text-center space-y-1">
              <CardTitle className="text-2xl font-bold">Account Pending Activation</CardTitle>
              <CardDescription className="text-base">
                You&apos;ve been invited to an organization
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-sm space-y-2 text-blue-900 dark:text-blue-100">
                <p className="font-semibold">Check your email</p>
                <p>
                  You&apos;ve been invited to join an organization. Look for an email with the subject &quot;Activate Your Work Worth Account&quot;.
                </p>
                <p className="text-xs opacity-80">
                  Click the activation link in the email to set your password and activate your account.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
              <p className="text-amber-900 dark:text-amber-100">
                <strong>Didn&apos;t receive the email?</strong> Check your spam folder or contact your organization administrator.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-10"
              onClick={() => {
                setState('login')
                setEmail('')
                setPassword('')
                setFailedAttempts(0)
              }}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-3 pb-6 sm:pb-8">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-lg">
              W
            </div>
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-3xl font-bold">Work Worth</CardTitle>
            <CardDescription className="text-base">
              Organization Management Platform
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {failedAttempts > 0 && failedAttempts < 5 && (
              <div className="flex gap-2 p-2 text-xs text-muted-foreground bg-muted rounded">
                <span>Failed attempts: {failedAttempts}/5</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@organization.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
                disabled={isLoading || failedAttempts >= 5}
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || failedAttempts >= 5}
                  autoComplete="current-password"
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={!password}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Security */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-input"
                  disabled={isLoading || failedAttempts >= 5}
                />
                <span className="text-muted-foreground hover:text-foreground transition-colors">
                  Remember me
                </span>
              </label>
              <a
                href="#"
                className="text-primary hover:underline transition-colors"
              >
                Forgot password?
              </a>
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold"
              disabled={isLoading || failedAttempts >= 5}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-2 border-t border-border">
              <ShieldCheck className="h-3 w-3" />
              <span>256-bit SSL Encrypted</span>
            </div>
          </form>

          {/* Admin Link */}
          <div className="mt-4 pt-4 border-t border-border text-center text-xs">
            <p className="text-muted-foreground mb-2">Are you a platform admin?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/login')}
              className="text-xs h-8"
            >
              Admin Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

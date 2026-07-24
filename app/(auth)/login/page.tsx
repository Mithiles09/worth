'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'login' | 'no-profile'>('login')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setIsLoading(false)
        return
      }

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex justify-center mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                W
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Account Not Ready</CardTitle>
            <CardDescription className="text-center">
              Your account has been created but not yet activated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Check your email</p>
                <p>You&apos;ve been invited to join an organization. Click the link in your invitation email to activate your account.</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setState('login')
                setEmail('')
                setPassword('')
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              W
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Work Worth</CardTitle>
          <CardDescription className="text-center">
            Performance-Based Compensation Platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        console.error('[LOGIN_ERROR]', signInError)
        setError(signInError.message || 'Failed to sign in')
        setIsLoading(false)
        return
      }

      if (!data.user?.id) {
        setError('No user found in authentication')
        setIsLoading(false)
        return
      }

      // Check if user exists in public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, organization_id')
        .eq('id', data.user.id)
        .maybeSingle()

      if (userError) {
        console.error('[USER_LOOKUP_ERROR]', userError)
        setError('Failed to verify user profile')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      if (!userData) {
        setError('User profile not found. Please sign up first.')
        await supabase.auth.signOut()
        setIsLoading(false)
        return
      }

      // Success - redirect to dashboard
      router.push('/admin/dashboard')
    } catch (err: any) {
      console.error('[LOGIN_EXCEPTION]', err)
      setError(err?.message || 'An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Platform Admin
            </span>
          </div>
          <CardTitle className="text-3xl text-center font-bold">Work Worth</CardTitle>
          <CardDescription className="text-center text-base">
            Vendor Administration Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@workworth.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted-foreground/20" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Tenant User?</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-10"
            onClick={() => router.push('/login')}
          >
            Sign in as Organization Member
          </Button>

          <div className="mt-4 pt-4 border-t border-border text-center text-xs space-y-2">
            <p className="text-muted-foreground">New platform admin?</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/signup')}
              className="text-xs h-8"
            >
              Create Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

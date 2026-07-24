'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { getInvitationByToken } from '@/lib/auth-helpers'

export default function AcceptInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<'loading' | 'form' | 'success' | 'error'>('loading')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        setState('error')
        setError('Invalid invite link - missing token')
        return
      }

      try {
        const inv = await getInvitationByToken(token)
        if (!inv) {
          setState('error')
          setError('This invitation has expired or is invalid')
          return
        }
        setInvitation(inv)
        setState('form')
      } catch (err) {
        setState('error')
        setError('Error loading invitation')
      }
    }

    loadInvitation()
  }, [token])

  async function handleAcceptInvite(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    try {
      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setIsLoading(false)
        return
      }

      // The trigger will automatically:
      // 1. Create the users row
      // 2. Assign the role
      // 3. Create the wallet
      // 4. Mark invitation as ACCEPTED

      setState('success')
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      setError('An error occurred while creating your account')
      setIsLoading(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading your invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>We couldn&apos;t process your invitation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Created!</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Your account has been successfully created. Redirecting to login...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Set Up Your Account</CardTitle>
          <CardDescription>
            Create a password to activate your {invitation?.organizations?.name} account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-semibold">{invitation?.email}</p>
            </div>

            <div className="space-y-2 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="font-semibold">{invitation?.roles?.name}</p>
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
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating account...' : 'Activate Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

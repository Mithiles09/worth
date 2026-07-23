'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function AdminSignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // 1. Submit form payload to your working signup API endpoint
      const res = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          organizationName: organizationName.trim(),
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Failed to complete registration transaction')
      }

      console.log('[SIGNUP_API_SUCCESS]', result)

      // 2. CRUCIAL FIX: Establish the actual browser storage login session!
      // Your signup API provisions the database user, but the browser client must sign in 
      // explicitly to set the cookies that the middleware checks. Without this step, 
      // the dashboard kicks you right back out to the login route.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        console.error('[SIGNUP_POST_SIGNIN_ERROR]', signInError)
        // If auto-signin encounters a delay, redirect to login page with an explicit prompt
        router.push('/admin/login?registered=true')
        return
      }

      // 3. Navigate securely to the functional dashboard panel
      router.push('/admin/dashboard')
      
    } catch (err: any) {
      console.error('[SIGNUP_PAGE_EXCEPTION]', err)
      setError(err?.message || 'An unexpected error occurred during account provisioning')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create Platform Admin Account</CardTitle>
          <CardDescription className="text-center">Set up your customer organization console</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isLoading} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input id="organizationName" placeholder="e.g. Acme Corp" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="admin@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password (Min 12 chars)</Label>
              <Input id="password" type="password" placeholder="••••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
            </div>

            <Button type="submit" className="w-full h-10 mt-2" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Configuring Platform...' : 'Register & Create Console'}
            </Button>
          </form>
          
          <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => router.push('/admin/login')}>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

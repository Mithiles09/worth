'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { validateEmail } from '@/lib/security'

export default function AdminSignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    organizationName: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  // Password validation
  const passwordStrength = {
    hasLength: formData.password.length >= 12,
    hasUpper: /[A-Z]/.test(formData.password),
    hasLower: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  }
  const passwordScore = Object.values(passwordStrength).filter(Boolean).length

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (!formData.organizationName.trim()) {
      setError('Organization name is required')
      setIsLoading(false)
      return
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First and last name are required')
      setIsLoading(false)
      return
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (passwordScore < 5) {
      setError('Password does not meet security requirements')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          organizationName: formData.organizationName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Signup failed. Please try again.')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-sm shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <ShieldCheck className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Organization Created!</h2>
                <p className="text-muted-foreground mt-2">
                  Welcome to WorkLedger. Redirecting to your dashboard...
                </p>
              </div>
              <div className="flex gap-2 pt-4">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.1s]"></div>
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-lg">
              W
            </div>
          </div>
          <div className="text-center space-y-1">
            <CardTitle className="text-3xl font-bold">Create Organization</CardTitle>
            <CardDescription className="text-base">
              Set up your WorkLedger platform admin account
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="flex gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg animate-in">
                <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Organization Info */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-semibold">
                Organization Name
              </Label>
              <Input
                id="organizationName"
                name="organizationName"
                placeholder="My University"
                value={formData.organizationName}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            {/* Admin Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-semibold">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-semibold">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@organization.edu"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-10"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10 pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={!formData.password}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password Strength */}
              {formData.password && (
                <div className="space-y-2 pt-1">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < passwordScore
                            ? passwordScore >= 4
                              ? 'bg-green-600'
                              : passwordScore >= 3
                                ? 'bg-yellow-600'
                                : 'bg-orange-600'
                            : 'bg-muted-foreground/20'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs space-y-1">
                    {Object.entries(passwordStrength).map(([key, met]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-2 ${
                          met ? 'text-green-600' : 'text-muted-foreground'
                        }`}
                      >
                        <span className="text-lg leading-none">{met ? '✓' : '○'}</span>
                        <span className="capitalize">
                          {key === 'hasLength'
                            ? 'At least 12 characters'
                            : key === 'hasUpper'
                              ? 'One uppercase letter'
                              : key === 'hasLower'
                                ? 'One lowercase letter'
                                : key === 'hasNumber'
                                  ? 'One number'
                                  : 'One special character'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-10 font-mono text-sm"
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-semibold mt-6"
              disabled={isLoading || passwordScore < 5 || formData.password !== formData.confirmPassword}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating organization...' : 'Create Organization'}
            </Button>

            <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => router.push('/admin/login')}
                className="text-primary hover:underline transition-colors"
              >
                Sign in here
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

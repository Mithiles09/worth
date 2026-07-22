'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('faculty@college.edu');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [role, setRole] = useState('faculty');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      
      // Mock role-based routing
      const roleMap: Record<string, string> = {
        director: '/director/dashboard',
        dean: '/dean/dashboard',
        hod: '/hod/dashboard',
        faculty: '/member/dashboard',
        finance: '/finance/ledger',
      };

      router.push(roleMap[role] || '/member/dashboard');
    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  const demoAccounts = [
    { role: 'director', email: 'director@college.edu', name: 'Director Account' },
    { role: 'hod', email: 'hod@college.edu', name: 'HOD Account' },
    { role: 'faculty', email: 'faculty@college.edu', name: 'Faculty Account' },
    { role: 'finance', email: 'finance@college.edu', name: 'Finance Admin' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
            W
          </div>
          <div>
            <h1 className="text-2xl font-bold">Work Worth</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Performance-Based Compensation Platform
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Demo accounts for different roles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Select Demo Role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => {
                    const selected = demoAccounts.find(a => a.role === e.target.value);
                    if (selected) {
                      setRole(selected.role);
                      setEmail(selected.email);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  {demoAccounts.map(acc => (
                    <option key={acc.role} value={acc.role}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                  className="opacity-60"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  disabled
                  className="opacity-60"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            {/* Demo Info */}
            <div className="mt-6 p-3 bg-accent rounded-lg text-xs space-y-2">
              <p className="font-semibold">Demo Accounts:</p>
              <ul className="space-y-1 text-muted-foreground">
                {demoAccounts.map(acc => (
                  <li key={acc.role}>
                    <strong>{acc.name}:</strong> {acc.email}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          This is a demo platform for testing role-based dashboards
        </p>
      </div>
    </div>
  );
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Briefcase, Wallet, TrendingUp } from 'lucide-react'

export default function MemberDashboard() {
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Get current auth user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('id, email, name, organization_id, org_unit_id, status')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          setUser(profile)

          // Get organization details
          const { data: org } = await supabase
            .from('organizations')
            .select('id, name, type')
            .eq('id', profile.organization_id)
            .single()

          if (org) setOrganization(org)

          // Get personal wallet
          const { data: wallets } = await supabase
            .from('wallets')
            .select('id, balance, purpose')
            .eq('owner_user_id', authUser.id)
            .eq('purpose', 'PERSONAL')
            .single()

          if (wallets) setWallet(wallets)
        }
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Work</h1>
        <p className="text-muted-foreground mt-2">
          {organization?.name} • {user?.email}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallet?.balance || 0}</div>
            <p className="text-xs text-muted-foreground">WORK tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{user?.status || 'Active'}</div>
            <p className="text-xs text-muted-foreground">Account status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">Progress to target</p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Sections */}
      <Card>
        <CardHeader>
          <CardTitle>This Week&apos;s Schedule</CardTitle>
          <CardDescription>Your structured work assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No scheduled tasks yet</p>
            <Button variant="outline">View Calendar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Open Tasks</CardTitle>
          <CardDescription>Available opportunities to earn tokens</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No open tasks at this time</p>
            <Button variant="outline">Browse Marketplace</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

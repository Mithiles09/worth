'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Building2, Users, Wallet, TrendingUp } from 'lucide-react'

export default function DirectorDashboard() {
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [stats, setStats] = useState({ members: 0, departments: 0, salary_pool: 0, loan_pool: 0 })
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
          .select('id, email, name, organization_id')
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

          // Get stats
          const { data: members } = await supabase
            .from('users')
            .select('id')
            .eq('organization_id', profile.organization_id)

          const { data: departments } = await supabase
            .from('org_units')
            .select('id')
            .eq('organization_id', profile.organization_id)

          const { data: poolWallets } = await supabase
            .from('wallets')
            .select('id, balance, purpose')
            .eq('organization_id', profile.organization_id)
            .in('purpose', ['SALARY_POOL', 'LOAN_POOL'])

          setStats({
            members: members?.length || 0,
            departments: departments?.length || 0,
            salary_pool: poolWallets?.find(w => w.purpose === 'SALARY_POOL')?.balance || 0,
            loan_pool: poolWallets?.find(w => w.purpose === 'LOAN_POOL')?.balance || 0,
          })
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
        <h1 className="text-3xl font-bold">Organization Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {organization?.name} • Director View
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
            <p className="text-xs text-muted-foreground">Org units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salary Pool</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salary_pool}</div>
            <p className="text-xs text-muted-foreground">WORK tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Pool</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loan_pool}</div>
            <p className="text-xs text-muted-foreground">WORK tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="structure" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Institution Structure</CardTitle>
              <CardDescription>Manage departments and organizational hierarchy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Structure management coming soon</p>
                <Button variant="outline">Configure Structure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Review and approve salary releases and loan requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No pending approvals</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Configure roles, permissions, and policies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Settings management coming soon</p>
                <Button variant="outline">Configure</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <CardDescription>View audit logs and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Reports coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Building2, Users, TrendingUp, AlertCircle } from 'lucide-react'

export default function DeanDashboard() {
  const [user, setUser] = useState<any>(null)
  const [unit, setUnit] = useState<any>(null)
  const [stats, setStats] = useState({ subdepts: 0, total_members: 0 })
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
          .select('id, email, name, organization_id, org_unit_id')
          .eq('id', authUser.id)
          .single()

        if (profile) {
          setUser(profile)

          // Get org unit details
          if (profile.org_unit_id) {
            const { data: orgUnit } = await supabase
              .from('org_units')
              .select('id, name, parent_id')
              .eq('id', profile.org_unit_id)
              .single()

            if (orgUnit) setUnit(orgUnit)

            // Get child departments
            const { data: childDepts } = await supabase
              .from('org_units')
              .select('id')
              .eq('parent_id', profile.org_unit_id)

            // Get all members in this subtree (this dept + children)
            const { data: members } = await supabase
              .from('users')
              .select('id')
              .eq('organization_id', profile.organization_id)
              .in('org_unit_id', [profile.org_unit_id, ...(childDepts?.map(d => d.id) || [])])

            setStats({
              subdepts: childDepts?.length || 0,
              total_members: members?.length || 0,
            })
          }
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
        <h1 className="text-3xl font-bold">Dean Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          {unit?.name} • Multi-Department Oversight
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subdepartments</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.subdepts}</div>
            <p className="text-xs text-muted-foreground">Departments under this dean</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_members}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">Escalations</TabsTrigger>
          <TabsTrigger value="comparison">Cross-Dept Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Subtree Dashboard</CardTitle>
              <CardDescription>Aggregate view of all departments and performance metrics within your scope</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Aggregated metrics coming soon</p>
                <Button variant="outline">View Details</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Escalations from Leads</CardTitle>
              <CardDescription>Review and approve escalations from OrgUnitLeads under your authority</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No pending escalations</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Cross-Department Analysis</CardTitle>
              <CardDescription>Compare performance, token circulation, and metrics across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Comparison view coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

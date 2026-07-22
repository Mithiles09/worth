'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, CheckCircle, AlertCircle, Wallet } from 'lucide-react'

export default function LeadDashboard() {
  const [user, setUser] = useState<any>(null)
  const [unit, setUnit] = useState<any>(null)
  const [stats, setStats] = useState({ team_members: 0, pending_verifications: 0, tasks_completed: 0 })
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

            // Get team stats
            const { data: teamMembers } = await supabase
              .from('users')
              .select('id')
              .eq('org_unit_id', profile.org_unit_id)
              .neq('id', authUser.id)

            setStats(prev => ({
              ...prev,
              team_members: teamMembers?.length || 0,
            }))
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
        <h1 className="text-3xl font-bold">Department Manager</h1>
        <p className="text-muted-foreground mt-2">
          {unit?.name} • {user?.email}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.team_members}</div>
            <p className="text-xs text-muted-foreground">Direct reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_verifications}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks_completed}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Dual Context Tabs */}
      <Tabs defaultValue="manager" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manager">Manager Context</TabsTrigger>
          <TabsTrigger value="employee">Employee Context</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Verification Queue</CardTitle>
              <CardDescription>Review task completions from your team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No pending verifications</p>
                <Button variant="outline">View Queue</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Monitor individual progress and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Team analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Schedule & Progress</CardTitle>
              <CardDescription>Your own work assignments and completion status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No scheduled work</p>
                <Button variant="outline">View Tasks</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Tasks</CardTitle>
              <CardDescription>Self-nominate for open opportunities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">No open tasks</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Users, CheckCircle, AlertCircle } from 'lucide-react'

export default function HODDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgUnit, setOrgUnit] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get user's org unit as lead
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('org_unit_id')
          .eq('user_id', user.id)
          .eq('scope_level', 'LEAD')
          .single()

        if (!userRoles?.org_unit_id) {
          setError('No department assigned')
          return
        }

        // Get org unit details
        const { data: unit } = await supabase
          .from('org_units')
          .select('*')
          .eq('id', userRoles.org_unit_id)
          .single()

        setOrgUnit(unit)

        // Get team members in this org unit
        const { data: members } = await supabase
          .from('user_roles')
          .select('user_id, users(*)')
          .eq('org_unit_id', userRoles.org_unit_id)
          .neq('scope_level', 'LEAD')

        setTeamMembers(members || [])
      } catch (err) {
        setError('Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
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
      <div>
        <h1 className="text-3xl font-bold">Department Management</h1>
        <p className="text-muted-foreground">
          {orgUnit?.name || 'Department'} · {teamMembers.length} members
        </p>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>View team progress and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <p className="text-muted-foreground">No team members found</p>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{member.users?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{member.users?.email}</p>
                        </div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salary Transfer Approvals</CardTitle>
              <CardDescription>Verify team member salary requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No pending approvals</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Pool</CardTitle>
              <CardDescription>Post unstructured tasks for your team</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No tasks posted yet</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

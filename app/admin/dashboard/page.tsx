'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Building2, Plus, LogOut, AlertCircle } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/admin/login')
          return
        }

        // FIX: Fetch everything (*) defensively to absorb schema column differences (org_id vs organization_id)
        // Also swapped .single() to .maybeSingle() to prevent silent catch crashes if user profile is missing
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (userError) {
          console.error('[DASHBOARD_PROFILE_ERROR]', userError)
          setSchemaError('Database communication error while loading admin profile details.')
          setIsLoading(false)
          return
        }

        if (!userData) {
          console.warn('[DASHBOARD_NO_PROFILE] Auth user exists but profile table row is missing.')
          setSchemaError(`Account authenticated successfully, but no matching row was found in your public 'users' table. Tip: Run a fresh signup test.`)
          setIsLoading(false)
          return
        }

        // Map whatever column is available inside your database schema dynamically
        const verifiedOrgId = userData.organization_id || userData.org_id

        setAdmin({
          id: userData.id,
          name: userData.name || userData.email,
          email: userData.email,
          organization_id: verifiedOrgId,
        })

        // Fetch all organizations safely using a wildcard mapping select
        const { data: orgs, error: orgsError } = await supabase
          .from('organizations')
          .select('*')

        if (orgsError) {
          console.error('[DASHBOARD_ORGS_FETCH_ERROR]', orgsError)
        }

        // Sort descending by creation timestamp via JavaScript engine to avoid remote sorting syntax errors
        const sortedOrgs = (orgs || []).sort((a: any, b: any) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        setOrganizations(sortedOrgs)
      } catch (err) {
        console.error('Unexpected exception loading admin dashboard:', err)
        setSchemaError('An unhandled app runtime boundary crash occurred.')
      } finally {
        setIsLoading(false)
      }
    }
    loadDashboard()
  }, [supabase, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold">Work Worth Admin</h1>
              <p className="text-xs text-muted-foreground">Vendor Console</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-medium">{admin?.name || admin?.email || 'Administrator'}</p>
                <p className="text-xs text-muted-foreground">Platform Admin</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2" >
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {schemaError && (
          <div className="mb-6 flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Profile Synchronization Alert</h3>
              <p className="text-xs mt-1 text-muted-foreground">{schemaError}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                className="mt-3 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 h-8"
              >
                Return to Login Page
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="organizations" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-96">
            <TabsTrigger value="organizations">Organizations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="organizations" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Organizations</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage all customer organizations
                </p>
              </div>
              <Button className="gap-2" disabled={!!schemaError}>
                <Plus className="h-4 w-4" /> New Organization
              </Button>
            </div>

            {organizations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No organizations registered on the platform yet
                  </p>
                  <Button disabled={!!schemaError}>Create First Organization</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => {
                  const targetOrgId = org.id || org.org_id
                  const rawType = org.type || 'ENTERPRISE'
                  
                  return (
                    <Card key={targetOrgId} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{org.name}</CardTitle>
                            <CardDescription className="text-xs mt-1 uppercase tracking-wider text-primary font-semibold">
                              {rawType.replace('_', ' ')}
                            </CardDescription>
                          </div>
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-4">
                          Registered:{' '}
                          {org.created_at ? new Date(org.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <Button variant="outline" className="w-full text-xs">
                          Manage Organization
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6 mt-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Platform Settings</h2>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{admin?.name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="font-medium">{admin?.email || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

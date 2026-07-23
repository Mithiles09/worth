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

        // FIX: Match the authentic structural table layout documented on Page 8
        const { data: adminData, error: adminError } = await supabase
          .from('platform_admins')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        if (adminError) {
          console.error('[DASHBOARD_REGISTRY_ERROR]', adminError)
          setSchemaError('Database communication error occurred while reading platform records.')
          setIsLoading(false)
          return
        }

        if (!adminData) {
          setSchemaError(`Profile synchronization incomplete: Identity missing from 'platform_admins' database registries.`)
          setIsLoading(false)
          return
        }

        setAdmin({
          id: adminData.id,
          name: adminData.name,
          email: adminData.email,
        })

        // Fetch all customer networks across your systems [Page 1]
        const { data: orgs } = await supabase
          .from('organizations')
          .select('*')

        setOrganizations(orgs || [])
      } catch (err) {
        console.error('Unexpected exception loading admin metrics:', err)
        setSchemaError('An unhandled system component boundary exception occurred.')
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
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold">Work Worth Admin</h1>
              <p className="text-xs text-muted-foreground">Vendor Console</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-medium">{admin?.name}</p>
                <p className="text-xs text-muted-foreground">Platform Admin</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {schemaError && (
          <div className="mb-6 flex gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">Access Synchronization Notice</h3>
              <p className="text-xs mt-1 text-muted-foreground">{schemaError}</p>
              <Button variant="outline" size="sm" onClick={handleLogout} className="mt-3 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 h-8">
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
                <p className="text-sm text-muted-foreground mt-1">Manage customer companies</p>
              </div>
              <Button className="gap-2" disabled={!!schemaError}>
                <Plus className="h-4 w-4" /> New Organization
              </Button>
            </div>

            {organizations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No organizations active yet</p>
                  <Button disabled={!!schemaError}>Create First Organization</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <Card key={org.org_id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{org.name}</CardTitle>
                          <CardDescription className="text-xs mt-1 uppercase text-primary font-semibold">
                            {(org.type || 'GENERIC').replace('_', ' ')}
                          </CardDescription>
                        </div>
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-4">
                        Registered: {new Date(org.created_at).toLocaleDateString()}
                      </div>
                      <Button variant="outline" className="w-full text-xs">Manage Organization</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">System Operator Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Admin Reference Identity</p>
                  <p className="font-medium">{admin?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verified Email Channel</p>
                  <p className="font-medium">{admin?.email}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Building2, Plus, LogOut } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          router.push('/admin/login')
          return
        }

        // Check if user exists in public.users table with PLATFORM_ADMIN context
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, organization_id')
          .eq('id', authUser.id)
          .single()

        if (!userData) {
          // User exists in auth but not in public schema - something went wrong
          await supabase.auth.signOut()
          router.push('/admin/login')
          return
        }

        setAdmin({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          organization_id: userData.organization_id,
        })

        // Fetch all organizations
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name, type, created_at')
          .order('created_at', { ascending: false })

        setOrganizations(orgs || [])
      } catch (err) {
        console.error('Error loading admin dashboard:', err)
        // On error, redirect to login
        router.push('/admin/login')
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
                <p className="font-medium">{admin?.name || admin?.email}</p>
                <p className="text-xs text-muted-foreground">Platform Admin</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Organization
              </Button>
            </div>

            {organizations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No organizations created yet
                  </p>
                  <Button>Create First Organization</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <Card key={org.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{org.name}</CardTitle>
                          <CardDescription className="text-xs mt-1">
                            {org.type.replace('_', ' ')}
                          </CardDescription>
                        </div>
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-4">
                        Created{' '}
                        {new Date(org.created_at).toLocaleDateString()}
                      </div>
                      <Button variant="outline" className="w-full text-xs">
                        Manage Organization
                      </Button>
                    </CardContent>
                  </Card>
                ))}
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
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{admin?.email}</p>
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

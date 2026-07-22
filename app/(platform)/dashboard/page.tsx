'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Building2, Plus } from 'lucide-react'

export default function PlatformDashboard() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadOrganizations() {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, type, created_at')
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrganizations(data || [])
      } catch (err) {
        console.error('Error loading organizations:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganizations()
  }, [supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground mt-1">Manage all tenant organizations</p>
          </div>
          <Button onClick={() => router.push('/platform/orgs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </div>

        {organizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No organizations yet</p>
              <Button onClick={() => router.push('/platform/orgs/new')}>
                Create Your First Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {organizations.map((org) => (
              <Card key={org.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {org.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Type: <span className="font-semibold">{org.type}</span>
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/platform/orgs/${org.id}`)}
                    >
                      Manage
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Wallet, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'

export default function FinanceDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [stats, setStats] = useState({ salaryPool: 0, loanPool: 0, totalTransactions: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadDashboard() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/login')
          return
        }

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

          // Get salary pool wallet
          const { data: salaryPoolWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('organization_id', profile.organization_id)
            .eq('purpose', 'SALARY_POOL')
            .maybeSingle()

          // Get loan pool wallet
          const { data: loanPoolWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('organization_id', profile.organization_id)
            .eq('purpose', 'LOAN_POOL')
            .maybeSingle()

          // Get transaction count
          const { count: transactionCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profile.organization_id)

          setStats({
            salaryPool: salaryPoolWallet?.balance || 0,
            loanPool: loanPoolWallet?.balance || 0,
            totalTransactions: transactionCount || 0,
          })
        }
      } catch (err) {
        console.error('Error loading finance dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [supabase, router])

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {organization?.name} • Financial Operations
          </p>
        </div>
      </div>

      {/* Pool Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salary Pool</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.salaryPool}</div>
            <p className="text-xs text-muted-foreground">WORK tokens available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Pool</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loanPool}</div>
            <p className="text-xs text-muted-foreground">WORK tokens reserved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">All-time record</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Controls */}
      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
          <TabsTrigger value="batch">Batch Process</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>Token Transaction Ledger</CardTitle>
              <CardDescription>Immutable record of all token movements and hash chain verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Ledger view coming soon</p>
                <Button variant="outline">View Full Ledger</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness">
          <Card>
            <CardHeader>
              <CardTitle>Department Readiness</CardTitle>
              <CardDescription>Per-department verification status for month-end batch processing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">Readiness table coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card>
            <CardHeader>
              <CardTitle>Batch Reverse Transfer</CardTitle>
              <CardDescription>
                Execute month-end batch reversal: transfer verified member tokens back to salary pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>⚠️ Caution:</strong> This is a highly sensitive operation. It atomically reverses all verified member wallets back to the organization&apos;s Salary Pool, restoring the original mint. This should only be executed once per month after verifying all department readiness.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-8">
                  <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Ready to process batch transfer</p>
                  <Button disabled className="opacity-50">
                    Trigger Batch Reverse Transfer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>Export payroll summaries and audit logs for reconciliation</CardDescription>
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

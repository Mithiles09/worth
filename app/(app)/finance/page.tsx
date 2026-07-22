'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, BarChart3, Lock } from 'lucide-react'

export default function FinanceDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wallets, setWallets] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Verify finance role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('scope_level', 'FINANCE_ADMIN')

        if (!roles || roles.length === 0) {
          setError('Insufficient permissions')
          return
        }

        // Get organization director wallets
        const { data: { user: userData } } = await supabase.auth.getUser()
        const { data: userOrg } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userData?.id)
          .single()

        if (!userOrg?.organization_id) {
          setError('Organization not found')
          return
        }

        // Get SALARY_POOL and LOAN_POOL wallets
        const { data: poolWallets } = await supabase
          .from('wallets')
          .select(`
            *,
            users(full_name, email)
          `)
          .in('purpose', ['SALARY_POOL', 'LOAN_POOL'])

        setWallets(poolWallets || [])
      } catch (err) {
        setError('Failed to load finance data')
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
        <h1 className="text-3xl font-bold">Ledger Dashboard</h1>
        <p className="text-muted-foreground">
          Month-end settlement and batch reversal controls
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Director Salary Wallet</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Tokens ready for reversal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Director Loan Pool</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Disbursement pool</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Release</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
            <p className="text-xs text-muted-foreground">Faculty ready for payout</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Month-End Settlement</h2>
        <Card>
          <CardHeader>
            <CardTitle>Batch Reversal Transfer</CardTitle>
            <CardDescription>Trigger the monthly batch that reverses salary tokens and unlocks real bank payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>
              Trigger Batch Reverse Transfer
            </Button>
            <p className="text-xs text-muted-foreground mt-3">Only available on last day of month at 23:00 UTC</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">All token transactions and reversals logged here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

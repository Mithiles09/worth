'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LedgerTableProps {
  organizationId: string
}

export function LedgerTable({ organizationId }: LedgerTableProps) {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function loadTransactions() {
      try {
        let query = supabase
          .from('transactions')
          .select(`
            id,
            transaction_hash,
            from_wallet_id,
            to_wallet_id,
            amount,
            transaction_type,
            status,
            created_at,
            from_wallet:from_wallet_id(id, balance, purpose),
            to_wallet:to_wallet_id(id, balance, purpose)
          `)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(50)

        const { data, error } = await query

        if (error) {
          console.error('Error fetching transactions:', error)
          return
        }

        setTransactions(data || [])
      } catch (err) {
        console.error('Error loading transactions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadTransactions()
  }, [organizationId, supabase])

  const filteredTransactions = transactions.filter((tx) =>
    tx.transaction_type.toLowerCase().includes(filter.toLowerCase()) ||
    tx.id.toLowerCase().includes(filter.toLowerCase()) ||
    tx.transaction_hash.toLowerCase().includes(filter.toLowerCase())
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Transaction Ledger</CardTitle>
            <CardDescription>Immutable record of all token movements</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
        </div>
        <div className="mt-4">
          <Input
            placeholder="Search by type, ID, or hash..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Type</th>
                <th className="text-left py-3 px-4 font-medium">From</th>
                <th className="text-left py-3 px-4 font-medium">To</th>
                <th className="text-right py-3 px-4 font-medium">Amount</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {tx.from_wallet?.purpose || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {tx.to_wallet?.purpose || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {tx.amount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          tx.status === 'COMPLETED'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {tx.transaction_hash.slice(0, 12)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

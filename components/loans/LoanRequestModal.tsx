'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertCircle } from 'lucide-react'

interface LoanRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  organizationId: string
  currentBalance: number
  onLoanRequested?: () => void
}

export function LoanRequestModal({
  open,
  onOpenChange,
  userId,
  organizationId,
  currentBalance,
  onLoanRequested,
}: LoanRequestModalProps) {
  const [loanAmount, setLoanAmount] = useState('')
  const [reason, setReason] = useState('')
  const [repaymentMonths, setRepaymentMonths] = useState('3')
  const [isLoading, setIsLoading] = useState(false)

  const maxLoanAmount = Math.max(0, 1000 - currentBalance)

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      const amount = parseInt(loanAmount)

      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid loan amount')
        return
      }

      if (amount > maxLoanAmount) {
        alert(`Maximum loan amount is ${maxLoanAmount} tokens`)
        return
      }

      if (!reason.trim()) {
        alert('Please provide a reason for the loan')
        return
      }

      const response = await fetch('/api/loans/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          amount,
          reason: reason.trim(),
          repaymentMonths: parseInt(repaymentMonths),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to request loan')
      }

      // Reset form
      setLoanAmount('')
      setReason('')
      setRepaymentMonths('3')
      onOpenChange(false)
      onLoanRequested?.()
    } catch (err) {
      console.error('Error requesting loan:', err)
      alert('Error requesting loan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Emergency Loan</DialogTitle>
          <DialogDescription>
            Request a short-term loan when your balance falls below threshold
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-900 dark:text-blue-300 flex gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Maximum Available: {maxLoanAmount} WORK tokens</p>
            <p className="text-xs mt-1">Based on your current balance and limits</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Loan Amount */}
          <div>
            <Label htmlFor="amount">Loan Amount (WORK tokens)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              max={maxLoanAmount}
              placeholder="e.g., 500"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              disabled={isLoading || maxLoanAmount === 0}
            />
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Reason for Loan</Label>
            <Textarea
              id="reason"
              placeholder="Explain why you need this loan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="min-h-20"
            />
          </div>

          {/* Repayment Period */}
          <div>
            <Label htmlFor="months">Repayment Period (Months)</Label>
            <Input
              id="months"
              type="number"
              min="1"
              max="12"
              value={repaymentMonths}
              onChange={(e) => setRepaymentMonths(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || maxLoanAmount === 0}
            variant={maxLoanAmount === 0 ? 'secondary' : 'default'}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Loan Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

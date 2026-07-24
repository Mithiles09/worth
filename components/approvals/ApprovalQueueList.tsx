'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ApprovalQueueListProps {
  userId: string
  organizationId: string
}

export function ApprovalQueueList({ userId, organizationId }: ApprovalQueueListProps) {
  const [approvals, setApprovals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadApprovals() {
      try {
        const { data, error } = await supabase
          .from('approvals')
          .select(`
            id,
            task_id,
            status,
            submitted_by,
            submission_proof,
            created_at,
            tasks:task_id(id, title, tokens)
          `)
          .eq('assigned_to_user_id', userId)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching approvals:', error)
          return
        }

        setApprovals(data || [])
      } catch (err) {
        console.error('Error loading approvals:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadApprovals()
  }, [userId, supabase])

  const handleApprove = async (approvalId: string) => {
    try {
      setActioningId(approvalId)

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          action: 'APPROVE',
          feedback: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve')
      }

      // Remove from list
      setApprovals(approvals.filter((a) => a.id !== approvalId))
    } catch (err) {
      console.error('Error approving:', err)
      alert('Error approving task')
    } finally {
      setActioningId(null)
    }
  }

  const handleReject = async (approvalId: string) => {
    try {
      setActioningId(approvalId)

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId,
          action: 'REJECT',
          feedback: 'Rejected by reviewer',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject')
      }

      // Remove from list
      setApprovals(approvals.filter((a) => a.id !== approvalId))
    } catch (err) {
      console.error('Error rejecting:', err)
      alert('Error rejecting task')
    } finally {
      setActioningId(null)
    }
  }

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
        <CardTitle>Approval Queue</CardTitle>
        <CardDescription>
          {approvals.length} pending task{approvals.length !== 1 ? 's' : ''} for approval
        </CardDescription>
      </CardHeader>

      <CardContent>
        {approvals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No pending approvals</p>
            <p className="text-xs text-muted-foreground">
              Tasks will appear here when team members submit their work
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium">{approval.tasks?.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {approval.tasks?.tokens} WORK tokens
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>

                <div className="bg-muted/50 p-3 rounded text-sm mb-3 max-h-24 overflow-y-auto">
                  <p className="text-muted-foreground">
                    {approval.submission_proof || 'No submission proof provided'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => handleApprove(approval.id)}
                    disabled={actioningId !== null}
                  >
                    {actioningId === approval.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={() => handleReject(approval.id)}
                    disabled={actioningId !== null}
                  >
                    {actioningId === approval.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, X } from 'lucide-react'

interface InviteMembersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  departments: { id: string; name: string }[]
}

export function InviteMembersModal({
  open,
  onOpenChange,
  organizationId,
  departments,
}: InviteMembersModalProps) {
  const [emails, setEmails] = useState<string[]>([''])
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [role, setRole] = useState<'MEMBER' | 'LEAD'>('MEMBER')
  const [isLoading, setIsLoading] = useState(false)

  const handleAddEmail = () => {
    setEmails([...emails, ''])
  }

  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index))
  }

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const handleSubmit = async () => {
    try {
      setIsLoading(true)

      const validEmails = emails.filter((email) => email.trim().length > 0)

      if (validEmails.length === 0) {
        alert('Please enter at least one email')
        return
      }

      if (!selectedDept) {
        alert('Please select a department')
        return
      }

      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: validEmails,
          organizationId,
          departmentId: selectedDept,
          role,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send invitations')
      }

      const result = await response.json()
      alert(`Invitations sent to ${result.sent} email(s)`)

      // Reset form
      setEmails([''])
      setSelectedDept('')
      setRole('MEMBER')
      onOpenChange(false)
    } catch (err) {
      console.error('Error sending invitations:', err)
      alert('Error sending invitations')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Send invitations to team members to join your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Department Selection */}
          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Selection */}
          <div>
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'MEMBER' | 'LEAD')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">Team Member</SelectItem>
                <SelectItem value="LEAD">Department Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Inputs */}
          <div>
            <Label>Email Addresses</Label>
            <div className="space-y-2 mt-2">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                  />
                  {emails.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEmail(index)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddEmail}
              disabled={isLoading}
              className="mt-2"
            >
              + Add Another Email
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

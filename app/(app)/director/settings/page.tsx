'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, CheckCircle, Loader2, Mail, Upload, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DirectorSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  // Single invite form
  const [singleInviteForm, setSingleInviteForm] = useState({
    email: '',
    name: '',
    role: 'MEMBER',
  })
  const [singleLoading, setSingleLoading] = useState(false)
  const [singleMessage, setSingleMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Bulk invite form
  const [bulkCSV, setBulkCSV] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  async function handleSingleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSingleLoading(true)
    setSingleMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Get current user's organization
      const { data: currentUser } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!currentUser?.organization_id) {
        throw new Error('Organization not found')
      }

      // Create invitation
      const { data: newInvite, error: inviteError } = await supabase
        .from('invitations')
        .insert({
          email: singleInviteForm.email,
          organization_id: currentUser.organization_id,
          role_id: singleInviteForm.role,
          invited_by_user_id: user.id,
          status: 'PENDING',
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        })
        .select()
        .single()

      if (inviteError) throw inviteError

      setSingleMessage({
        type: 'success',
        text: `Invitation sent to ${singleInviteForm.email}. They will receive an email with activation link.`,
      })

      // Reset form
      setSingleInviteForm({ email: '', name: '', role: 'MEMBER' })

      // Here you would send an email with the invitation link
      // For now, log it
      console.log('Invitation created:', {
        ...newInvite,
        inviteLink: `${window.location.origin}/accept-invite?token=${newInvite.token}`,
      })
    } catch (err: any) {
      setSingleMessage({
        type: 'error',
        text: err.message || 'Failed to send invitation',
      })
    } finally {
      setSingleLoading(false)
    }
  }

  async function handleBulkInvite(e: React.FormEvent) {
    e.preventDefault()
    setBulkLoading(true)
    setBulkMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get current user's organization
      const { data: currentUser } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!currentUser?.organization_id) throw new Error('Organization not found')

      // Parse CSV
      const lines = bulkCSV
        .trim()
        .split('\n')
        .filter((line) => line.trim())

      const invites = []
      let errorCount = 0

      for (const line of lines) {
        const [email, name, role = 'MEMBER'] = line.split(',').map((s) => s.trim())

        if (!email || !email.includes('@')) {
          errorCount++
          continue
        }

        invites.push({
          email,
          organization_id: currentUser.organization_id,
          role_id: role,
          invited_by_user_id: user.id,
          status: 'PENDING',
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
      }

      if (invites.length === 0) {
        throw new Error('No valid email addresses found in CSV')
      }

      const { error: insertError } = await supabase
        .from('invitations')
        .insert(invites)

      if (insertError) throw insertError

      setBulkMessage({
        type: 'success',
        text: `Successfully created ${invites.length} invitation(s)${
          errorCount > 0 ? ` (${errorCount} invalid entries skipped)` : ''
        }. Invitations sent via email.`,
      })

      setBulkCSV('')
    } catch (err: any) {
      setBulkMessage({
        type: 'error',
        text: err.message || 'Failed to process bulk invites',
      })
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Invite team members to join your organization
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="gap-2">
            <Users className="h-4 w-4" />
            Single Invite
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        {/* Single Invite Tab */}
        <TabsContent value="single">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
              <CardDescription>
                Send an invitation link to a new team member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSingleInvite} className="space-y-4">
                {singleMessage && (
                  <div
                    className={`flex gap-3 p-3 rounded-lg border ${
                      singleMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                        : 'bg-destructive/10 border-destructive/20'
                    }`}
                  >
                    {singleMessage.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <p
                      className={`text-sm ${
                        singleMessage.type === 'success'
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-destructive'
                      }`}
                    >
                      {singleMessage.text}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={singleInviteForm.email}
                      onChange={(e) =>
                        setSingleInviteForm({
                          ...singleInviteForm,
                          email: e.target.value,
                        })
                      }
                      required
                      disabled={singleLoading}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={singleInviteForm.name}
                      onChange={(e) =>
                        setSingleInviteForm({
                          ...singleInviteForm,
                          name: e.target.value,
                        })
                      }
                      disabled={singleLoading}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="font-semibold">
                    Role
                  </Label>
                  <select
                    id="role"
                    value={singleInviteForm.role}
                    onChange={(e) =>
                      setSingleInviteForm({
                        ...singleInviteForm,
                        role: e.target.value,
                      })
                    }
                    disabled={singleLoading}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="MEMBER">Member (Faculty)</option>
                    <option value="ORG_UNIT_LEAD">Department Lead (HOD)</option>
                    <option value="DEAN">Dean</option>
                    <option value="FINANCE_ADMIN">Finance Admin</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-semibold gap-2"
                  disabled={
                    singleLoading ||
                    !singleInviteForm.email ||
                    !singleInviteForm.name
                  }
                >
                  {singleLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {singleLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab */}
        <TabsContent value="bulk">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Bulk Import</CardTitle>
              <CardDescription>
                Import multiple team members via CSV. Format: email, name, role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkInvite} className="space-y-4">
                {bulkMessage && (
                  <div
                    className={`flex gap-3 p-3 rounded-lg border ${
                      bulkMessage.type === 'success'
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                        : 'bg-destructive/10 border-destructive/20'
                    }`}
                  >
                    {bulkMessage.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <p
                      className={`text-sm ${
                        bulkMessage.type === 'success'
                          ? 'text-green-800 dark:text-green-300'
                          : 'text-destructive'
                      }`}
                    >
                      {bulkMessage.text}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="csv" className="font-semibold">
                    CSV Data
                  </Label>
                  <Textarea
                    id="csv"
                    placeholder={`alice@example.com, Alice Johnson, MEMBER
bob@example.com, Bob Smith, ORG_UNIT_LEAD
carol@example.com, Carol Davis, FINANCE_ADMIN`}
                    value={bulkCSV}
                    onChange={(e) => setBulkCSV(e.target.value)}
                    required
                    disabled={bulkLoading}
                    className="font-mono text-xs min-h-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    One person per line. Separate with commas. Roles: MEMBER,
                    ORG_UNIT_LEAD, DEAN, FINANCE_ADMIN
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-semibold gap-2"
                  disabled={bulkLoading || !bulkCSV.trim()}
                >
                  {bulkLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {bulkLoading ? 'Processing...' : 'Import Team Members'}
                </Button>
              </form>

              {/* CSV Format Help */}
              <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                <h4 className="font-semibold text-sm mb-2">CSV Format</h4>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <div>email, full_name, role</div>
                  <div className="text-foreground mt-2">Example:</div>
                  <div>john@college.edu, John Doe, MEMBER</div>
                  <div>jane@college.edu, Jane Smith, ORG_UNIT_LEAD</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
              1
            </div>
            <div>
              <p className="font-medium">Send Invitation</p>
              <p className="text-muted-foreground">
                Team members receive an email with a secure link
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
              2
            </div>
            <div>
              <p className="font-medium">Create Password</p>
              <p className="text-muted-foreground">
                They set a strong password to activate their account
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
              3
            </div>
            <div>
              <p className="font-medium">Ready to Use</p>
              <p className="text-muted-foreground">
                They can immediately login and start using their dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

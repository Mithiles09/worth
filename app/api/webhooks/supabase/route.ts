import { createClient } from '@/lib/supabase/server'
import { verifyWebhookSignature } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Get signature from headers
    const signature = req.headers.get('x-supabase-signature')
    const body = await req.text()

    if (!signature) {
      console.error('[WEBHOOK] Missing signature')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify signature
    const secret = process.env.WEBHOOK_SIGNATURE_SECRET
    if (!secret) {
      console.error('[WEBHOOK] Missing WEBHOOK_SIGNATURE_SECRET env var')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const isValid = verifyWebhookSignature(body, signature, secret)
    if (!isValid) {
      console.error('[WEBHOOK] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)
    console.log('[WEBHOOK] Received event:', event.type)

    const supabase = await createClient()

    // Handle user.created event
    if (event.type === 'user.created') {
      const user = event.data

      if (!user?.id || !user?.email) {
        return NextResponse.json(
          { error: 'Invalid user data' },
          { status: 400 }
        )
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (existingProfile) {
        console.log('[WEBHOOK] Profile already exists for user', user.id)
        return NextResponse.json({ success: true, message: 'Profile already exists' })
      }

      // Extract metadata
      const firstName = user.user_metadata?.firstName || 'User'
      const lastName = user.user_metadata?.lastName || ''
      const role = user.user_metadata?.role || 'MEMBER'
      const orgId = user.user_metadata?.org_id || null

      // Create profile in public.users
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          user_id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          org_id: orgId,
          role: role,
          status: 'ACTIVE',
          created_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error('[WEBHOOK] Failed to create profile:', profileError)
        return NextResponse.json(
          { error: 'Failed to create profile', details: profileError },
          { status: 500 }
        )
      }

      console.log('[WEBHOOK] Profile created for user', user.id, 'with role', role)
      return NextResponse.json(
        { success: true, message: 'Profile created' },
        { status: 201 }
      )
    }

    // Handle user.deleted event
    if (event.type === 'user.deleted') {
      const user = event.data

      if (!user?.id) {
        return NextResponse.json(
          { error: 'Invalid user data' },
          { status: 400 }
        )
      }

      // Soft delete or hard delete user profile
      const { error: deleteError } = await supabase
        .from('users')
        .update({ status: 'DELETED', deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('[WEBHOOK] Failed to delete profile:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete profile', details: deleteError },
          { status: 500 }
        )
      }

      console.log('[WEBHOOK] Profile marked as deleted for user', user.id)
      return NextResponse.json({ success: true, message: 'Profile deleted' })
    }

    // Handle user.updated event
    if (event.type === 'user.updated') {
      const user = event.data

      if (!user?.id) {
        return NextResponse.json(
          { error: 'Invalid user data' },
          { status: 400 }
        )
      }

      const firstName = user.user_metadata?.firstName
      const lastName = user.user_metadata?.lastName

      if (firstName || lastName) {
        const updateData: any = {}
        if (firstName) updateData.first_name = firstName
        if (lastName) updateData.last_name = lastName

        const { error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('[WEBHOOK] Failed to update profile:', updateError)
          return NextResponse.json(
            { error: 'Failed to update profile', details: updateError },
            { status: 500 }
          )
        }

        console.log('[WEBHOOK] Profile updated for user', user.id)
      }

      return NextResponse.json({ success: true, message: 'Profile updated' })
    }

    // Unknown event type
    console.log('[WEBHOOK] Unknown event type:', event.type)
    return NextResponse.json({ success: true, message: 'Event received' })
  } catch (error) {
    console.error('[WEBHOOK_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

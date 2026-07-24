'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { getPlatformAdmin } from '@/lib/auth-helpers'

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/platform/login')
        return
      }

      // Check if this user is a platform admin
      const admin = await getPlatformAdmin(user.id)

      if (!admin) {
        // Not a platform admin - redirect to tenant login
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [supabase, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}

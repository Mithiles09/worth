'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is logged in - redirect to their dashboard
        router.push('/dashboard');
      } else {
        // User not logged in - check for platform admin path hint
        const url = new URL(window.location.href);
        const isAdmin = url.searchParams.get('admin') === 'true';
        
        if (isAdmin) {
          router.push('/admin/login');
        } else {
          router.push('/login');
        }
      }
    }

    checkAuth();
  }, [router, supabase]);

  return null;
}

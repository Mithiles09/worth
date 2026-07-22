'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Sidebar, getSidebarItemsForRole } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  contextToggle?: {
    contexts: string[];
    current: string;
    onSwitch: (context: string) => void;
  };
}

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
  contextToggle,
}: AppLayoutProps) {
  const { session, primaryRole } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  if (!session || !primaryRole) {
    React.useEffect(() => {
      router.push('/login');
    }, [router]);
    return null;
  }

  const roleName = primaryRole.toLowerCase().replace('_', '-');
  const sidebarItems = getSidebarItemsForRole(roleName);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar items={sidebarItems} />

      {/* Main Content Area */}
      <div className="ml-64 flex-1 flex flex-col">
        {/* Header */}
        <Header
          title={title}
          subtitle={subtitle}
          actions={actions}
          contextToggle={contextToggle}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto pt-16">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

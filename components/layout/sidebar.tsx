'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  CheckCircle2,
  Users,
  Briefcase,
  Settings,
  LogOut,
  FileText,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  items: SidebarItem[];
  className?: string;
}

export function Sidebar({ items, className }: SidebarProps) {
  const { logout, primaryRole } = useAuth();

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card',
      className
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-border p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              W
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Work Worth</span>
              <span className="text-xs text-muted-foreground capitalize">
                {primaryRole?.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'active:bg-primary active:text-primary-foreground'
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-2">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function getSidebarItemsForRole(role: string): SidebarItem[] {
  const baseItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      href: `/${role}/dashboard`,
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
  ];

  const roleItems: Record<string, SidebarItem[]> = {
    director: [
      {
        label: 'Institution Structure',
        href: '/director/structure',
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        label: 'Approvals',
        href: '/director/approvals',
        icon: <CheckCircle2 className="h-4 w-4" />,
        badge: 3,
      },
      {
        label: 'Finance',
        href: '/director/finance',
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        label: 'Settings',
        href: '/director/settings',
        icon: <Settings className="h-4 w-4" />,
      },
      {
        label: 'Reports',
        href: '/director/reports',
        icon: <FileText className="h-4 w-4" />,
      },
    ],
    hod: [
      {
        label: 'Department Management',
        href: '/hod/department',
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: 'Task Pool',
        href: '/hod/tasks',
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      {
        label: 'Team',
        href: '/hod/team',
        icon: <Users className="h-4 w-4" />,
      },
      {
        label: 'Approvals',
        href: '/hod/approvals',
        icon: <CheckCircle2 className="h-4 w-4" />,
        badge: 2,
      },
    ],
    member: [
      {
        label: 'Task Marketplace',
        href: '/member/marketplace',
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        label: 'My Active Commitments',
        href: '/member/commitments',
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
      {
        label: 'Credits & Loans',
        href: '/member/credits',
        icon: <Briefcase className="h-4 w-4" />,
      },
    ],
    finance: [
      {
        label: 'Ledger Dashboard',
        href: '/finance/ledger',
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        label: 'Approvals',
        href: '/finance/approvals',
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ],
  };

  return [...baseItems, ...(roleItems[role] || [])];
}

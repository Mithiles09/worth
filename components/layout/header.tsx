'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  contextToggle?: {
    contexts: string[];
    current: string;
    onSwitch: (context: string) => void;
  };
}

export function Header({ title, subtitle, actions, contextToggle }: HeaderProps) {
  const { session, primaryRole, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="fixed right-0 top-0 z-30 h-16 border-b border-border bg-card w-[calc(100%-16rem)]">
      <div className="flex h-full items-center justify-between px-6">
        {/* Left: Title & Subtitle */}
        <div className="flex-1">
          {title && <h1 className="text-xl font-bold">{title}</h1>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Center: Context Toggle (for dual-role users) */}
        {contextToggle && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Context:</span>
            <div className="flex gap-1 rounded-lg bg-accent p-1">
              {contextToggle.contexts.map((ctx) => (
                <button
                  key={ctx}
                  onClick={() => contextToggle.onSwitch(ctx)}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    contextToggle.current === ctx
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {ctx}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          {actions}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-full p-2 hover:bg-accent transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 rounded-lg border border-border bg-card shadow-lg p-4">
                <p className="text-sm font-semibold">Notifications</p>
                <div className="mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground p-2 bg-accent rounded">
                    No new notifications
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-accent transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {session?.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start gap-0">
                <span className="text-sm font-medium">{session?.user.name}</span>
                <span className="text-xs text-muted-foreground">{primaryRole?.toLowerCase().replace('_', ' ')}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 w-48 rounded-lg border border-border bg-card shadow-lg p-2">
                <button className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent transition-colors text-destructive"
                >
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

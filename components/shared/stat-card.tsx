'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    isPositive?: boolean;
  };
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  action,
  className,
  variant = 'default',
}: StatCardProps) {
  const variantClasses = {
    default: 'border-border',
    primary: 'border-primary/30 bg-primary/5',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };

  return (
    <Card className={cn(variantClasses[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex flex-col">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {icon && <div className="text-2xl">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <div className={cn(
                'text-xs font-semibold mt-2 flex items-center gap-1',
                trend.isPositive !== false ? 'text-green-600' : 'text-red-600'
              )}>
                <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

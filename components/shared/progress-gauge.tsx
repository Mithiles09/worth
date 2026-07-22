'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProgressGaugeProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  percentage?: number;
  showPercentage?: boolean;
  status?: 'success' | 'warning' | 'error';
  subtitle?: string;
}

export function ProgressGauge({
  label,
  current,
  target,
  unit = '',
  percentage,
  showPercentage = true,
  status = 'warning',
  subtitle,
}: ProgressGaugeProps) {
  const calculatedPercentage = percentage || Math.round((current / target) * 100);
  const isSuccess = calculatedPercentage >= 85;

  const statusColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  const getStatusFromPercentage = (pct: number) => {
    if (pct >= 85) return 'success';
    if (pct >= 70) return 'warning';
    return 'error';
  };

  const finalStatus = status === 'warning' ? getStatusFromPercentage(calculatedPercentage) : status;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          {/* Circular Gauge */}
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(calculatedPercentage / 100) * Math.PI * 100} ${Math.PI * 100}`}
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-500',
                  finalStatus === 'success' && 'text-green-500',
                  finalStatus === 'warning' && 'text-yellow-500',
                  finalStatus === 'error' && 'text-red-500'
                )}
              />
            </svg>
            {/* Center text */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold">{calculatedPercentage}%</span>
              {showPercentage && <span className="text-xs text-muted-foreground">Completed</span>}
            </div>
          </div>

          {/* Stats */}
          <div className="w-full text-center">
            <div className="text-sm font-medium">
              {current}
              {unit && <span className="text-muted-foreground">{unit}</span>} / {target}
              {unit && <span className="text-muted-foreground">{unit}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {isSuccess ? 'Target achieved' : `${target - current} remaining`}
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            'w-full py-2 px-3 rounded text-center text-xs font-semibold',
            finalStatus === 'success' && 'bg-green-500/20 text-green-700 dark:text-green-400',
            finalStatus === 'warning' && 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
            finalStatus === 'error' && 'bg-red-500/20 text-red-700 dark:text-red-400'
          )}>
            {finalStatus === 'success' && 'On Track'}
            {finalStatus === 'warning' && 'Close to Target'}
            {finalStatus === 'error' && 'Below Target'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

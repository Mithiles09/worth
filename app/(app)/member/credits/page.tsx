'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { ProgressGauge } from '@/components/shared/progress-gauge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function CreditsAndLoansPage() {
  const [credits] = useState({
    earned: 78.5,
    target: 100,
    threshold: 85,
  });

  const [isAboveThreshold] = useState(credits.earned >= credits.threshold);

  const [loanHistory] = useState([
    {
      id: 1,
      amount: 5000,
      remaining: 3000,
      reason: 'Month 1 Shortfall',
      status: 'ACTIVE',
      issued_at: '2026-01-31',
      due_by: '2026-03-15',
      debt_cleared: 2000,
    },
  ]);

  return (
    <AppLayout
      title="Credits & Loans"
      subtitle="Month-end eligibility and loan management"
    >
      <div className="space-y-6">
        {/* Main Progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProgressGauge
            label="Monthly Progress"
            current={credits.earned}
            target={credits.target}
            percentage={Math.round((credits.earned / credits.target) * 100)}
            subtitle="Target: 100 credits"
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Threshold</CardTitle>
              <CardDescription>Salary eligibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{credits.threshold}%</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    isAboveThreshold
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                      : 'bg-red-500/20 text-red-700 dark:text-red-400'
                  }`}>
                    {isAboveThreshold ? 'ELIGIBLE' : 'INELIGIBLE'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAboveThreshold
                    ? 'You have met the salary threshold'
                    : `${(credits.threshold - Math.round((credits.earned / credits.target) * 100))}% away from threshold`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Month-End Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isAboveThreshold ? (
                <Button className="w-full" size="lg">
                  Initiate My Salary
                </Button>
              ) : (
                <Button variant="outline" className="w-full" size="lg">
                  Request Loan
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                {isAboveThreshold
                  ? 'Request salary release to Director'
                  : 'Cover shortfall with loan (with debt clearance obligation)'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>How Month-End Works</AlertTitle>
          <AlertDescription>
            If you&apos;ve earned ≥85% of your target credits, you can &quot;Initiate My Salary&quot; for fiat release on the next salary day.
            If below 85%, you can request a loan instead, but you must complete additional debt-clearance tasks in the following cycle.
          </AlertDescription>
        </Alert>

        {/* Loan History */}
        {loanHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Loan History</CardTitle>
              <CardDescription>Your outstanding loans and repayment status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loanHistory.map((loan) => (
                <div key={loan.id} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{loan.reason}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued: {new Date(loan.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      loan.status === 'ACTIVE'
                        ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-green-500/20 text-green-700 dark:text-green-400'
                    }`}>
                      {loan.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Original Amount</p>
                      <p className="font-semibold">{loan.amount}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Remaining</p>
                      <p className="font-semibold text-yellow-600">{loan.remaining}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Already Cleared</p>
                      <p className="font-semibold text-green-600">{loan.debt_cleared}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Due By</p>
                      <p className="font-semibold">{new Date(loan.due_by).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Repayment Progress */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Repayment Progress</p>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-green-500"
                        style={{ width: `${(loan.debt_cleared / loan.amount) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {((loan.debt_cleared / loan.amount) * 100).toFixed(0)}% cleared
                    </p>
                  </div>

                  <div className="bg-accent p-3 rounded text-xs">
                    <p className="font-semibold flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3" />
                      How to Clear This Loan
                    </p>
                    <p className="text-muted-foreground">
                      Complete debt-clearance tasks posted by your HOD. Each completed task reduces your remaining balance.
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Debt Clearance Tasks (if active loan) */}
        {loanHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Debt Clearance Opportunities</CardTitle>
              <CardDescription>Extra tasks tagged for loan repayment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">Class Observation & Reporting</p>
                      <p className="text-xs text-muted-foreground mt-1">Help junior faculty with class delivery</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">500</p>
                      <p className="text-xs text-muted-foreground">credits toward loan</p>
                    </div>
                  </div>
                  <Button className="w-full mt-3" size="sm" variant="outline">
                    Accept Task
                  </Button>
                </div>

                <div className="p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">Student Mentoring Program</p>
                      <p className="text-xs text-muted-foreground mt-1">Mentor 2-3 struggling students</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">800</p>
                      <p className="text-xs text-muted-foreground">credits toward loan</p>
                    </div>
                  </div>
                  <Button className="w-full mt-3" size="sm" variant="outline">
                    Accept Task
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

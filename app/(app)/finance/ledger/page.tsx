'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, Wallet } from 'lucide-react';

export default function FinanceLedgerPage() {
  const [walletStats] = useState({
    salaryReady: '324500',
    loanPool: '100000',
    directorSalaryWallet: '500000',
    pendingReversal: 12,
  });

  const [facultyReadiness] = useState([
    { dept: 'Computer Science', eligible: 22, total: 25, avgProgress: 88 },
    { dept: 'Mechanical Eng', eligible: 18, total: 22, avgProgress: 76 },
    { dept: 'Electrical Eng', eligible: 26, total: 28, avgProgress: 92 },
    { dept: 'Civil Eng', eligible: 14, total: 18, avgProgress: 68 },
  ]);

  const [auditLog] = useState([
    { id: 1, action: 'SALARY_TRANSFER', from: 'Director-Salary', to: 'Prof. Rajesh', amount: '45000', timestamp: '2026-02-07 10:30' },
    { id: 2, action: 'LOAN_ISSUE', from: 'Director-Loan', to: 'Prof. Priya', amount: '10000', timestamp: '2026-02-07 09:15' },
    { id: 3, action: 'BATCH_REVERSAL', from: 'Faculty Pool', to: 'Director-Salary', amount: '324500', timestamp: '2026-02-01 18:00' },
  ]);

  return (
    <AppLayout
      title="Ledger Dashboard"
      subtitle="Financial settlement and token flow"
    >
      <div className="space-y-6">
        {/* Main Finance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Ready for Reversal"
            value={walletStats.salaryReady}
            description="Faculty total balance"
            icon={<Wallet className="h-6 w-6 text-blue-500" />}
            variant="primary"
          />
          <StatCard
            title="Director-Salary Wallet"
            value={walletStats.directorSalaryWallet}
            description="Monthly budget pool"
            icon={<Wallet className="h-6 w-6 text-green-500" />}
            variant="success"
          />
          <StatCard
            title="Loan Pool"
            value={walletStats.loanPool}
            description="Director-Loan wallet"
            icon={<Wallet className="h-6 w-6 text-yellow-500" />}
            variant="warning"
          />
          <StatCard
            title="Pending Action"
            value={walletStats.pendingReversal}
            description="Faculty awaiting release"
            icon={<AlertCircle className="h-6 w-6 text-orange-500" />}
          />
        </div>

        {/* Month-End Actions */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Month-End Settlement</CardTitle>
            <CardDescription>Critical operations for salary release</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button size="lg" variant="outline" className="w-full">
                View Faculty Readiness
              </Button>
              <Button size="lg" variant="default" className="w-full">
                Trigger Batch Reversal
              </Button>
              <Button size="lg" variant="outline" className="w-full">
                Release Fiat Salary
              </Button>
            </div>
            <p className="text-xs text-muted-foreground bg-yellow-500/10 p-3 rounded border border-yellow-500/30">
              Batch Reversal transfers all faculty tokens back to Director-Salary wallet, restoring the original minted amount. This must happen before fiat salary release.
            </p>
          </CardContent>
        </Card>

        {/* Faculty Readiness Table */}
        <Card>
          <CardHeader>
            <CardTitle>Faculty Readiness by Department</CardTitle>
            <CardDescription>Eligible members for salary release</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {facultyReadiness.map((item) => (
                <div key={item.dept} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.dept}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-green-600">{item.eligible}</span> / {item.total} eligible
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                            style={{ width: `${(item.eligible / item.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{((item.eligible / item.total) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{item.avgProgress.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">avg progress</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Token flow audit trail</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditLog.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-accent">
                        {log.action.replace('_', ' ')}
                      </span>
                      <p className="font-medium text-sm">{log.from} → {log.to}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{log.amount}</p>
                    <p className="text-xs text-muted-foreground">WORK tokens</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

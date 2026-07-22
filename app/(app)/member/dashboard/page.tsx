'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { ProgressGauge } from '@/components/shared/progress-gauge';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calendar, Clock, Award } from 'lucide-react';

export default function MemberDashboardPage() {
  // Mock data
  const [credits] = useState({
    earned: 78.5,
    target: 100,
    threshold: 85,
  });

  const [tokenBalance] = useState({
    personal: '0',
    inTransit: '0',
    total: '0',
  });

  const [weeklySchedule] = useState([
    { id: 1, date: 'Mon, Feb 3', title: 'Advanced Algorithms Class', type: 'STRUCTURED', time: '10:00 AM - 11:30 AM', status: 'pending' },
    { id: 2, date: 'Tue, Feb 4', title: 'Lab Session - Web Dev', type: 'STRUCTURED', time: '2:00 PM - 4:00 PM', status: 'pending' },
    { id: 3, date: 'Wed, Feb 5', title: 'Exam Invigilation', type: 'UNSTRUCTURED', time: '9:00 AM - 1:00 PM', status: 'pending' },
    { id: 4, date: 'Thu, Feb 6', title: 'Student Counseling', type: 'UNSTRUCTURED', time: '3:00 PM - 5:00 PM', status: 'pending' },
    { id: 5, date: 'Fri, Feb 7', title: 'Department Meeting', type: 'UNSTRUCTURED', time: '11:00 AM - 12:30 PM', status: 'pending' },
  ]);

  const [loans] = useState([
    { id: 1, amount: '5000', reason: 'Month 1 Shortfall', status: 'ACTIVE', remaining: '3000' },
  ]);

  const isAboveThreshold = credits.earned >= credits.threshold;
  const shortfall = Math.max(0, credits.target - credits.earned);

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Your work progress and performance"
    >
      <div className="space-y-6">
        {/* Alert if below threshold */}
        {!isAboveThreshold && (
          <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-600">Below Target</p>
              <p className="text-sm text-red-600/80 mt-1">
                You need {shortfall.toFixed(1)} more credits to reach the 85% threshold. Complete more tasks to become salary-eligible.
              </p>
            </div>
          </div>
        )}

        {/* Main Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <ProgressGauge
            label="Monthly Credits Progress"
            current={credits.earned}
            target={credits.target}
            percentage={Math.round((credits.earned / credits.target) * 100)}
            subtitle="85% threshold required"
          />
          
          <StatCard
            title="Personal Wallet"
            value={tokenBalance.personal}
            description="WORK tokens"
            icon={<Award className="h-6 w-6 text-primary" />}
            variant="primary"
          />

          <StatCard
            title="In Transit"
            value={tokenBalance.inTransit}
            description="Awaiting verification"
            icon={<Clock className="h-6 w-6 text-yellow-500" />}
            variant="warning"
          />

          <StatCard
            title="Total Balance"
            value={tokenBalance.total}
            description="All tokens"
            icon={<Award className="h-6 w-6 text-green-500" />}
            variant="success"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            disabled={!isAboveThreshold}
            variant={isAboveThreshold ? 'default' : 'secondary'}
            size="lg"
          >
            {isAboveThreshold ? 'Initiate My Salary' : 'Eligible on 85% completion'}
          </Button>
          <Button
            disabled={isAboveThreshold}
            variant={!isAboveThreshold ? 'outline' : 'secondary'}
            size="lg"
          >
            {!isAboveThreshold ? 'Raise Loan Request' : 'Not eligible - target met'}
          </Button>
        </div>

        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>This Week&apos;s Schedule</CardTitle>
            <CardDescription>Your structured and unstructured work commitments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklySchedule.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.date} • {item.time}</p>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded mt-1 ${
                        item.type === 'STRUCTURED'
                          ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          : 'bg-purple-500/20 text-purple-700 dark:text-purple-400'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Mark Attendance
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loan History */}
        {loans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Loans</CardTitle>
              <CardDescription>Your outstanding loan balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{loan.reason}</p>
                      <p className="text-xs text-muted-foreground">Remaining: {loan.remaining} WORK tokens</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{loan.amount}</p>
                      <span className="text-xs text-yellow-600 bg-yellow-500/20 px-2 py-0.5 rounded">
                        {loan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

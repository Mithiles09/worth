'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { StatCard } from '@/components/shared/stat-card';
import { ProgressGauge } from '@/components/shared/progress-gauge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export default function HODDashboardPage() {
  const [teamStats] = useState({
    members: 24,
    avgProgress: 78.5,
    targetMet: 18,
    loanRequests: 3,
  });

  const [teamMembers] = useState([
    { id: 1, name: 'Dr. Rajesh Patel', progress: 92, credits: 95, status: 'on-track' },
    { id: 2, name: 'Dr. Priya Sharma', progress: 78, credits: 78, status: 'at-risk' },
    { id: 3, name: 'Dr. Amit Singh', progress: 45, credits: 45, status: 'critical' },
    { id: 4, name: 'Dr. Neha Desai', progress: 88, credits: 90, status: 'on-track' },
  ]);

  const [pendingApprovals] = useState([
    { id: 1, type: 'SALARY_TRANSFER', user: 'Prof. Rajesh', amount: '45000', status: 'pending' },
    { id: 2, type: 'SALARY_TRANSFER', user: 'Prof. Priya', amount: '40000', status: 'pending' },
  ]);

  const [openTasks] = useState([
    { id: 1, title: 'Exam Invigilation - Sem 2', credits: 500, volunteers: 3, deadline: 'Feb 10' },
    { id: 2, title: 'Student Project Review', credits: 300, volunteers: 1, deadline: 'Feb 8' },
  ]);

  return (
    <AppLayout
      title="Department Dashboard"
      subtitle="Team performance and approvals"
      contextToggle={{
        contexts: ['Employee Context', 'Manager Context'],
        current: 'Manager Context',
        onSwitch: () => { },
      }}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Team Members"
            value={teamStats.members}
            description="In your department"
            icon={<Users className="h-6 w-6 text-blue-500" />}
          />
          <StatCard
            title="Avg. Progress"
            value={`${teamStats.avgProgress.toFixed(1)}%`}
            description="Monthly credits"
            icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
          />
          <StatCard
            title="Target Met"
            value={teamStats.targetMet}
            description="Members eligible"
            icon={<CheckCircle2 className="h-6 w-6 text-green-500" />}
            variant="success"
          />
          <StatCard
            title="Loan Requests"
            value={teamStats.loanRequests}
            description="Pending approval"
            icon={<AlertTriangle className="h-6 w-6 text-yellow-500" />}
            variant="warning"
          />
        </div>

        {/* My Progress (Employee Context Switch) */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-sm">Your Personal Progress</CardTitle>
            <CardDescription>You have dual roles: Manager & Team Member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ProgressGauge
                label="Your Credits"
                current={88}
                target={100}
                percentage={88}
                subtitle="As employee"
              />
              <StatCard
                title="My Personal Wallet"
                value="22500"
                description="WORK tokens"
                icon={<CheckCircle2 className="h-6 w-6" />}
              />
              <div className="flex flex-col justify-between gap-2">
                <Button variant="outline" className="w-full">
                  Switch to Employee Context
                </Button>
                <Button variant="outline" className="w-full">
                  My Commitments
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Salary Transfer Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Salary Approvals</CardTitle>
              <CardDescription>Your verification required</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{approval.user}</p>
                    <p className="text-xs text-muted-foreground mt-1">{approval.amount} WORK tokens</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Review</Button>
                    <Button size="sm" variant="default">Approve</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Open Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Your Open Tasks</CardTitle>
              <CardDescription>Posted to marketplace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {openTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{task.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{task.credits} credits • Deadline: {task.deadline}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{task.volunteers}</span>
                    <p className="text-xs text-muted-foreground">nominated</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Team Members Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Individual progress tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            member.status === 'on-track'
                              ? 'bg-green-500'
                              : member.status === 'at-risk'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${member.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold">{member.credits} credits</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      member.status === 'on-track'
                        ? 'bg-green-500/20 text-green-600'
                        : member.status === 'at-risk'
                        ? 'bg-yellow-500/20 text-yellow-600'
                        : 'bg-red-500/20 text-red-600'
                    }`}>
                      {member.status.replace('-', ' ')}
                    </span>
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

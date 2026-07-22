'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Wallet, AlertCircle } from 'lucide-react';

export default function DirectorDashboardPage() {
  const [stats] = useState({
    salaryMinted: '500000',
    loanMinted: '100000',
    tokensInCirculation: '324500',
    activeLoanCount: 12,
  });

  const [departments] = useState([
    { name: 'Computer Science', completion: 88, avgProgress: 82, tokens: '45000', members: 25 },
    { name: 'Mechanical Eng', completion: 76, avgProgress: 71, tokens: '38000', members: 22 },
    { name: 'Electrical Eng', completion: 92, avgProgress: 87, tokens: '51000', members: 28 },
    { name: 'Civil Eng', completion: 68, avgProgress: 64, tokens: '32000', members: 18 },
  ]);

  const [approvals] = useState([
    { id: 1, type: 'LOAN_REQUEST', user: 'Prof. Ajay Kumar', amount: '15000', org_unit: 'CS Dept', status: 'PENDING' },
    { id: 2, type: 'STRUCTURE_CHANGE', user: 'System', description: 'New HOD assignment', org_unit: 'ME Dept', status: 'PENDING' },
    { id: 3, type: 'SALARY_BATCH', user: 'Finance Admin', description: 'Month-end reversal', org_unit: 'Institution', status: 'PENDING' },
  ]);

  const [circularData] = useState([
    { name: 'Salary Transfers', value: 320000, fill: '#3b82f6' },
    { name: 'Loan Issues', value: 85000, fill: '#f59e0b' },
    { name: 'Task Rewards', value: 45000, fill: '#10b981' },
    { name: 'Reversed', value: 324500, fill: '#6366f1' },
  ]);

  const [trendData] = useState([
    { month: 'Jan', salary: 480000, loans: 45000, avgProgress: 72 },
    { month: 'Feb', salary: 500000, loans: 65000, avgProgress: 75 },
    { month: 'Mar', salary: 510000, loans: 85000, avgProgress: 78 },
  ]);

  return (
    <AppLayout
      title="Organization Dashboard"
      subtitle="Institution-wide financial health and performance"
    >
      <div className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Salary Minted"
            value={stats.salaryMinted}
            description="WORK tokens (monthly budget)"
            icon={<Wallet className="h-6 w-6 text-blue-500" />}
            variant="primary"
          />
          <StatCard
            title="Loan Pool"
            value={stats.loanMinted}
            description="Available for issuance"
            icon={<AlertCircle className="h-6 w-6 text-yellow-500" />}
            variant="warning"
          />
          <StatCard
            title="In Circulation"
            value={stats.tokensInCirculation}
            description="Faculty wallet balances"
            icon={<TrendingUp className="h-6 w-6 text-green-500" />}
            variant="success"
          />
          <StatCard
            title="Active Loans"
            value={stats.activeLoanCount}
            description="Pending clearance"
            icon={<Users className="h-6 w-6 text-purple-500" />}
          />
        </div>

        {/* Token Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Token Flow Overview</CardTitle>
            <CardDescription>Transaction breakdown this month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={circularData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Salary & loan issuance patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="salary" stroke="#3b82f6" />
                  <Line type="monotone" dataKey="loans" stroke="#f59e0b" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Task completion and member progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departments.map((dept) => (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{dept.name}</span>
                      <span className="text-muted-foreground">{dept.completion}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${dept.completion}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>Avg Progress: {dept.avgProgress}%</span>
                      <span>{dept.members} members</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Action required</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-accent">
                        {approval.type.replace('_', ' ')}
                      </span>
                      <p className="font-medium">{approval.user}</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {approval.amount || approval.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{approval.org_unit}</span>
                    <Button variant="outline" size="sm">Approve</Button>
                    <Button variant="ghost" size="sm">Reject</Button>
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

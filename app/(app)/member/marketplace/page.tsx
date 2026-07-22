'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Users, Clock, Award } from 'lucide-react';

export default function TaskMarketplacePage() {
  const [tasks] = useState([
    {
      id: 1,
      title: 'Advanced Algorithms Exam Invigilation',
      description: 'Invigilate exam for Advanced Algorithms course',
      credits: 800,
      category: 'UNSTRUCTURED',
      organization_unit: 'CS Department',
      volunteers_needed: 3,
      nominations: 1,
      deadline: '2026-02-10',
      skills_required: ['Teaching', 'Exam Conduct'],
    },
    {
      id: 2,
      title: 'Hackathon Coordination',
      description: 'Coordinate inter-college hackathon event',
      credits: 1200,
      category: 'UNSTRUCTURED',
      organization_unit: 'CS Department',
      volunteers_needed: 5,
      nominations: 2,
      deadline: '2026-02-20',
      skills_required: ['Event Management', 'Coordination'],
    },
    {
      id: 3,
      title: 'Student Project Review',
      description: 'Review final year student projects',
      credits: 600,
      category: 'UNSTRUCTURED',
      organization_unit: 'CS Department',
      volunteers_needed: 8,
      nominations: 3,
      deadline: '2026-02-15',
      skills_required: ['Assessment', 'Technical Review'],
    },
  ]);

  return (
    <AppLayout
      title="Task Marketplace"
      subtitle="Browse and nominate yourself for open opportunities"
    >
      <div className="space-y-6">
        {/* Filters (placeholder) */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">All Tasks</Button>
          <Button variant="outline" size="sm">My Skills</Button>
          <Button variant="outline" size="sm">Highest Credits</Button>
          <Button variant="outline" size="sm">Urgent</Button>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{task.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">{task.organization_unit}</CardDescription>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-purple-500/20 text-purple-700 dark:text-purple-400 whitespace-nowrap">
                    {task.category}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3 text-yellow-500" />
                    <span>{task.credits} credits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span>{task.deadline}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-green-500" />
                    <span>{task.volunteers_needed} needed</span>
                  </div>
                  <div className="text-muted-foreground">
                    {task.nominations} nominated
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1">
                  {task.skills_required.map((skill) => (
                    <span key={skill} className="text-xs px-2 py-1 rounded bg-accent">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Action */}
                <Button className="w-full" size="sm">
                  Nominate Myself
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

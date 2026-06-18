'use client';

import React from 'react';
import { useGlobal } from '../providers';
import { Analytics } from '../../components/Analytics';
import { redirect } from 'next/navigation';

export default function AnalyticsPage() {
  const { user, sprints, tasks } = useGlobal();

  if (user && !user.permissions?.view_analytics) {
    redirect('/');
  }

  return <Analytics sprints={sprints} tasks={tasks} />;
}

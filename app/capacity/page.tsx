'use client';

import React from 'react';
import { useGlobal } from '../providers';
import { CapacityTracker } from '../../components/CapacityTracker';
import { redirect } from 'next/navigation';

export default function CapacityPage() {
  const { user, sprints, tasks, profiles, handleEditSprint } = useGlobal();

  if (user && !user.permissions?.view_capacity_tracker) {
    redirect('/');
  }

  return (
    <CapacityTracker
      sprints={sprints}
      tasks={tasks}
      profiles={profiles}
      onEditSprint={handleEditSprint}
    />
  );
}

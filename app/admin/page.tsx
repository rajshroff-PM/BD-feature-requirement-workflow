'use client';

import React from 'react';
import { useGlobal } from '../providers';
import { AdminDashboard } from '../../components/AdminDashboard';
import { redirect } from 'next/navigation';

export default function AdminPage() {
  const { user } = useGlobal();

  if (user && !['SUPER_ADMIN', 'PM', 'MANAGEMENT'].includes(user.role || '') && !user.permissions?.view_admin_dashboard) {
    redirect('/');
  }

  return <AdminDashboard currentUser={user as any} />;
}

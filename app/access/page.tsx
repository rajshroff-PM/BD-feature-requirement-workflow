'use client';

import React from 'react';
import { useGlobal } from '../providers';
import { AccessManagement } from '../../components/AccessManagement';
import { redirect } from 'next/navigation';

export default function AccessPage() {
  const { user } = useGlobal();

  if (user && !user.permissions?.view_access_management) {
    redirect('/');
  }

  return <AccessManagement currentUser={user} />;
}

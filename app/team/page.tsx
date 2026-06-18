'use client';

import React from 'react';
import { useGlobal } from '../providers';
import { ManageDevTeam } from '../../components/ManageDevTeam';
import { redirect } from 'next/navigation';

export default function TeamPage() {
  const { user, fetchProfiles } = useGlobal();

  if (user && !user.permissions?.view_team) {
    redirect('/');
  }

  return <ManageDevTeam onClose={() => fetchProfiles()} />;
}

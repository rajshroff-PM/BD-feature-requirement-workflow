'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '../../providers';
import { Badge } from '../../../components/Badge';
import { formatDate } from '../../../lib/utils';
import { Archive } from 'lucide-react';

export default function CurrentSprintPage() {
    const { sprints, user } = useGlobal();
    const router = useRouter();

    const activeSprint = sprints.find(s => s.status === 'Active');
    
    const userRole = user?.role;
    const canManageSprints = user?.permissions?.create_sprints ?? (userRole === 'PM' || userRole === 'MANAGEMENT' || userRole === 'DEV_LEAD' || userRole === 'SUPER_ADMIN');

    if (!activeSprint) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-xl border border-gray-200 border-dashed">
                <div className="bg-gray-50 p-4 rounded-full mb-4">
                    <Archive className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sprint</h3>
                <p className="text-gray-500 max-w-md text-center">There is currently no active sprint. Go to the Upcoming tab to start a planned sprint, or create a new one.</p>
            </div>
        );
    }

    // Rather than just showing the card, we could automatically redirect to the Sprint Details page!
    // BUT the user wants this to be a "Page". We'll render the Sprint Card here, and clicking it goes to the details.
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 px-1">Current Sprint</h3>
            <div
                onClick={() => router.push(`/sprint/${activeSprint.id}`)}
                className="bg-white rounded-xl shadow-lg border border-violet-100 p-6 cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h4 className="text-xl font-bold text-gray-900 group-hover:text-violet-600 transition-colors">{activeSprint.name}</h4>
                            <Badge color="green">Active</Badge>
                        </div>
                        <p className="text-gray-500 mt-2">{activeSprint.goal}</p>
                        <div className="flex items-center mt-4 text-sm text-gray-500">
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">{formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}</span>
                        </div>
                    </div>
                    <div className="flex items-center text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="mr-2 text-sm font-medium">{canManageSprints ? 'Manage Sprint' : 'View Sprint'}</span>
                        {/* <ArrowRight className="w-4 h-4" /> */}
                    </div>
                </div>
            </div>
        </div>
    );
}

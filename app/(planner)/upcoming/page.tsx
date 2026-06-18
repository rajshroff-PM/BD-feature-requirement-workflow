'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '../../providers';
import { Badge } from '../../../components/Badge';
import { formatDate } from '../../../lib/utils';
import { Calendar } from 'lucide-react';

export default function UpcomingSprintsPage() {
    const { sprints } = useGlobal();
    const router = useRouter();

    const upcomingSprints = sprints.filter(s => s.status === 'Planned');

    return (
        <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 px-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Upcoming Sprints
                <span className="ml-1 text-sm font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{upcomingSprints.length}</span>
            </h3>
            
            {upcomingSprints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingSprints.map(sprint => (
                        <div
                            key={sprint.id}
                            onClick={() => router.push(`/sprint/${sprint.id}`)}
                            className="bg-white rounded-xl shadow-md border border-gray-200 p-5 cursor-pointer hover:border-violet-300 transition-all"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900">{sprint.name}</h4>
                                <Badge color="blue">Planned</Badge>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{sprint.goal}</p>
                            <div className="text-xs text-gray-400 font-mono">
                                {formatDate(sprint.startDate)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                    <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No upcoming sprints scheduled.</p>
                </div>
            )}
        </section>
    );
}

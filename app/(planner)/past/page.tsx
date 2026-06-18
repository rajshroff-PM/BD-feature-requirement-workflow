'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useGlobal } from '../../providers';
import { Badge } from '../../../components/Badge';
import { formatDate } from '../../../lib/utils';
import { Archive } from 'lucide-react';

export default function PastSprintsPage() {
    const { sprints } = useGlobal();
    const router = useRouter();

    const pastSprints = sprints.filter(s => s.status === 'Completed');

    return (
        <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 px-1 flex items-center gap-2">
                <Archive className="w-5 h-5 text-gray-500" />
                Past Sprints
                <span className="ml-1 text-sm font-normal bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{pastSprints.length}</span>
            </h3>
            
            {pastSprints.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
                    {pastSprints.map(sprint => (
                        <div 
                            key={sprint.id} 
                            onClick={() => router.push(`/sprint/${sprint.id}`)} 
                            className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <div>
                                <span className="font-medium text-gray-900">{sprint.name}</span>
                                <span className="ml-4 text-xs text-gray-500">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
                            </div>
                            <Badge color="gray">Completed</Badge>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                    <Archive className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No history available.</p>
                </div>
            )}
        </section>
    );
}

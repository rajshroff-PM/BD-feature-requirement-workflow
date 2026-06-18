'use client';

import React from 'react';
import { useGlobal } from '../../providers';
import { Layers } from 'lucide-react';
import { TicketTypeBadge } from '../../../components/TicketTypeBadge';
import { useRouter } from 'next/navigation';

export default function RoadmapPage() {
    const { tasks } = useGlobal();
    const router = useRouter();
    
    // Active Epics
    const activeEpics = tasks.filter(t => t.ticketType === 'Epic');

    return (
        <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 px-1 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Roadmap Epics
                <span className="ml-1 text-sm font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{activeEpics.length}</span>
            </h3>
            {activeEpics.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
                    {activeEpics.map((epic) => (
                        <div 
                            key={epic.id} 
                            className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`?ticket=${epic.id}`)}
                        >
                            <TicketTypeBadge type={epic.ticketType} />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900 truncate block">{epic.title}</span>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{epic.assignee !== 'Unassigned' ? epic.assignee : 'Unassigned'}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                    <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No Epics planned yet.</p>
                </div>
            )}
        </section>
    );
}

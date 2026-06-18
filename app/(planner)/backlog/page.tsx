'use client';

import React from 'react';
import { useGlobal } from '../../providers';
import { Inbox } from 'lucide-react';
import { TicketTypeBadge } from '../../../components/TicketTypeBadge';
import { useRouter } from 'next/navigation';

export default function BacklogPage() {
    const { tasks } = useGlobal();
    const router = useRouter();

    // Backlog = tasks not yet assigned to any sprint and not Epics
    const backlogTasks = tasks.filter(t => !t.sprintId && t.ticketType !== 'Epic');

    return (
        <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4 px-1 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-amber-500" />
                Backlog
                <span className="ml-1 text-sm font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{backlogTasks.length}</span>
            </h3>
            {backlogTasks.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
                    {backlogTasks.map((task) => (
                        <div 
                            key={task.id} 
                            className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`?ticket=${task.id}`)}
                        >
                            <TicketTypeBadge type={task.ticketType} />
                            <span className="flex-1 text-sm font-medium text-gray-900 truncate">{task.title}</span>
                            {task.storyPoints != null && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{task.storyPoints} pts</span>
                            )}
                            <span className="text-xs text-gray-400">{task.assignee !== 'Unassigned' ? task.assignee : 'Unassigned'}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                    <Inbox className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">Your backlog is empty.</p>
                </div>
            )}
        </section>
    );
}

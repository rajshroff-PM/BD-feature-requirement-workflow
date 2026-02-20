import React, { useState } from 'react';
import { Sprint, Task, Ticket } from '../../types';
import { Plus, Layout, ArrowRight } from 'lucide-react';
import { CreateSprintModal } from './CreateSprintModal';
import { SprintDetails } from './SprintDetails';
import { Badge } from '../Badge';

interface SprintPlannerProps {
    sprints: Sprint[];
    tasks: Task[];
    tickets: Ticket[]; // Full ticket list to filter approved backlog
    onCreateSprint: (sprint: Sprint) => void;
    onAddTask: (task: Task) => void;
    onEditSprint: (sprint: Sprint) => void;
    onEditTask: (task: Task) => void;
    onDeleteSprint?: (sprintId: string) => void;
}

export const SprintPlanner: React.FC<SprintPlannerProps> = ({ sprints, tasks, tickets, onCreateSprint, onAddTask, onEditSprint, onEditTask, onDeleteSprint }) => {
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const activeSprint = sprints.find(s => s.status === 'Active');
    const upcomingSprints = sprints.filter(s => s.status === 'Planned');
    const pastSprints = sprints.filter(s => s.status === 'Completed');

    // Filter ONLY approved tickets that are NOT yet assigned to a sprint task
    const backlog = tickets.filter(t =>
        t.pmStatus === 'Approved' &&
        !tasks.some(task => task.ticketId === t.id)
    );

    if (selectedSprintId) {
        const sprint = sprints.find(s => s.id === selectedSprintId);
        if (!sprint) return null; // Should not happen

        return (
            <SprintDetails
                sprint={sprint}
                tasks={tasks.filter(t => t.sprintId === sprint.id)}
                backlog={backlog}
                onBack={() => setSelectedSprintId(null)}
                onAddTask={onAddTask}
                onEditSprint={onEditSprint}
                onEditTask={onEditTask}
                onDeleteSprint={(sprintId) => {
                    setSelectedSprintId(null);
                    if (onDeleteSprint) {
                        onDeleteSprint(sprintId);
                    }
                }}
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Layout className="w-6 h-6 mr-3 text-indigo-600" />
                        Sprint Planner
                    </h1>
                    <p className="text-gray-500 mt-1">Manage development cycles and assign tasks.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                    <Plus className="h-4 w-4" />
                    <span>Create New Sprint</span>
                </button>
            </div>

            {/* A. Current Sprint */}
            <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4 px-1">Current Sprint</h3>
                {activeSprint ? (
                    <div
                        onClick={() => setSelectedSprintId(activeSprint.id)}
                        className="bg-white rounded-xl shadow-md border border-indigo-100 p-6 cursor-pointer hover:shadow-lg transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center space-x-3">
                                    <h4 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{activeSprint.name}</h4>
                                    <Badge color="green">Active</Badge>
                                </div>
                                <p className="text-gray-500 mt-2">{activeSprint.goal}</p>
                                <div className="flex items-center mt-4 text-sm text-gray-500">
                                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{activeSprint.startDate} → {activeSprint.endDate}</span>
                                </div>
                            </div>
                            <div className="flex items-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="mr-2 text-sm font-medium">Manage Sprint</span>
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Progress Bar logic would go here if we had task status counts */}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
                        <p className="text-gray-500">No active sprint. Start a planned sprint or create a new one.</p>
                    </div>
                )}
            </section>

            {/* B. Upcoming Sprints */}
            <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4 px-1">Upcoming Sprints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {upcomingSprints.map(sprint => (
                        <div
                            key={sprint.id}
                            onClick={() => setSelectedSprintId(sprint.id)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:border-indigo-300 transition-all"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900">{sprint.name}</h4>
                                <Badge color="blue">Planned</Badge>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">{sprint.goal}</p>
                            <div className="text-xs text-gray-400 font-mono">
                                {sprint.startDate}
                            </div>
                        </div>
                    ))}
                    {upcomingSprints.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-400 italic">
                            No upcoming sprints scheduled.
                        </div>
                    )}
                </div>
            </section>

            {/* C. Past Sprints */}
            <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4 px-1">Past Sprints</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                    {pastSprints.map(sprint => (
                        <div key={sprint.id} onClick={() => setSelectedSprintId(sprint.id)} className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                            <div>
                                <span className="font-medium text-gray-900">{sprint.name}</span>
                                <span className="ml-4 text-xs text-gray-500">{sprint.startDate} - {sprint.endDate}</span>
                            </div>
                            <Badge color="gray">Completed</Badge>
                        </div>
                    ))}
                    {pastSprints.length === 0 && (
                        <div className="p-6 text-center text-gray-400 italic">
                            No history available.
                        </div>
                    )}
                </div>
            </section>

            {isCreateModalOpen && (
                <CreateSprintModal
                    nextSprintNumber={sprints.length + 1}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={(sprint) => {
                        onCreateSprint(sprint);
                        setIsCreateModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

import React, { useState } from 'react';
import { Sprint, Task, Ticket, DevTeamMember } from '../../types';
import { Plus, Layout, ArrowRight, Inbox, Layers } from 'lucide-react';
import { CreateSprintModal } from './CreateSprintModal';
import { SprintDetails } from './SprintDetails';
import { CreateTicketModal } from './CreateTicketModal';
import { EditTaskModal } from './EditTaskModal';
import { Badge } from '../Badge';
import { TicketTypeBadge } from '../TicketTypeBadge';
import { formatDate } from '../../lib/utils';

interface SprintPlannerProps {
    currentUser?: any; // or import User and use it
    sprints: Sprint[];
    tasks: Task[];
    tickets: Ticket[]; // Full ticket list to filter approved backlog
    devTeam: DevTeamMember[];
    onCreateSprint: (sprint: Sprint) => void;
    onAddTask: (task: Task) => void;
    onEditSprint: (sprint: Sprint) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onDeleteSprint?: (sprintId: string) => void;
    userRole?: string;
}

export const SprintPlanner: React.FC<SprintPlannerProps> = ({ currentUser, sprints, tasks, tickets: _tickets, devTeam, onCreateSprint, onAddTask, onEditSprint, onEditTask, onDeleteTask, onDeleteSprint, userRole }) => {
    const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const [createTicketParentId, setCreateTicketParentId] = useState<string | undefined>(undefined);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    React.useEffect(() => {
        const handleSelectSprint = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            setSelectedSprintId(customEvent.detail);
        };
        window.addEventListener('select-sprint', handleSelectSprint);
        return () => window.removeEventListener('select-sprint', handleSelectSprint);
    }, []);

    const activeSprint = sprints.find(s => s.status === 'Active');
    const upcomingSprints = sprints.filter(s => s.status === 'Planned');
    const pastSprints = sprints.filter(s => s.status === 'Completed');

    // Backlog = tasks not yet assigned to any sprint and not Epics
    const backlogTasks = tasks.filter(t => !t.sprintId && t.ticketType !== 'Epic');
    // Active Epics
    const activeEpics = tasks.filter(t => t.ticketType === 'Epic');
    // Legacy: keep empty array for AddTaskModal's ticket-select mode
    const backlog: Ticket[] = [];

    if (selectedSprintId) {
        const sprint = sprints.find(s => s.id === selectedSprintId);
        if (!sprint) return null; // Should not happen

        return (
            <SprintDetails
                sprint={sprint}
                tasks={tasks.filter(t => t.sprintId === sprint.id)}
                allTasks={tasks}
                allSprints={sprints}
                backlog={backlog}
                devTeam={devTeam}
                onBack={() => setSelectedSprintId(null)}
                onAddTask={onAddTask}
                onEditSprint={onEditSprint}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onDeleteSprint={(sprintId) => {
                    setSelectedSprintId(null);
                    if (onDeleteSprint) {
                        onDeleteSprint(sprintId);
                    }
                }}
                currentUser={currentUser}
                userRole={userRole}
            />
        );
    }

    const canManageSprints = userRole === 'PM' || userRole === 'MANAGEMENT' || userRole === 'DEV_LEAD';


    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center">
                        <div className="bg-violet-100 text-violet-600 p-2 rounded-xl mr-3 shadow-sm">
                            <Layout className="w-5 h-5" />
                        </div>
                        Sprint Planner
                    </h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Manage development cycles and align your team on key deliverables.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {canManageSprints && (
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center space-x-2 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl shadow-sm transition-all font-medium text-sm"
                        >
                            <Plus className="h-4 w-4 text-gray-400" />
                            <span>New Sprint</span>
                        </button>
                    )}
                    <button
                        onClick={() => { setCreateTicketParentId(undefined); setIsCreateTicketOpen(true); }}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl shadow-sm transition-all font-semibold text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Ticket</span>
                    </button>
                </div>
            </div>

            {/* Active Epics */}
            {activeEpics.length > 0 && (
                <section>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 px-1 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-600" />
                        Roadmap Epics
                        <span className="ml-1 text-sm font-normal bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{activeEpics.length}</span>
                    </h3>
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
                        {activeEpics.map((epic: Task) => (
                            <div 
                                key={epic.id} 
                                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setEditingTask(epic)}
                            >
                                <TicketTypeBadge type={epic.ticketType} />
                                <div className="flex-1">
                                    <span className="text-sm font-medium text-gray-900 truncate block">{epic.title}</span>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{epic.assignee !== 'Unassigned' ? epic.assignee : 'Unassigned'}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* A. Backlog */}
            {backlogTasks.length > 0 && (
                <section>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 px-1 flex items-center gap-2">
                        <Inbox className="w-5 h-5 text-amber-500" />
                        Backlog
                        <span className="ml-1 text-sm font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{backlogTasks.length}</span>
                    </h3>
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
                        {backlogTasks.slice(0, 10).map((task: import('../../types').Task) => (
                            <div 
                                key={task.id} 
                                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 cursor-pointer"
                                onClick={() => setEditingTask(task)}
                            >
                                <TicketTypeBadge type={task.ticketType} />
                                <span className="flex-1 text-sm font-medium text-gray-900 truncate">{task.title}</span>
                                {task.storyPoints != null && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">{task.storyPoints} pts</span>
                                )}
                                <span className="text-xs text-gray-400">{task.assignee !== 'Unassigned' ? task.assignee : 'Unassigned'}</span>
                            </div>
                        ))}
                        {backlogTasks.length > 10 && (
                            <div className="px-5 py-2 text-xs text-gray-400 text-center">
                                +{backlogTasks.length - 10} more items in backlog
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* B. Current Sprint */}
            <section>
                <h3 className="text-lg font-medium text-gray-900 mb-4 px-1">Current Sprint</h3>
                {activeSprint ? (
                    <div
                        onClick={() => setSelectedSprintId(activeSprint.id)}
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
                <div className="bg-white rounded-xl shadow-md border border-gray-200 divide-y divide-gray-100">
                    {pastSprints.map(sprint => (
                        <div key={sprint.id} onClick={() => setSelectedSprintId(sprint.id)} className="p-4 flex justify-between items-center hover:bg-gray-50 cursor-pointer">
                            <div>
                                <span className="font-medium text-gray-900">{sprint.name}</span>
                                <span className="ml-4 text-xs text-gray-500">{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
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
                    devTeam={devTeam}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSave={(sprint) => {
                        onCreateSprint(sprint);
                        setIsCreateModalOpen(false);
                    }}
                />
            )}

            {isCreateTicketOpen && (
                <CreateTicketModal
                    allTasks={tasks}
                    allSprints={sprints}
                    defaultSprintId={undefined}
                    defaultParentId={createTicketParentId}
                    defaultType={undefined}
                    userRole={userRole || ''}
                    devTeam={devTeam}
                    onClose={() => {
                        setIsCreateTicketOpen(false);
                        setCreateTicketParentId(undefined);
                    }}
                    onSave={(task: Task) => {
                        onAddTask(task);
                        setIsCreateTicketOpen(false);
                        setCreateTicketParentId(undefined);
                    }}
                />
            )}

            {editingTask && (
                <EditTaskModal
                    currentUser={currentUser}
                    task={editingTask}
                    sprint={{ id: '', name: 'Backlog', goal: '', status: 'Planned', startDate: '', endDate: '', capacity: 0, team: devTeam } as any}
                    childTasks={tasks.filter(t => t.parentId === editingTask.id)}
                    onCreateChild={(parentId) => {
                        setCreateTicketParentId(parentId);
                        setIsCreateTicketOpen(true);
                    }}
                    onClose={() => setEditingTask(null)}
                    onSave={(updatedTask) => {
                        onEditTask(updatedTask);
                        setEditingTask(updatedTask);
                    }}
                    onDelete={(taskId) => {
                        onDeleteTask(taskId);
                        setEditingTask(null);
                    }}
                    userRole={userRole}
                />
            )}
        </div>
    );
};

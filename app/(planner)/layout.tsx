'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Layout, Plus, Map, Zap, Calendar, Archive, Inbox } from 'lucide-react';
import { useGlobal } from '../providers';
import { CreateSprintModal } from '../../components/sprint-planner/CreateSprintModal';
import { CreateTicketModal } from '../../components/sprint-planner/CreateTicketModal';
import { EditTaskModal } from '../../components/sprint-planner/EditTaskModal';
import { Task, Sprint } from '../../types';
import { ErrorBoundary } from '../../components/ErrorBoundary';



function TicketModalHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const { tasks, sprints, profiles, user, handleEditTask, handleDeleteTask } = useGlobal();
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        const ticketId = searchParams.get('ticket');
        if (ticketId) {
            const task = tasks.find(t => t.id === ticketId || t.ticketId === ticketId);
            if (task && (!editingTask || editingTask.id !== task.id)) {
                setEditingTask(task);
            }
        } else if (editingTask) {
             setEditingTask(null);
        }
    }, [searchParams, tasks]);

    const handleCloseEditModal = () => {
        setEditingTask(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ticket');
        router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
    };

    if (!editingTask) return null;

    return (
        <EditTaskModal
            task={editingTask}
            onClose={handleCloseEditModal}
            onSave={handleEditTask}
            onDelete={handleDeleteTask}
            profiles={profiles}
            sprint={sprints.find(s => s.id === editingTask.sprintId) || {
                id: 'dummy',
                name: 'Backlog',
                status: 'Planned',
                capacity: 0,
                startDate: '',
                endDate: '',
                team: [],
            } as unknown as import('../../types').Sprint}
            currentUser={user}
        />
    );
}

export default function PlannerLayout({ children }: { children: React.ReactNode }) {
    const { 
        user,
        sprints,
        tasks,
        profiles,
        handleCreateSprint,
        handleAddTask,
    } = useGlobal();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const pathname = usePathname();

    const userRole = user?.role;
    const canManageSprints = user?.permissions?.create_sprints ?? (userRole === 'PM' || userRole === 'MANAGEMENT' || userRole === 'DEV_LEAD' || userRole === 'SUPER_ADMIN');
    const canCreateTasks = user?.permissions?.create_tickets ?? true;

    const navLinks = [
        { href: '/current', label: 'Current Sprint', icon: <Zap className="w-4 h-4" /> },
        { href: '/roadmap', label: 'Roadmap & Epics', icon: <Map className="w-4 h-4" /> },
        { href: '/backlog', label: 'Backlog', icon: <Inbox className="w-4 h-4" /> },
        { href: '/upcoming', label: 'Upcoming', icon: <Calendar className="w-4 h-4" /> },
        { href: '/past', label: 'Past Sprints', icon: <Archive className="w-4 h-4" /> },
    ];

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
                    {canCreateTasks && (
                        <button
                            onClick={() => setIsCreateTicketOpen(true)}
                            className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl shadow-sm transition-all font-semibold text-sm"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Create Ticket</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sub Navigation */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-gray-200">
                {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
                                isActive 
                                ? 'border-violet-600 text-violet-700 bg-violet-50/50' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                        >
                            {link.icon}
                            <span>{link.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* Page Content */}
            <div className="min-h-[400px]">
                {children}
            </div>

            {/* Modals */}
            {isCreateModalOpen && (
                <ErrorBoundary>
                    <CreateSprintModal
                        onClose={() => setIsCreateModalOpen(false)}
                        onSave={handleCreateSprint}
                        nextSprintNumber={sprints.length + 1}
                        profiles={profiles}
                    />
                </ErrorBoundary>
            )}

            {isCreateTicketOpen && (
                <CreateTicketModal
                    onClose={() => setIsCreateTicketOpen(false)}
                    onSave={handleAddTask}
                    profiles={profiles}
                    allSprints={sprints}
                    allTasks={tasks}
                    currentUser={user!}
                />
            )}

            <Suspense fallback={null}>
                <TicketModalHandler />
            </Suspense>
        </div>
    );
}

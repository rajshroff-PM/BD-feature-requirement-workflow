import React, { useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Sprint, Task } from '../types';
import { BarChart2 } from 'lucide-react';

interface AnalyticsProps {
    sprints: Sprint[];
    tasks: Task[];
}

const COLORS = ['#7c3aed', '#3b82f6', '#ef4444', '#6b7280', '#f59e0b'];
const TYPE_COLORS: Record<string, string> = {
    Epic: '#7c3aed',
    Story: '#3b82f6',
    Bug: '#ef4444',
    Task: '#6b7280',
    Spike: '#f59e0b',
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">{title}</h3>
            {children}
        </div>
    );
}

export const Analytics: React.FC<AnalyticsProps> = ({ sprints, tasks }) => {
    const completedSprints = useMemo(
        () => sprints.filter(s => s.status === 'Completed' || s.status === 'Active'),
        [sprints]
    );

    // 1. Sprint Velocity — story points of Done tasks per sprint
    const velocityData = useMemo(() =>
        completedSprints.map(sprint => {
            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id && t.status === 'Done');
            const points = sprintTasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
            return { name: sprint.name, 'Story Points': points };
        }), [completedSprints, tasks]);

    // 2. Ticket Type Breakdown — count by type across all tasks
    const typeData = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            const type = t.ticketType || 'Task';
            counts[type] = (counts[type] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [tasks]);

    // 3. Bug Rate — bugs filed vs closed per sprint
    const bugData = useMemo(() =>
        completedSprints.map(sprint => {
            const sprintTasks = tasks.filter(t => t.sprintId === sprint.id && t.ticketType === 'Bug');
            return {
                name: sprint.name,
                Filed: sprintTasks.length,
                Closed: sprintTasks.filter(t => t.qaStatus === 'Closed' || t.qaStatus === 'Verified').length,
            };
        }), [completedSprints, tasks]);

    // 4. Capacity Utilisation — capacity vs effort used per sprint
    const capacityData = useMemo(() =>
        completedSprints.map(sprint => {
            const effort = tasks
                .filter(t => t.sprintId === sprint.id)
                .reduce((sum, t) => sum + (t.effort || 0), 0);
            return {
                name: sprint.name,
                Capacity: sprint.capacity,
                Used: parseFloat(effort.toFixed(1)),
            };
        }), [completedSprints, tasks]);

    // 5. Throughput — tasks moved to Done per sprint
    const throughputData = useMemo(() =>
        completedSprints.map(sprint => ({
            name: sprint.name,
            Done: tasks.filter(t => t.sprintId === sprint.id && t.status === 'Done').length,
            Total: tasks.filter(t => t.sprintId === sprint.id).length,
        })), [completedSprints, tasks]);

    // Chart 6 Removed (QA Readiness)

    const noData = (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            No data yet
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <BarChart2 className="w-6 h-6 mr-3 text-violet-600" />
                    Analytics
                </h1>
                <p className="text-gray-500 mt-1">Sprint health, team throughput, and quality metrics.</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Sprints', value: sprints.length },
                    { label: 'Total Tickets', value: tasks.length },
                    { label: 'Done', value: tasks.filter(t => t.status === 'Done').length },
                    { label: 'Open Bugs', value: tasks.filter(t => t.ticketType === 'Bug' && t.qaStatus !== 'Closed' && t.qaStatus !== 'Verified').length },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-center">
                        <div className="text-3xl font-bold text-violet-600">{card.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Sprint Velocity */}
                <ChartCard title="Sprint Velocity (Story Points Delivered)">
                    {velocityData.length === 0 ? noData : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={velocityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="Story Points" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* 2. Ticket Type Breakdown */}
                <ChartCard title="Ticket Type Breakdown">
                    {typeData.length === 0 ? noData : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={typeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {typeData.map((entry) => (
                                        <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#94a3b8'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* 3. Bug Rate */}
                <ChartCard title="Bug Rate (Filed vs Closed per Sprint)">
                    {bugData.length === 0 ? noData : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={bugData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="Filed" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Closed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* 4. Capacity Utilisation */}
                <ChartCard title="Capacity Utilisation (Days)">
                    {capacityData.length === 0 ? noData : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={capacityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Capacity" fill="#e0e7ff" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Used" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* 5. Throughput */}
                <ChartCard title="Throughput (Tickets Done per Sprint)">
                    {throughputData.length === 0 ? noData : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={throughputData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Done" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>



            </div>
        </div>
    );
};

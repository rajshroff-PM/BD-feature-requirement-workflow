import React, { useState, useMemo } from 'react';
import { Sprint, Task, SprintTeamMember } from '../types';
import { formatDate, parseTimeToHours, formatHoursToTime } from '../lib/utils';
import { Layout, Calendar, CheckSquare, Clock, User as UserIcon } from 'lucide-react';
import { Badge } from './Badge';

interface CapacityTrackerProps {
    sprints: Sprint[];
    tasks: Task[];
    onEditSprint: (sprint: Sprint) => void;
}

export const CapacityTracker: React.FC<CapacityTrackerProps> = ({ sprints, tasks, onEditSprint }) => {
    const activeOrUpcomingSprints = useMemo(() => {
        return sprints.filter(s => s.status === 'Active' || s.status === 'Planned');
    }, [sprints]);

    const [selectedSprintId, setSelectedSprintId] = useState<string>(
        activeOrUpcomingSprints.find(s => s.status === 'Active')?.id ||
        activeOrUpcomingSprints[0]?.id || ''
    );

    const sprint = useMemo(() => sprints.find(s => s.id === selectedSprintId), [sprints, selectedSprintId]);

    // Generate array of dates for the sprint
    const sprintDates = useMemo(() => {
        if (!sprint || !sprint.startDate || !sprint.endDate) return [];
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        const dates: Date[] = [];
        let current = new Date(start);
        while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }, [sprint]);

    const handleToggleDate = (memberId: string, dateStr: string) => {
        if (!sprint || !sprint.team) return;

        const updatedTeam = sprint.team.map(m => {
            if (m.id !== memberId) return m;

            const currentDates = m.presentDates || [];
            let newDates: string[];

            if (currentDates.includes(dateStr)) {
                newDates = currentDates.filter(d => d !== dateStr);
            } else {
                newDates = [...currentDates, dateStr];
            }

            // Sync daysWorking to match presentDates length if presentDates is actively managed
            return {
                ...m,
                presentDates: newDates,
                daysWorking: newDates.length
            };
        });

        // Auto-calculate new total capacity for the sprint
        const totalCapacity = updatedTeam.reduce((sum, member) => sum + (member.daysWorking || 0), 0);

        onEditSprint({
            ...sprint,
            team: updatedTeam,
            capacity: totalCapacity > 0 ? totalCapacity : 1
        });
    };

    const getMemberStats = (member: SprintTeamMember) => {
        if (!sprint) return { usedDays: 0, assignedTasks: [] };

        const memberTasks = tasks.filter(t =>
            t.sprintId === sprint.id &&
            t.assignee &&
            t.assignee.includes(member.name)
        );

        let usedDays = 0;
        memberTasks.forEach(t => {
            const assignees = t.assignee ? t.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];
            const fraction = assignees.length > 0 ? 1 / assignees.length : 1;
            usedDays += (t.effort || 0) * fraction;
        });

        return {
            usedDays: Number(usedDays.toFixed(1)),
            assignedTasks: memberTasks
        };
    };

    if (!sprint) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Active or Planned Sprints</h3>
                    <p>Please create a sprint in the Sprint Planner to track capacity.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <Calendar className="w-6 h-6 mr-3 text-violet-600" />
                        Individual Capacity Tracker
                    </h1>
                    <p className="text-gray-500 mt-1">Manage team availability and analyze individual sprint load.</p>
                </div>

                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <span className="text-sm font-medium text-gray-500 pl-2">Sprint:</span>
                    <select
                        value={selectedSprintId}
                        onChange={(e) => setSelectedSprintId(e.target.value)}
                        className="border-none bg-gray-50 rounded-lg py-1.5 px-3 text-sm font-semibold text-gray-900 focus:ring-violet-500 cursor-pointer outline-none"
                    >
                        {activeOrUpcomingSprints.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 gap-6">
                {(!sprint.team || sprint.team.length === 0) ? (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center">
                        <p className="text-gray-500">No team members assigned to sprint {sprint.name}.</p>
                    </div>
                ) : (
                    sprint.team.map((member) => {
                        const { usedDays, assignedTasks } = getMemberStats(member);
                        const capacityDays = member.daysWorking;
                        const remainingDays = Math.max(0, capacityDays - usedDays);
                        const utilization = capacityDays > 0 ? Math.round((usedDays / capacityDays) * 100) : 0;
                        const isOverloaded = utilization > 100;

                        // Default all sprint dates to present if presentDates array hasn't been initialized yet
                        const managedDates = member.presentDates || sprintDates.map(d => d.toISOString().split('T')[0]);

                        return (
                            <div key={member.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden text-left relative flex flex-col md:flex-row">
                                {/* Left Side: Presences / Analytics */}
                                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-lg">
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                                            <p className="text-xs text-gray-500">{member.role || 'Developer'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm font-medium mb-1">
                                                <span className="text-gray-600">Capacity Utilization</span>
                                                <span className={isOverloaded ? "text-red-600 font-bold" : "text-violet-600 font-bold"}>
                                                    {utilization}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <div
                                                    className={`h-2.5 rounded-full ${isOverloaded ? 'bg-red-500' : 'bg-violet-600'}`}
                                                    style={{ width: `${Math.min(100, utilization)}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-center pt-2">
                                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Remaining</p>
                                                <p className={`text-xl font-bold ${remainingDays === 0 ? 'text-gray-400' : 'text-green-600'}`}>
                                                    {remainingDays} <span className="text-xs font-normal">days</span>
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wider">Loaded</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {usedDays} <span className="text-xs font-normal">/ {capacityDays}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Presence toggle & Task List */}
                                <div className="p-6 md:w-2/3 flex flex-col gap-6">
                                    {/* Presence Manager */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                            <CheckSquare className="w-4 h-4 mr-2 text-violet-500" />
                                            Daily Presence
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {sprintDates.map(date => {
                                                const dateStr = date.toISOString().split('T')[0];
                                                const isPresent = managedDates.includes(dateStr);
                                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                                                const dayNum = date.getDate();
                                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => handleToggleDate(member.id, dateStr)}
                                                        className={`flex flex-col items-center justify-center rounded-lg px-3 py-1.5 transition-all outline-none border ${isPresent
                                                            ? 'bg-violet-50 border-violet-200 shadow-sm text-violet-700'
                                                            : 'bg-white border-gray-200 text-gray-400 opacity-60 hover:opacity-100 hover:border-violet-200'
                                                            } ${isWeekend ? 'border-dashed' : ''}`}
                                                        title={isPresent ? `Present on ${dateStr}` : `Absent on ${dateStr}`}
                                                    >
                                                        <span className="text-[10px] font-semibold uppercase">{dayName}</span>
                                                        <span className="text-sm font-bold">{dayNum}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2 italic">Click to toggle presence. Weekends are dashed.</p>
                                    </div>

                                    {/* Loaded Tasks */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                            <Layout className="w-4 h-4 mr-2 text-violet-500" />
                                            Loaded Tasks ({assignedTasks.length})
                                        </h4>

                                        {assignedTasks.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                No tasks assigned to {member.name} in this sprint.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                                {assignedTasks.map(task => (
                                                    <div key={task.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:border-violet-200 transition-colors">
                                                        <div className="pr-4">
                                                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{task.title}</p>
                                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                                <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{task.id}</span>
                                                                <Badge color={task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : 'gray'}>
                                                                    {task.status}
                                                                </Badge>
                                                                {task.ticketId && <span>Ticket: {task.ticketId}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="flex items-center text-sm font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg">
                                                                <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                                                {task.effort}d
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

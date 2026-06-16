import React, { useState } from 'react';
import { Sprint, Task, Ticket, TicketType } from '../../types';
import { ChevronLeft, Plus, Calendar, User, Pencil, Trash2, Download, X, Filter, CheckCircle2, Bug as BugIcon, LayoutList, LayoutGrid } from 'lucide-react';
import { TicketTypeBadge } from '../TicketTypeBadge';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EditTaskModal } from './EditTaskModal';
import { CreateTicketModal } from './CreateTicketModal';
import { CreateSprintModal } from './CreateSprintModal';
import { SprintBoard } from './SprintBoard';
import { Badge } from '../Badge';
import { formatDate, getInitials, formatHoursToTime } from '../../lib/utils';
import { DevTeamMember } from '../../types';

interface SprintDetailsProps {
    sprint: Sprint;
    tasks: Task[];
    allTasks: Task[];       // full task list for parent pickers
    allSprints: Sprint[];   // full sprint list for sprint picker
    backlog: Ticket[];
    devTeam: DevTeamMember[];
    onBack: () => void;
    onAddTask: (task: Task) => void;
    onEditSprint: (sprint: Sprint) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onDeleteSprint?: (sprintId: string) => void;
    currentUser?: any;
    userRole?: string;
}

export const SprintDetails: React.FC<SprintDetailsProps> = ({
    sprint, tasks, allTasks, allSprints, backlog: _backlog, devTeam,
    onBack, onAddTask, onEditSprint, onEditTask, onDeleteTask, onDeleteSprint,
    currentUser, userRole,
}) => {
    const [isCreateOpen, setIsCreateOpen]         = useState(false);
    const [createDefaultType, setCreateDefaultType]   = useState<TicketType | undefined>(undefined);
    const [createDefaultParent, setCreateDefaultParent] = useState<string | undefined>(undefined);
    const [isEditSprintModalOpen, setIsEditSprintModalOpen] = useState(false);
    const [editingTask, setEditingTask]           = useState<Task | null>(null);
    const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<TicketType | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
    // Calculate Utilization
    const totalEffort = tasks.reduce((sum, task) => sum + task.effort, 0);
    const utilization = Math.round((totalEffort / sprint.capacity) * 100);

    const getUtilizationColor = (pct: number) => {
        if (pct > 100) return 'bg-red-500';
        if (pct > 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const nonEpicTasks = tasks.filter(t => t.ticketType !== 'Epic');
    const filteredTasks = nonEpicTasks.filter(t => {
        const matchAssignee = selectedMemberFilter 
            ? t.assignee.split(',').map(name => name.trim()).includes(selectedMemberFilter)
            : true;
        const matchType = selectedTypeFilter
            ? t.ticketType === selectedTypeFilter
            : true;
        return matchAssignee && matchType;
    });

    const canManageTasks = userRole === 'PM' || userRole === 'DEV' || userRole === 'DEV_LEAD';
    const canManageSprintSettings = userRole === 'PM' || userRole === 'DEV_LEAD';

    const exportToCSV = () => {
        const headers = [`Sprint: ${sprint.name}`];
        const subHeaders = [
            `Dates: ${formatDate(sprint.startDate)} to ${formatDate(sprint.endDate)}`,
            `Capacity: ${formatHoursToTime(sprint.capacity * 8) || '0h'} utilized: ${utilization}% (${formatHoursToTime(totalEffort * 8) || '0h'}/${formatHoursToTime(sprint.capacity * 8) || '0h'})`,
        ];
        if (sprint.goal) subHeaders.push(`Goal: "${sprint.goal.replace(/"/g, '""')}"`);

        const tableHeaders = ["Task Title", "Assignee", "Schedule", "Effort", "Status"];

        const rows = tasks.map(t => [
            t.title,
            t.assignee,
            `${formatDate(t.startDate)} - ${formatDate(t.endDate)}`,
            formatHoursToTime(t.effort * 8) || '0h',
            t.status
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.map(h => `"${h}"`).join(",") + "\n"
            + subHeaders.map(h => `"${h}"`).join(",") + "\n\n"
            + tableHeaders.join(",") + "\n"
            + rows.map(e => e.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${sprint.name.replace(/\s+/g, '_')}_Report.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text(`Sprint Report: ${sprint.name}`, 14, 22);

        // Sub headers
        doc.setFontSize(11);
        doc.setTextColor(100);

        const goalText = doc.splitTextToSize(`Goal: ${sprint.goal || 'N/A'}`, 180);
        doc.text(goalText, 14, 30);

        const goalHeight = doc.getTextDimensions(goalText).h;
        const detailsY = 30 + goalHeight + 4;

        doc.text(`Dates: ${formatDate(sprint.startDate)} to ${formatDate(sprint.endDate)}`, 14, detailsY);
        doc.text(`Capacity: ${formatHoursToTime(sprint.capacity * 8) || '0h'} (Utilized: ${utilization}% - ${formatHoursToTime(totalEffort * 8) || '0h'})`, 14, detailsY + 6);

        // Tasks Table
        const tableColumn = ["Task Title", "Assignee", "Schedule", "Effort", "Status"];
        const tableRows = tasks.map(t => [
            t.title,
            t.assignee,
            `${formatDate(t.startDate)} to ${formatDate(t.endDate)}`,
            formatHoursToTime(t.effort * 8) || '0h',
            t.status
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: detailsY + 12,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fillColor: [79, 70, 229] } // Indigo-600
        });

        doc.save(`${sprint.name.replace(/\s+/g, '_')}_Report.pdf`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            {/* Header Section */}
            <div className="flex flex-col gap-5 mb-6">
                {/* Top Row: Context & Sprint Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-1">
                    <div className="flex items-start md:items-center gap-4">
                        <button onClick={onBack} className="p-2.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-xl transition-all shadow-sm shrink-0">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center flex-wrap gap-3">
                                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{sprint.name}</h2>
                                <Badge color={sprint.status === 'Active' ? 'green' : 'blue'}>{sprint.status}</Badge>
                                <span className="flex items-center text-xs font-semibold text-gray-600 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                                </span>
                            </div>
                            {sprint.goal && <p className="text-sm text-gray-500 mt-2 font-medium">{sprint.goal}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-5 w-full md:w-auto mt-2 md:mt-0">
                        {/* Capacity Summary */}
                        <div className="flex flex-col items-end shrink-0 hidden sm:flex">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Capacity: {utilization}%</div>
                            <div className="w-32 bg-gray-200/80 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className={`h-1.5 rounded-full ${getUtilizationColor(utilization)} transition-all duration-500`}
                                    style={{ width: `${Math.min(utilization, 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {canManageSprintSettings && (
                            <>
                                <div className="w-px h-8 bg-gray-300 hidden sm:block"></div>
                                <div className="flex items-center gap-2 ml-auto md:ml-0">
                                    <button
                                        onClick={() => setIsEditSprintModalOpen(true)}
                                        className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-all flex items-center justify-center"
                                        title="Edit Sprint"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to delete the sprint "${sprint.name}"? All associated tasks will be removed.`)) {
                                                if (onDeleteSprint) onDeleteSprint(sprint.id);
                                            }
                                        }}
                                        className="p-2 bg-white border border-gray-200 shadow-sm rounded-xl text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center"
                                        title="Delete Sprint"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Toolbar */}
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Team Avatars */}
                        {sprint.team && sprint.team.length > 0 && (
                            <div className="flex items-center pr-4 border-r border-gray-200 shrink-0">
                                <div className="flex -space-x-2.5 hover:space-x-0.5 transition-all duration-300">
                                    {sprint.team.map((member) => {
                                        const isSelected = selectedMemberFilter === member.name;
                                        const memberEffort = tasks.filter(t => (t.assignee || '').split(',').map(n => n.trim()).includes(member.name)).reduce((sum, t) => sum + (t.effort || 0), 0);
                                        const memberUtilization = member.daysWorking ? Math.round((memberEffort / member.daysWorking) * 100) : 0;
                                        return (
                                            <div
                                                key={member.id}
                                                onClick={() => setSelectedMemberFilter(isSelected ? null : member.name)}
                                                className={`h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all shadow-sm ${isSelected ? 'bg-violet-600 text-white z-10 scale-110 ring-violet-200' : 'bg-gradient-to-br from-violet-100 to-violet-200 text-violet-800 hover:scale-105'
                                                    } ${selectedMemberFilter && !isSelected ? 'opacity-40 grayscale' : ''}`}
                                                title={`${member.name} (${memberUtilization}% capacity used) - Click to filter`}
                                            >
                                                {getInitials(member.name)}
                                            </div>
                                        );
                                    })}
                                </div>
                                {selectedMemberFilter && (
                                    <button
                                        onClick={() => setSelectedMemberFilter(null)}
                                        className="ml-3 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                                        title="Clear Filter"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 transition-colors hover:bg-white hover:border-gray-300 focus-within:bg-white focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-500/20">
                                <User className="h-4 w-4 text-violet-500 shrink-0" />
                                <select
                                    className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 font-medium outline-none w-32 cursor-pointer"
                                    value={selectedMemberFilter || ''}
                                    onChange={(e) => setSelectedMemberFilter(e.target.value || null)}
                                >
                                    <option value="">All Assignees</option>
                                    {devTeam.map(member => (
                                        <option key={member.id} value={member.name}>{member.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 transition-colors hover:bg-white hover:border-gray-300 focus-within:bg-white focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-500/20">
                                <Filter className="h-4 w-4 text-violet-500 shrink-0" />
                                <select
                                    className="bg-transparent border-none text-sm focus:ring-0 text-gray-700 font-medium outline-none w-28 cursor-pointer"
                                    value={selectedTypeFilter || ''}
                                    onChange={(e) => setSelectedTypeFilter(e.target.value as TicketType || null)}
                                >
                                    <option value="">All Types</option>
                                    <option value="Story">User Story</option>
                                    <option value="Task">Task</option>
                                    <option value="Bug">Bug</option>
                                    <option value="Spike">Spike</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* View Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 ml-auto lg:ml-2 shrink-0">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-violet-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                title="List View"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('board')}
                                className={`p-1.5 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-violet-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                title="Board View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center justify-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 px-3 py-2 rounded-xl shadow-sm transition-all text-sm font-medium flex-1 lg:flex-none"
                            title="Download CSV format"
                        >
                            <Download className="h-4 w-4 text-gray-400" />
                            <span className="hidden sm:inline">CSV</span>
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="flex items-center justify-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 px-3 py-2 rounded-xl shadow-sm transition-all text-sm font-medium flex-1 lg:flex-none"
                            title="Download PDF format"
                        >
                            <Download className="h-4 w-4 text-gray-400" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>
                        
                        {canManageTasks && (
                            <button
                                onClick={() => { setCreateDefaultType(undefined); setCreateDefaultParent(undefined); setIsCreateOpen(true); }}
                                className="flex items-center justify-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl shadow-sm transition-all text-sm font-semibold ml-2 flex-1 lg:flex-none"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create</span>
                            </button>
                        )}
                        {userRole === 'QA' && (
                            <button
                                onClick={() => { setCreateDefaultType('Bug'); setCreateDefaultParent(undefined); setIsCreateOpen(true); }}
                                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all text-sm font-semibold"
                            >
                                <BugIcon className="h-4 w-4" />
                                <span>File Bug</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* View Area */}
            {viewMode === 'board' ? (
                <div className="bg-transparent min-h-[500px]">
                    {filteredTasks.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-md border border-gray-200 flex flex-col items-center justify-center h-64 text-gray-500 mt-4">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                {selectedMemberFilter || selectedTypeFilter ? <Filter className="w-8 h-8 text-violet-300" /> : <LayoutGrid className="w-8 h-8 text-violet-300" />}
                            </div>
                            <p className="text-lg font-medium">No tasks found.</p>
                            <p className="text-sm text-center max-w-sm mt-1">
                                {(selectedMemberFilter || selectedTypeFilter) ? 'Clear the filters to see more tasks.' : 'Click "+ Create" to add tasks to the board.'}
                            </p>
                            {(selectedMemberFilter || selectedTypeFilter) && (
                                <button
                                    onClick={() => { setSelectedMemberFilter(null); setSelectedTypeFilter(null); }}
                                    className="mt-4 px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <SprintBoard
                            tasks={filteredTasks}
                            allTasks={allTasks}
                            onEditTask={onEditTask}
                            onTaskClick={(task) => setEditingTask(task)}
                        />
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden min-h-[400px]">
                    {filteredTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <div className="bg-gray-50 p-4 rounded-full mb-3">
                                {(selectedMemberFilter || selectedTypeFilter) ? <Filter className="w-8 h-8 text-violet-300" /> : <Plus className="w-8 h-8 text-violet-300" />}
                            </div>
                            <p className="text-lg font-medium">{(selectedMemberFilter || selectedTypeFilter) ? 'No tasks found.' : 'No tasks assigned.'}</p>
                            <p className="text-sm text-center max-w-sm mt-1">{(selectedMemberFilter || selectedTypeFilter) ? 'Clear the filters to see more tasks.' : 'Click "+ Create" to add tasks to this sprint.'}</p>
                            {(selectedMemberFilter || selectedTypeFilter) && (
                                <button
                                    onClick={() => { setSelectedMemberFilter(null); setSelectedTypeFilter(null); }}
                                    className="mt-4 px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-16">S.No.</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assignee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Schedule</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Effort</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTasks.map((task, index) => {
                                const parentEpic = task.parentId ? allTasks.find(t => t.id === task.parentId && t.ticketType === 'Epic') : null;
                                return (
                                <tr
                                    key={task.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setEditingTask(task)}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-4">
                                        <TicketTypeBadge type={task.ticketType || 'Task'} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                {parentEpic && (
                                                    <span className="text-[10px] font-bold tracking-wider text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded uppercase">
                                                        {parentEpic.title}
                                                    </span>
                                                )}
                                                {task.storyPoints != null && (
                                                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">{task.storyPoints} pts</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <User className="w-4 h-4 mr-2" /> {task.assignee}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                                        {formatDate(task.startDate)} → {formatDate(task.endDate)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {formatHoursToTime(task.effort * 8) || '0h'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : task.status === 'Code Review' ? 'purple' : task.status === 'QA' ? 'yellow' : 'gray'}>
                                            {task.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2">
                                            {canManageTasks && (
                                                <button
                                                    onClick={() => setEditingTask(task)}
                                                    className="text-gray-400 hover:text-violet-600 transition-colors"
                                                    title="Edit Task"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>
            )}

            {isCreateOpen && (
                <CreateTicketModal
                    allTasks={allTasks}
                    allSprints={allSprints}
                    defaultSprintId={sprint.id}
                    defaultType={createDefaultType}
                    defaultParentId={createDefaultParent}
                    userRole={userRole || ''}
                    devTeam={devTeam}
                    onClose={() => setIsCreateOpen(false)}
                    onSave={(task: Task) => {
                        onAddTask(task);
                        setIsCreateOpen(false);
                    }}
                />
            )}

            {isEditSprintModalOpen && (
                <CreateSprintModal
                    sprint={sprint}
                    nextSprintNumber={0} // Not needed for edit
                    devTeam={devTeam}
                    onClose={() => setIsEditSprintModalOpen(false)}
                    onSave={(updatedSprint) => {
                        onEditSprint(updatedSprint);
                        setIsEditSprintModalOpen(false);
                    }}
                />
            )}

            {editingTask && (
                <EditTaskModal
                    currentUser={currentUser}
                    task={editingTask}
                    sprint={sprint}
                    childTasks={allTasks.filter(t => t.parentId === editingTask.id)}
                    onCreateChild={(parentId) => {
                        setCreateDefaultType(undefined);
                        setCreateDefaultParent(parentId);
                        setIsCreateOpen(true);
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

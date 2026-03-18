import React, { useState } from 'react';
import { Sprint, Task, Ticket } from '../../types';
import { ChevronLeft, Plus, Calendar, User, Pencil, Save, Trash2, Download, X, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { CreateSprintModal } from './CreateSprintModal';
import { Badge } from '../Badge';
import { formatDate, getInitials, formatHoursToTime } from '../../lib/utils';
import { DevTeamMember } from '../../types';

interface SprintDetailsProps {
    sprint: Sprint;
    tasks: Task[];
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

export const SprintDetails: React.FC<SprintDetailsProps> = ({ sprint, tasks, backlog, devTeam, onBack, onAddTask, onEditSprint, onEditTask, onDeleteTask, onDeleteSprint, currentUser, userRole }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditSprintModalOpen, setIsEditSprintModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedMemberFilter, setSelectedMemberFilter] = useState<string | null>(null);

    // Calculate Utilization
    const totalEffort = tasks.reduce((sum, task) => sum + task.effort, 0);
    const utilization = Math.round((totalEffort / sprint.capacity) * 100);

    const getUtilizationColor = (pct: number) => {
        if (pct > 100) return 'bg-red-500';
        if (pct > 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const filteredTasks = selectedMemberFilter
        ? tasks.filter(t =>
            t.assignee
                .split(',')
                .map(name => name.trim())
                .includes(selectedMemberFilter)
        )
        : tasks;

    const canManageTasks = userRole === 'PM' || userRole === 'DEV' || userRole === 'DEV_LEAD';
    const canManageSprintSettings = userRole === 'PM';

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
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h2 className="text-2xl font-bold text-gray-900">{sprint.name}</h2>
                                <Badge color={sprint.status === 'Active' ? 'green' : 'blue'}>{sprint.status}</Badge>
                                {canManageSprintSettings && (
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={() => setIsEditSprintModalOpen(true)}
                                            className="p-1 text-gray-400 hover:text-violet-600 transition-colors"
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
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Delete Sprint"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{sprint.goal}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 flex items-center justify-end">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                            </p>
                            <div className="mt-2 w-48">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Capacity Used</span>
                                    <span>{utilization}% ({formatHoursToTime(totalEffort * 8) || '0h'}/{formatHoursToTime(sprint.capacity * 8) || '0h'})</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full ${getUtilizationColor(utilization)} transition-all duration-500`}
                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {sprint.team && sprint.team.length > 0 && (
                            <div className="flex flex-col items-end mt-2">
                                <span className="text-xs text-gray-500 mb-1 font-medium">Sprint Team</span>
                                <div className="flex items-center space-x-2">
                                    <div className="flex -space-x-2 overflow-hidden p-1">
                                        {sprint.team.map((member) => {
                                            const isSelected = selectedMemberFilter === member.name;
                                            return (
                                                <div
                                                    key={member.id}
                                                    onClick={() => setSelectedMemberFilter(isSelected ? null : member.name)}
                                                    className={`inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all shadow-sm ${isSelected ? 'bg-violet-600 text-white z-10 scale-110 ring-violet-200' : 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                                        } ${selectedMemberFilter && !isSelected ? 'opacity-40 grayscale' : ''}`}
                                                    title={`${member.name} (${member.daysWorking} days) - Click to filter tasks`}
                                                >
                                                    {getInitials(member.name)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedMemberFilter && (
                                        <button
                                            onClick={() => setSelectedMemberFilter(null)}
                                            className="ml-1 p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                                            title="Clear Filter"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-2 mt-4 ml-auto">

                            <button
                                onClick={exportToCSV}
                                className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-2xl shadow-md transition-all text-sm"
                                title="Download CSV format"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">CSV</span>
                            </button>
                            <button
                                onClick={exportToPDF}
                                className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-2xl shadow-md transition-all text-sm"
                                title="Download PDF format"
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">PDF</span>
                            </button>
                            {canManageTasks && (
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-2xl shadow-md transition-all text-sm ml-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Add Tasks</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden min-h-[400px]">
                {filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <div className="bg-gray-50 p-4 rounded-full mb-3">
                            {selectedMemberFilter ? <Filter className="w-8 h-8 text-violet-300" /> : <Plus className="w-8 h-8 text-violet-300" />}
                        </div>
                        <p className="text-lg font-medium">{selectedMemberFilter ? 'No tasks found for this member.' : 'No tasks assigned.'}</p>
                        <p className="text-sm text-center max-w-sm mt-1">{selectedMemberFilter ? `Clear the filter or assign new tasks to ${selectedMemberFilter}.` : 'Click "Add Tasks" to plan this sprint.'}</p>
                        {selectedMemberFilter && (
                            <button
                                onClick={() => setSelectedMemberFilter(null)}
                                className="mt-4 px-4 py-2 bg-white border border-gray-300 shadow-sm rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-16">S.No.</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Task Title</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assignee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Schedule</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Effort</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                {canManageTasks && (
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTasks.map((task, index) => (
                                <tr
                                    key={task.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => setEditingTask(task)}
                                >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                            <span className="text-xs text-gray-400 font-mono">{task.ticketId}</span>
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
                                        <Badge color={task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : 'gray'}>
                                            {task.status}
                                        </Badge>
                                    </td>
                                    {canManageTasks && (
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setEditingTask(task)}
                                                className="text-gray-400 hover:text-violet-600 transition-colors"
                                                title="Edit Task"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isAddModalOpen && (
                <AddTaskModal
                    sprint={sprint}
                    backlog={backlog}
                    onClose={() => setIsAddModalOpen(false)}
                    onAdd={(task) => {
                        onAddTask(task);
                        setIsAddModalOpen(false);
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

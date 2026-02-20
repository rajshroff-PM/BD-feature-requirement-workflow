import React, { useState } from 'react';
import { Sprint, Task, Ticket } from '../../types';
import { ChevronLeft, Plus, Calendar, User, Pencil, Save, Trash2 } from 'lucide-react';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { CreateSprintModal } from './CreateSprintModal';
import { Badge } from '../Badge';

interface SprintDetailsProps {
    sprint: Sprint;
    tasks: Task[];
    backlog: Ticket[];
    onBack: () => void;
    onAddTask: (task: Task) => void;
    onEditSprint: (sprint: Sprint) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onDeleteSprint?: (sprintId: string) => void;
}

export const SprintDetails: React.FC<SprintDetailsProps> = ({ sprint, tasks, backlog, onBack, onAddTask, onEditSprint, onEditTask, onDeleteTask, onDeleteSprint }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditSprintModalOpen, setIsEditSprintModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Calculate Utilization
    const totalEffort = tasks.reduce((sum, task) => sum + task.effort, 0);
    const utilization = Math.round((totalEffort / sprint.capacity) * 100);

    const getUtilizationColor = (pct: number) => {
        if (pct > 100) return 'bg-red-500';
        if (pct > 80) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <div className="flex items-center space-x-3">
                                <h2 className="text-2xl font-bold text-gray-900">{sprint.name}</h2>
                                <Badge color={sprint.status === 'Active' ? 'green' : 'blue'}>{sprint.status}</Badge>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => setIsEditSprintModalOpen(true)}
                                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
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
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{sprint.goal}</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 flex items-center justify-end">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {sprint.startDate} - {sprint.endDate}
                            </p>
                            <div className="mt-2 w-48">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Capacity Used</span>
                                    <span>{utilization}% ({totalEffort}/{sprint.capacity} days)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className={`h-2.5 rounded-full ${getUtilizationColor(utilization)} transition-all duration-500`}
                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Tasks</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <div className="bg-gray-50 p-4 rounded-full mb-3">
                            <Plus className="w-8 h-8 text-indigo-300" />
                        </div>
                        <p className="text-lg font-medium">No tasks assigned.</p>
                        <p className="text-sm">Click "Add Tasks" to plan this sprint.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Task Title</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assignee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Schedule</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Effort</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tasks.map((task) => (
                                <tr key={task.id} className="hover:bg-gray-50">
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
                                        {task.startDate} → {task.endDate}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {task.effort} Day(s)
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color={task.status === 'Done' ? 'green' : task.status === 'In Progress' ? 'blue' : 'gray'}>
                                            {task.status}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setEditingTask(task)}
                                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                                            title="Edit Task"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    </td>
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
                    onClose={() => setIsEditSprintModalOpen(false)}
                    onSave={(updatedSprint) => {
                        onEditSprint(updatedSprint);
                        setIsEditSprintModalOpen(false);
                    }}
                />
            )}

            {editingTask && (
                <EditTaskModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                    onSave={(updatedTask) => {
                        onEditTask(updatedTask);
                        setEditingTask(null);
                    }}
                    onDelete={(taskId) => {
                        onDeleteTask(taskId);
                        setEditingTask(null);
                    }}
                />
            )}
        </div>
    );
};

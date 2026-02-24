import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task, Sprint } from '../../types';

interface EditTaskModalProps {
    task: Task;
    sprint: Sprint;
    onClose: () => void;
    onSave: (updatedTask: Task) => void;
    onDelete: (taskId: string) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, sprint, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [assignees, setAssignees] = useState<string[]>(task.assignee ? task.assignee.split(',').map(s => s.trim()).filter(Boolean) : []);
    const [status, setStatus] = useState<Task['status']>(task.status);
    const [effort, setEffort] = useState(task.effort);
    const [startDate, setStartDate] = useState(task.startDate);
    const [endDate, setEndDate] = useState(task.endDate);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...task,
            title,
            description,
            assignee: assignees.join(', '),
            status,
            effort,
            startDate,
            endDate
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Task</h3>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Task Title</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Describe the task..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assignee(s)</label>
                                <div className="mt-1 border border-gray-300 rounded-xl shadow-sm p-3 max-h-32 overflow-y-auto bg-white">
                                    {sprint.team && sprint.team.length > 0 ? (
                                        sprint.team.map(m => (
                                            <label key={m.id} className="flex items-center space-x-2 py-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={assignees.includes(m.name)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setAssignees([...assignees, m.name]);
                                                        else setAssignees(assignees.filter(a => a !== m.name));
                                                    }}
                                                    className="w-4 h-4 text-violet-600 focus:ring-violet-500 rounded border-gray-300"
                                                />
                                                <span className="text-sm text-gray-700">{m.name} ({m.role || 'Dev'})</span>
                                            </label>
                                        ))
                                    ) : (
                                        <span className="text-sm text-gray-500">No team selected for this sprint</span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={sprint.startDate}
                                        max={sprint.endDate}
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                                    <input
                                        type="date"
                                        required
                                        min={sprint.startDate}
                                        max={sprint.endDate}
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as Task['status'])}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                    >
                                        <option value="To Do">To Do</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Effort (Days)</label>
                                    <input
                                        type="number"
                                        required
                                        min={0.5}
                                        step={0.5}
                                        value={effort}
                                        onChange={(e) => setEffort(Number(e.target.value))}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                    />
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse sm:justify-between sm:gap-3">
                                <div className="sm:flex sm:gap-3">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-md px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:w-auto sm:text-sm"
                                    >
                                        Save Changes
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-md px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:mt-0 sm:w-auto sm:text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to delete this task?')) {
                                            onDelete(task.id);
                                        }
                                    }}
                                    className="mt-3 w-full inline-flex justify-center rounded-xl border border-transparent shadow-md px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
                                >
                                    Delete Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

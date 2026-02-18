import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Ticket, Task, Sprint } from '../../types';

interface AddTaskModalProps {
    sprint: Sprint;
    backlog: Ticket[];
    onClose: () => void;
    onAdd: (task: Task) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ sprint, backlog, onClose, onAdd }) => {
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [mode, setMode] = useState<'select' | 'manual'>('select');
    const [manualTitle, setManualTitle] = useState('');

    // Task Form State
    const [assignee, setAssignee] = useState('Dave (Dev)');
    const [startDate, setStartDate] = useState(sprint.startDate);
    const [endDate, setEndDate] = useState(sprint.startDate); // Default to start
    const [error, setError] = useState('');

    // Calculate effort based on dates
    const calculateEffort = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
        return diffDays > 0 ? diffDays : 0;
    };

    const handleAdd = () => {
        if (mode === 'select' && !selectedTicket) return;
        if (mode === 'manual' && !manualTitle.trim()) {
            setError('Task title is required.');
            return;
        }

        // Date Validation
        if (new Date(startDate) < new Date(sprint.startDate) || new Date(endDate) > new Date(sprint.endDate)) {
            setError('Task dates must be within the sprint timeline.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            setError('End date cannot be before start date.');
            return;
        }

        const task: Task = {
            id: `TASK-${Date.now()}`,
            sprintId: sprint.id,
            ticketId: mode === 'select' ? selectedTicket!.id : undefined,
            title: mode === 'select' ? selectedTicket!.title : manualTitle,
            assignee,
            startDate,
            endDate,
            effort: calculateEffort(startDate, endDate),
            status: 'To Do'
        };

        onAdd(task);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="relative w-full max-w-5xl my-8 overflow-hidden text-left bg-white rounded-lg shadow-xl h-[80vh] flex flex-col">

                    <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Add Tasks to {sprint.name}</h3>
                            <div className="flex space-x-4 mt-2">
                                <button
                                    onClick={() => setMode('select')}
                                    className={`text-sm font-medium pb-1 border-b-2 transition-colors ${mode === 'select' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Select from Backlog
                                </button>
                                <button
                                    onClick={() => setMode('manual')}
                                    className={`text-sm font-medium pb-1 border-b-2 transition-colors ${mode === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                >
                                    Create Manually
                                </button>
                            </div>
                        </div>
                        <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        {/* LEFT PANE: Backlog or Instructions */}
                        <div className="w-1/2 border-r border-gray-200 overflow-y-auto bg-gray-50 p-4">
                            {mode === 'select' ? (
                                <>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Approved Backlog</h4>
                                    <div className="space-y-3">
                                        {backlog.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No approved items found.</p>
                                        ) : (
                                            backlog.map(ticket => (
                                                <div
                                                    key={ticket.id}
                                                    onClick={() => { setSelectedTicket(ticket); setError(''); }}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTicket?.id === ticket.id
                                                        ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                                                        : 'bg-white border-gray-200 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-xs font-mono text-gray-500">{ticket.id}</span>
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{ticket.pmStatus}</span>
                                                    </div>
                                                    <h5 className="text-sm font-medium text-gray-900 mt-1">{ticket.title}</h5>
                                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ticket.value}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
                                    <div className="bg-indigo-50 p-4 rounded-full mb-4">
                                        <Calendar className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h4 className="text-lg font-medium text-gray-900">Manual Task Creation</h4>
                                    <p className="text-sm mt-2 max-w-xs">Create ad-hoc tasks, bugs, or chores that aren't directly linked to a Business Requirement ticket.</p>
                                </div>
                            )}
                        </div>

                        {/* RIGHT PANE: Task form */}
                        <div className="w-1/2 p-6 overflow-y-auto bg-white">
                            {(selectedTicket || mode === 'manual') ? (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-lg font-medium text-gray-900 mb-1">Define Task Details</h4>
                                        {mode === 'select' && (
                                            <p className="text-sm text-gray-500">Creating task for <span className="font-semibold text-gray-700">{selectedTicket!.id}</span></p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Task Title</label>
                                            <input
                                                type="text"
                                                value={mode === 'select' ? selectedTicket!.title : manualTitle}
                                                onChange={(e) => mode === 'manual' && setManualTitle(e.target.value)}
                                                disabled={mode === 'select'}
                                                className={`mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 ${mode === 'select' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-indigo-500 focus:border-indigo-500'}`}
                                                placeholder={mode === 'manual' ? "e.g. Update Documentation" : ""}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Assignee</label>
                                            <select
                                                value={assignee}
                                                onChange={(e) => setAssignee(e.target.value)}
                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option>Dave (Dev)</option>
                                                <option>Sarah (Frontend)</option>
                                                <option>Mike (Backend)</option>
                                                <option>Jessica (QA)</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    min={sprint.startDate}
                                                    max={sprint.endDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">End Date</label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    min={sprint.startDate}
                                                    max={sprint.endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 p-3 rounded-md flex items-center">
                                            <Calendar className="w-4 h-4 text-blue-500 mr-2" />
                                            <span className="text-sm text-blue-700 font-medium">
                                                Estimated Effort: {calculateEffort(startDate, endDate)} Day(s)
                                            </span>
                                        </div>

                                        {error && (
                                            <div className="bg-red-50 p-3 rounded-md border border-red-200">
                                                <p className="text-sm text-red-600">{error}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-gray-200">
                                        <button
                                            onClick={handleAdd}
                                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            {mode === 'select' ? 'Assign to Sprint' : 'Create Task'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                                        <Calendar className="w-8 h-8" />
                                    </div>
                                    <p>Select a backlog item to assign.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, User as UserIcon } from 'lucide-react';
import { Task, Sprint, TaskLog } from '../../types';
import { supabase } from '../../supabaseClient';
import { formatDate, parseTimeToHours, formatHoursToTime } from '../../lib/utils';
import { Badge } from '../Badge';

interface EditTaskModalProps {
    currentUser?: any;
    task: Task;
    sprint: Sprint;
    onClose: () => void;
    onSave: (updatedTask: Task) => void;
    onDelete: (taskId: string) => void;
    userRole?: string;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ currentUser, task, sprint, onClose, onSave, onDelete, userRole }) => {
    const isReadOnly = userRole === 'PO';
    // Time tracking
    const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
    const [timeSpentInput, setTimeSpentInput] = useState('');
    const [timeRemainingInput, setTimeRemainingInput] = useState('');

    const estimatedTime = task.estimatedTime || '';
    const loggedTime = task.loggedTime || '';

    const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
    const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
    const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    const assignees = task.assignee ? task.assignee.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Calculate effort based on dates and assignees
    const calculateEffort = (start: string, end: string, assigneesList: string[], estTimeStr: string) => {
        const estHours = parseTimeToHours(estTimeStr);
        if (estHours > 0) {
            return Number((estHours / 8).toFixed(2));
        }
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
        const baseDays = diffDays > 0 ? diffDays : 0;
        const multiplier = Math.max(1, assigneesList.length);
        return baseDays * multiplier;
    };

    // Fetch logs
    useEffect(() => {
        if (activeTab === 'history') {
            fetchTaskLogs();
        }
    }, [activeTab, task.id]);

    const fetchTaskLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const { data, error } = await supabase
                .from('task_logs')
                .select(`
                    id, task_id, profile_id, action_type, field_name, old_value, new_value, logged_amount, created_at,
                    profiles:profile_id (full_name, avatar_url)
                `)
                .eq('task_id', task.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map the nested profile data
            const formattedLogs = (data || []).map((log: any) => ({
                id: log.id,
                taskId: log.task_id,
                profileId: log.profile_id,
                actionType: log.action_type,
                fieldName: log.field_name,
                oldValue: log.old_value,
                newValue: log.new_value,
                loggedAmount: log.logged_amount,
                createdAt: log.created_at,
                profile: log.profiles ? {
                    fullName: log.profiles.full_name,
                    avatarUrl: log.profiles.avatar_url
                } : undefined
            }));

            setTaskLogs(formattedLogs);
        } catch (error) {
            console.error('Error fetching task logs:', error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsAssigneeDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);





    const estimatedHours = parseTimeToHours(estimatedTime) || (task.effort * 8);
    const loggedHours = parseTimeToHours(loggedTime);
    const remainingHours = Math.max(0, estimatedHours - loggedHours);

    // Calculate progress percentage
    const progressPercent = estimatedHours > 0 ? Math.min(100, (loggedHours / estimatedHours) * 100) : 0;

    // Helper to log changes to Supabase
    const logTaskChange = async (actionType: 'update_field' | 'log_time', details: any) => {
        if (!currentUser?.id) {
            console.error('Missing currentUser.id - cannot log task change. Please refresh the page!', currentUser);
            // Optionally alert the user too for debugging during development
            return;
        }

        try {
            await supabase.from('task_logs').insert({
                task_id: task.id,
                profile_id: currentUser.id,
                action_type: actionType,
                ...details
            });

            // Refresh logs if history tab is open
            if (activeTab === 'history') {
                fetchTaskLogs();
            }
        } catch (error) {
            console.error('Error logging task change:', error);
        }
    };

    // Helper to fire updates instantly
    const updateTaskFields = (updates: Partial<Task>) => {
        let hasChanges = false;

        if (currentUser?.id) {
            const logsToInsert = Object.keys(updates).map(key => {
                const field = key as keyof Task;
                const oldValue = task[field];
                const newValue = updates[field];
                if (oldValue !== newValue) {
                    hasChanges = true;
                    return {
                        task_id: task.id,
                        profile_id: currentUser.id,
                        action_type: 'update_field',
                        field_name: field,
                        old_value: String(oldValue ?? ''),
                        new_value: String(newValue ?? '')
                    };
                }
                return null;
            }).filter(Boolean);

            if (logsToInsert.length > 0) {
                supabase.from('task_logs').insert(logsToInsert).then(() => {
                    if (activeTab === 'history') fetchTaskLogs();
                });
            }
        } else {
            hasChanges = Object.keys(updates).some(key => task[key as keyof Task] !== updates[key as keyof Task]);
        }

        if (hasChanges) {
            onSave({
                ...task,
                ...updates
            } as Task);
        }
    };

    const updateTaskField = (field: keyof Task, value: any) => {
        updateTaskFields({ [field]: value });
    };

    // Handle Time Tracking Modal Auto-Calculation
    useEffect(() => {
        if (isTimeModalOpen) {
            const addedHours = parseTimeToHours(timeSpentInput);
            const newRemaining = Math.max(0, remainingHours - addedHours);
            setTimeRemainingInput(formatHoursToTime(newRemaining));
        }
    }, [timeSpentInput, isTimeModalOpen]);

    const handleSaveTimeTracking = () => {
        const addedHours = parseTimeToHours(timeSpentInput);
        if (addedHours <= 0) return;

        const newTotalLoggedHours = loggedHours + addedHours;
        const newLoggedTimeStr = formatHoursToTime(newTotalLoggedHours);

        // Log the time addition explicitly
        logTaskChange('log_time', {
            logged_amount: timeSpentInput
        });

        // Auto-save the new logged time directly (bypass updateTaskField to avoid generic update_field log)
        onSave({
            ...task,
            loggedTime: newLoggedTimeStr
        });

        setIsTimeModalOpen(false);
        setTimeSpentInput(''); // reset
    };

    const toggleAssignee = (name: string) => {
        let newAssignees;
        if (assignees.includes(name)) {
            newAssignees = assignees.filter(a => a !== name);
        } else {
            newAssignees = [...assignees, name];
        }

        const assigneesStr = newAssignees.join(', ');
        const newEffort = calculateEffort(task.startDate, task.endDate, newAssignees, task.estimatedTime || '');

        updateTaskFields({
            assignee: assigneesStr,
            effort: newEffort
        });
    };

    // Close dropdown when clicking outside (simple implementation by closing on mouseleave of the container)


    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                    <div className="bg-white px-6 pt-6 pb-6 w-full">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center space-x-6">
                                <h3 className="text-xl font-bold text-gray-900">Task details</h3>
                                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveTab('details')}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'details' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Change Log
                                    </button>
                                </div>
                            </div>
                            <button type="button" onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'details' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Task Details */}
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Task Title</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={isReadOnly}
                                                value={task.title}
                                                onChange={(e) => updateTaskField('title', e.target.value)}
                                                className={`block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                                            <textarea
                                                disabled={isReadOnly}
                                                value={task.description || ''}
                                                onChange={(e) => updateTaskField('description', e.target.value)}
                                                rows={5}
                                                className={`block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
                                                placeholder="Describe the task..."
                                            />
                                        </div>

                                        <div className="relative" ref={dropdownRef}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Assignee(s)</label>

                                            {/* Custom Dropdown Trigger */}
                                            <div
                                                className={`min-h-[42px] w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 flex flex-wrap gap-2 items-center transition-colors ${isReadOnly ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-text hover:border-violet-500'}`}
                                                onClick={() => {
                                                    if (!isReadOnly) {
                                                        setIsAssigneeDropdownOpen(true);
                                                        document.getElementById('assignee-search')?.focus();
                                                    }
                                                }}
                                            >
                                                {assignees.map(a => (
                                                    <span key={a} className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${isReadOnly ? 'bg-gray-200 text-gray-600' : 'bg-violet-100 text-violet-800'}`}>
                                                        {a}
                                                        {!isReadOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); toggleAssignee(a); }}
                                                                className="ml-1.5 focus:outline-none hover:text-violet-900"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                                {!isReadOnly && (
                                                    <input
                                                        id="assignee-search"
                                                        type="text"
                                                        value={assigneeSearchQuery}
                                                        onChange={(e) => {
                                                            setAssigneeSearchQuery(e.target.value);
                                                            if (!isAssigneeDropdownOpen) setIsAssigneeDropdownOpen(true);
                                                        }}
                                                        className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
                                                        placeholder={assignees.length === 0 ? "Select or type assignees..." : ""}
                                                    />
                                                )}
                                            </div>

                                            {/* Dropdown Menu */}
                                            {isAssigneeDropdownOpen && (
                                                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto py-1">
                                                    {sprint.team && sprint.team.length > 0 ? (
                                                        (() => {
                                                            const filtered = sprint.team.filter(m => m.name.toLowerCase().includes(assigneeSearchQuery.toLowerCase()));
                                                            if (filtered.length === 0) {
                                                                return <div className="px-4 py-3 text-sm text-gray-500 italic">No matching team members found</div>;
                                                            }
                                                            return filtered.map(m => (
                                                                <div
                                                                    key={m.id}
                                                                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                                                    onClick={() => {
                                                                        toggleAssignee(m.name);
                                                                        setAssigneeSearchQuery('');
                                                                        document.getElementById('assignee-search')?.focus();
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={assignees.includes(m.name)}
                                                                        readOnly
                                                                        className="w-4 h-4 text-violet-600 rounded border-gray-300 mr-3 pointer-events-none"
                                                                    />
                                                                    <span className="text-sm font-medium text-gray-700">{m.name} <span className="text-gray-500 font-normal text-xs ml-1">({m.role || 'Dev'})</span></span>
                                                                </div>
                                                            ))
                                                        })()
                                                    ) : (
                                                        <div className="px-4 py-3 text-sm text-gray-500 italic">No team selected for this sprint</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Schedule and Tracking */}
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    disabled={isReadOnly}
                                                    min={sprint.startDate}
                                                    max={sprint.endDate}
                                                    value={task.startDate}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newEffort = calculateEffort(val, task.endDate, assignees, task.estimatedTime || '');
                                                        updateTaskFields({ startDate: val, effort: newEffort });
                                                    }}
                                                    className={`block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
                                                <input
                                                    type="date"
                                                    required
                                                    disabled={isReadOnly}
                                                    min={sprint.startDate}
                                                    max={sprint.endDate}
                                                    value={task.endDate}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newEffort = calculateEffort(task.startDate, val, assignees, task.estimatedTime || '');
                                                        updateTaskFields({ endDate: val, effort: newEffort });
                                                    }}
                                                    className={`block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                                                <select
                                                    disabled={isReadOnly}
                                                    value={task.status}
                                                    onChange={(e) => updateTaskField('status', e.target.value as Task['status'])}
                                                    className={`block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : 'bg-white'}`}
                                                >
                                                    <option value="To Do">To Do</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Done">Done</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex justify-between">
                                                    <span>Estimated Time</span>
                                                    <span className="font-normal text-xs text-gray-500">{(task.effort || 0)} day(s)</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    disabled={isReadOnly}
                                                    value={task.estimatedTime || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newEffort = calculateEffort(task.startDate, task.endDate, assignees, val);
                                                        updateTaskFields({ estimatedTime: val, effort: newEffort });
                                                    }}
                                                    placeholder="e.g. 1d 4h"
                                                    className={`block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-violet-500 focus:border-violet-500 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-600' : ''}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Time Tracking Section (Jira Style) */}
                                        <div
                                            className={`border border-gray-200 rounded-xl p-4 transition-colors group shadow-sm bg-gray-50 ${isReadOnly ? 'cursor-default' : 'hover:bg-blue-50 cursor-pointer'}`}
                                            onClick={() => {
                                                if (!isReadOnly) setIsTimeModalOpen(true);
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className={`text-sm font-bold text-gray-800 transition-colors flex items-center ${isReadOnly ? '' : 'group-hover:text-blue-700'}`}>
                                                    Time tracking
                                                    {!isReadOnly && <span className="ml-2 text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Log time</span>}
                                                </h4>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-1">
                                                <div className="flex h-2.5 overflow-hidden bg-gray-200 rounded-full">
                                                    <div
                                                        style={{ width: `${progressPercent}%` }}
                                                        className="bg-blue-600 transition-all duration-500 rounded-full"
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between mt-2 text-[13px] font-medium text-gray-600">
                                                    <span>{loggedTime || '0h'} logged</span>
                                                    <span>{formatHoursToTime(remainingHours) || '0h'} remaining</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'history' && (
                                <div className="min-h-[300px] border border-gray-100 rounded-xl bg-gray-50/50 p-6">
                                    {isLoadingLogs ? (
                                        <div className="flex justify-center items-center h-40">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                                        </div>
                                    ) : taskLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                            <Clock className="w-8 h-8 mb-2 opacity-50" />
                                            <p>No changes recorded yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {taskLogs.map((log) => (
                                                <div key={log.id} className="flex gap-4">
                                                    <div className="flex-shrink-0 mt-1">
                                                        {log.profile?.avatarUrl ? (
                                                            <img src={log.profile.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                                                                {log.profile?.fullName ? log.profile.fullName.substring(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {log.profile?.fullName || 'Unknown User'}{' '}
                                                                <span className="font-normal text-gray-600">
                                                                    {log.actionType === 'log_time' ? (
                                                                        <>logged <Badge color="blue">{log.loggedAmount}</Badge></>
                                                                    ) : (
                                                                        <>updated the <span className="font-semibold text-gray-800 capitalize">{log.fieldName}</span></>
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                                                {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        {log.actionType === 'update_field' && (
                                                            <div className="text-sm flex items-center text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-block mt-1">
                                                                <span className="line-through text-gray-400">{log.oldValue || 'None'}</span>
                                                                <span className="mx-2 text-gray-300">→</span>
                                                                <span className="font-medium text-gray-900">{log.newValue || 'None'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Time Tracking Modal Popup */}
                            {isTimeModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                    <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsTimeModalOpen(false)}></div>
                                    <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden transform transition-all text-left">
                                        <div className="bg-white px-6 pt-5 pb-6">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-bold text-gray-900">Time tracking</h3>
                                                <button type="button" onClick={() => setIsTimeModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                                            </div>

                                            {/* Mini Progress Bar in Modal */}
                                            <div className="mb-6">
                                                <div className="flex h-2 overflow-hidden bg-gray-200 rounded-full">
                                                    <div
                                                        style={{ width: `${Math.min(100, ((loggedHours + parseTimeToHours(timeSpentInput)) / Math.max(estimatedHours, 1)) * 100)}%` }}
                                                        className="bg-blue-600 transition-all duration-300"
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs font-medium text-gray-500">
                                                    <span>{formatHoursToTime(loggedHours + parseTimeToHours(timeSpentInput)) || '0h'} logged</span>
                                                    <span>{timeRemainingInput || formatHoursToTime(remainingHours) || '0h'} remaining</span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-600 mb-4">
                                                The original estimate for this work item was <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono text-xs font-semibold">{estimatedTime || `${task.effort}d`}</span>.
                                            </p>

                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Time spent</label>
                                                    <input
                                                        type="text"
                                                        value={timeSpentInput}
                                                        onChange={(e) => setTimeSpentInput(e.target.value)}
                                                        className="block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="e.g. 1h"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center">
                                                        Time remaining <span className="ml-1 text-gray-400 cursor-help" title="Calculates automatically based on time spent">ⓘ</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={timeRemainingInput}
                                                        onChange={(e) => setTimeRemainingInput(e.target.value)}
                                                        className="block w-full border border-gray-300 rounded-xl shadow-sm px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                                        placeholder="e.g. 3h"
                                                    />
                                                </div>
                                            </div>

                                            <div className="text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <p className="font-semibold mb-1">Use the format: 2w 4d 6h 45m</p>
                                                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                                    <li>w = weeks</li>
                                                    <li>d = days</li>
                                                    <li>h = hours</li>
                                                    <li>m = minutes</li>
                                                </ul>
                                            </div>

                                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsTimeModalOpen(false)}
                                                    className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveTimeTracking}
                                                    className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                <div className="flex gap-3">
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to delete this task?')) {
                                                    onDelete(task.id);
                                                }
                                            }}
                                            className="inline-flex justify-center items-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none transition-colors"
                                        >
                                            Delete Task
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex justify-center items-center rounded-xl border border-transparent shadow-md px-5 py-2 bg-violet-600 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

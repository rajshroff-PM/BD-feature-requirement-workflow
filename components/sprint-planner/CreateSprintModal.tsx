import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2 } from 'lucide-react';
import { Sprint, Profile, SprintTeamMember } from '../../types';
import { formatHoursToTime } from '../../lib/utils';

interface CreateSprintModalProps {
    sprint?: Sprint;
    profiles?: Profile[];
    onClose: () => void;
    onSave: (sprint: Sprint) => void;
    nextSprintNumber: number;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({ sprint, profiles = [], onClose, onSave, nextSprintNumber }) => {
    const [name, setName] = useState(`Sprint ${nextSprintNumber}`);
    const [goal, setGoal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [team, setTeam] = useState<SprintTeamMember[]>([]);
    const [status, setStatus] = useState<Sprint['status']>('Planned');
    const [dateError, setDateError] = useState('');
    const [sprintDurationDays, setSprintDurationDays] = useState<number>(15);
    const [calculatedWorkingDays, setCalculatedWorkingDays] = useState<number>(0);

    // Calculate number of working days in a sprint
    // Rules: weekdays (Mon-Fri) are working days, Sundays are weekoffs.
    // Saturdays are working days ONLY if they are the 1st, 3rd, or 5th Saturday of the month.
    // 2nd and 4th Saturdays are weekoffs.
    const countWorkingDays = (startStr: string, endStr: string): number => {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

        let workingDays = 0;
        let current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                // Monday to Friday is always working
                workingDays++;
            } else if (dayOfWeek === 6) {
                const dateNum = current.getDate();
                const occurrence = Math.ceil(dateNum / 7);
                if ([1, 3, 5].includes(occurrence)) {
                    // 1st, 3rd, 5th Saturday is a working day
                    workingDays++;
                }
            }
            current.setDate(current.getDate() + 1);
        }

        return workingDays;
    };

    useEffect(() => {
        if (sprint) {
            setName(sprint.name);
            setGoal(sprint.goal || '');
            setStartDate(sprint.startDate);
            setEndDate(sprint.endDate);
            setTeam(sprint.team || []);
            setStatus(sprint.status);

            if (sprint.startDate && sprint.endDate) {
                const start = new Date(sprint.startDate);
                const end = new Date(sprint.endDate);
                const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                setSprintDurationDays(diffDays > 0 ? diffDays : 15);
                setCalculatedWorkingDays(countWorkingDays(sprint.startDate, sprint.endDate));
            }
        }
    }, [sprint]);

    // Auto-calculate capacity based on team days
    const totalCapacity = team.reduce((sum, member) => sum + (member.daysWorking || 0), 0);

    const handleAddTeamMember = (profileId: string) => {
        if (!profileId) return;

        // Prevent duplicates
        if (team.find(m => m.profileId === profileId)) return;

        const devProfile = profiles.find(p => p.id === profileId);
        if (devProfile) {
            // Default developer working days to the calculated working days of the sprint
            setTeam([...team, { profileId: devProfile.id, daysWorking: calculatedWorkingDays || 13 }]);
        }
    };

    const handleRemoveTeamMember = (profileId: string) => {
        setTeam(team.filter(m => m.profileId !== profileId));
    };

    const handleUpdateDays = (profileId: string, daysWorking: number) => {
        setTeam(team.map(m => m.profileId === profileId ? { ...m, daysWorking } : m));
    };

    const getEndDayName = () => {
        if (!endDate) return '';
        const date = new Date(endDate);
        if (isNaN(date.getTime())) return '';
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[date.getDay()];
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        if (val < 1) return;

        setSprintDurationDays(val);

        if (startDate) {
            const date = new Date(startDate);
            const endDateObj = new Date(date);
            endDateObj.setDate(date.getDate() + (val - 1));
            const calculatedEnd = endDateObj.toISOString().split('T')[0];
            setEndDate(calculatedEnd);

            const workingDays = countWorkingDays(startDate, calculatedEnd);
            const oldWorkingDays = calculatedWorkingDays;
            setCalculatedWorkingDays(workingDays);

            // Update default capacities for already added team members if their capacity matched the old calculated working days count
            setTeam(prevTeam => prevTeam.map(member => {
                if (member.daysWorking === oldWorkingDays || member.daysWorking === 0) {
                    return { ...member, daysWorking: workingDays };
                }
                return member;
            }));
        }
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        setDateError('');

        if (newStartDate) {
            const date = new Date(newStartDate);

            // Calculate End Date
            const endDateObj = new Date(date);
            endDateObj.setDate(date.getDate() + (sprintDurationDays - 1));
            const calculatedEnd = endDateObj.toISOString().split('T')[0];
            setEndDate(calculatedEnd);

            const workingDays = countWorkingDays(newStartDate, calculatedEnd);
            const oldWorkingDays = calculatedWorkingDays;
            setCalculatedWorkingDays(workingDays);

            // Update capacities for team members
            setTeam(prevTeam => prevTeam.map(member => {
                if (member.daysWorking === oldWorkingDays || member.daysWorking === 0) {
                    return { ...member, daysWorking: workingDays };
                }
                return member;
            }));
        } else {
            setEndDate('');
            setCalculatedWorkingDays(0);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (dateError) return;

        onSave({
            id: sprint ? sprint.id : `SPRINT-${Date.now()}`,
            name,
            goal,
            startDate,
            endDate,
            capacity: totalCapacity > 0 ? totalCapacity : 1, // Fallback to 1 if empty
            status,
            team
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {sprint ? 'Edit Sprint' : 'Create New Sprint'}
                            </h3>
                            <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sprint Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sprint Goal <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={3}
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    placeholder="e.g. Finalize Situm SDK integration"
                                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sprint Duration (Calendar Days)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="90"
                                    required
                                    value={sprintDurationDays}
                                    onChange={handleDurationChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="e.g. 15"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={startDate}
                                        onChange={handleStartDateChange}
                                        className={`mt-1 block w-full border rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500 ${dateError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
                                    />
                                    {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 font-semibold">
                                        End Date {getEndDayName() ? `(${getEndDayName()})` : ''}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        readOnly
                                        value={endDate}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400 mt-1 font-medium">
                                        {startDate 
                                            ? `Auto-calculated (${sprintDurationDays} calendar days, ${calculatedWorkingDays} working days)` 
                                            : `Auto-calculated (${sprintDurationDays} calendar days)`
                                        }
                                    </p>
                                </div>
                            </div>

                            {/* Team Selection & Capacity Calculation */}
                            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                        <Users className="w-4 h-4 mr-2 text-violet-500" />
                                        Sprint Team & Capacity
                                    </h4>
                                    <span className="bg-violet-100 text-violet-800 text-xs font-bold px-2.5 py-1 rounded">
                                        Total: {totalCapacity > 0 ? formatHoursToTime(totalCapacity * 8) : '0h'}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {team.map(member => {
                                        const profile = profiles.find(p => p.id === member.profileId);
                                        return (
                                        <div key={member.profileId} className="flex items-center space-x-3 bg-white p-2 rounded border border-gray-200 shadow-md">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{profile ? (profile.full_name || profile.email) : 'Unknown User'}</p>
                                                <p className="text-xs text-gray-500">{profile?.role || 'Developer'}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-xs text-gray-500">Days:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="30"
                                                    value={member.daysWorking}
                                                    onChange={(e) => handleUpdateDays(member.profileId, Number(e.target.value))}
                                                    className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-violet-500 focus:border-violet-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTeamMember(member.profileId)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )})}

                                    {team.length === 0 && (
                                        <p className="text-xs text-gray-500 italic text-center py-2">No team members assigned</p>
                                    )}

                                    {/* Select Box to add member */}
                                    <div className="mt-2 flex">
                                        <select
                                            className="flex-1 text-sm border-gray-300 rounded-l-md shadow-md focus:ring-violet-500 focus:border-violet-500 py-1.5 px-2 bg-white"
                                            onChange={(e) => {
                                                handleAddTeamMember(e.target.value);
                                                e.target.value = ''; // Reset select
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Add team member...</option>
                                            {profiles.filter(p => !team.find(t => t.profileId === p.id)).map(p => (
                                                <option key={p.id} value={p.id}>{p.full_name || p.email} ({p.role})</option>
                                            ))}
                                        </select>
                                        <div className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-md px-3 py-1.5 flex items-center justify-center">
                                            <Plus className="w-4 h-4 text-gray-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as Sprint['status'])}
                                    className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 focus:ring-violet-500 focus:border-violet-500"
                                >
                                    <option value="Planned">Planned</option>
                                    <option value="Active">Active</option>
                                    <option value="Completed">Completed</option>
                                </select>
                            </div>

                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="submit"
                                    className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-md px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:col-start-2 sm:text-sm"
                                >
                                    {sprint ? 'Save Changes' : 'Create Sprint'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-md px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

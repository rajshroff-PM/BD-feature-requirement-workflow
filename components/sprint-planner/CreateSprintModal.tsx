import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Trash2 } from 'lucide-react';
import { Sprint, DevTeamMember, SprintTeamMember } from '../../types';

interface CreateSprintModalProps {
    sprint?: Sprint;
    devTeam?: DevTeamMember[];
    onClose: () => void;
    onSave: (sprint: Sprint) => void;
    nextSprintNumber: number;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({ sprint, devTeam = [], onClose, onSave, nextSprintNumber }) => {
    const [name, setName] = useState(`Sprint ${nextSprintNumber}`);
    const [goal, setGoal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [team, setTeam] = useState<SprintTeamMember[]>([]);
    const [status, setStatus] = useState<Sprint['status']>('Planned');
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        if (sprint) {
            setName(sprint.name);
            setGoal(sprint.goal || '');
            setStartDate(sprint.startDate);
            setEndDate(sprint.endDate);
            setTeam(sprint.team || []);
            setStatus(sprint.status);
        }
    }, [sprint]);

    // Auto-calculate capacity based on team days
    const totalCapacity = team.reduce((sum, member) => sum + (member.daysWorking || 0), 0);

    const handleAddTeamMember = (memberId: string) => {
        if (!memberId) return;

        // Prevent duplicates
        if (team.find(m => m.id === memberId)) return;

        const devMember = devTeam.find(m => m.id === memberId);
        if (devMember) {
            setTeam([...team, { ...devMember, daysWorking: 5 }]); // default 5 days
        }
    };

    const handleRemoveTeamMember = (id: string) => {
        setTeam(team.filter(m => m.id !== id));
    };

    const handleUpdateDays = (id: string, daysWorking: number) => {
        setTeam(team.map(m => m.id === id ? { ...m, daysWorking } : m));
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setStartDate(newStartDate);
        setDateError('');

        if (newStartDate) {
            const date = new Date(newStartDate);
            const day = date.getDay(); // 0 = Sun, 1 = Mon, ...

            if (day !== 1) { // 1 is Monday
                setDateError('Sprints must start on a Monday.');
                // We still allow them to select it but show error, 
                // OR we could strictly enforce it. 
                // For better UX during selection, we calculate the end date anyway based on 6 days duration
                // But let's enforce the "Monday" rule for the "Ending on Saturday" logic to hold true.
            }

            // Calculate End Date (Start + 5 days = 6 days total, Mon->Sat)
            const endDateObj = new Date(date);
            endDateObj.setDate(date.getDate() + 5);
            setEndDate(endDateObj.toISOString().split('T')[0]);
        } else {
            setEndDate('');
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date (Mon)</label>
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
                                    <label className="block text-sm font-medium text-gray-700">End Date (Sat)</label>
                                    <input
                                        type="date"
                                        required
                                        readOnly
                                        value={endDate}
                                        className="mt-1 block w-full border border-gray-300 rounded-xl shadow-md p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Auto-calculated (6 days)</p>
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
                                        Total: {totalCapacity} Days
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {team.map(member => (
                                        <div key={member.id} className="flex items-center space-x-3 bg-white p-2 rounded border border-gray-200 shadow-md">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                                                <p className="text-xs text-gray-500">{member.role || 'Developer'}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-xs text-gray-500">Days:</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="30"
                                                    value={member.daysWorking}
                                                    onChange={(e) => handleUpdateDays(member.id, Number(e.target.value))}
                                                    className="w-16 p-1 text-sm border border-gray-300 rounded focus:ring-violet-500 focus:border-violet-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTeamMember(member.id)}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

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
                                            {devTeam.filter(d => !team.find(t => t.id === d.id)).map(d => (
                                                <option key={d.id} value={d.id}>{d.name} ({d.role})</option>
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

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Sprint } from '../../types';

interface CreateSprintModalProps {
    sprint?: Sprint;
    onClose: () => void;
    onSave: (sprint: Sprint) => void;
    nextSprintNumber: number;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({ sprint, onClose, onSave, nextSprintNumber }) => {
    const [name, setName] = useState(`Sprint ${nextSprintNumber}`);
    const [goal, setGoal] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [capacity, setCapacity] = useState(20);
    const [status, setStatus] = useState<Sprint['status']>('Planned');
    const [dateError, setDateError] = useState('');

    useEffect(() => {
        if (sprint) {
            setName(sprint.name);
            setGoal(sprint.goal);
            setStartDate(sprint.startDate);
            setEndDate(sprint.endDate);
            setCapacity(sprint.capacity);
            setStatus(sprint.status);
        }
    }, [sprint]);

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
            capacity,
            status
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
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
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                                        className={`mt-1 block w-full border rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 ${dateError ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}`}
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
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Auto-calculated (6 days)</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Total Capacity (Man-Days)</label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    value={capacity}
                                    onChange={(e) => setCapacity(Number(e.target.value))}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">e.g. 2 Devs x 10 Days = 20 Man-Days</p>
                            </div>

                            {sprint && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as Sprint['status'])}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Planned">Planned</option>
                                        <option value="Active">Active</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            )}

                            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                                <button
                                    type="submit"
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                                >
                                    {sprint ? 'Save Changes' : 'Create Sprint'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
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

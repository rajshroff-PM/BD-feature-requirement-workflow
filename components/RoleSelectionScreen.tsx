import React, { useState } from 'react';
import { Loader2, User as UserIcon } from 'lucide-react';

interface RoleSelectionScreenProps {
    user: any;
    onSave: (role: string, name: string) => void;
    isLoading: boolean;
}

export const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ user, onSave, isLoading }) => {
    const [role, setRole] = useState('BD');
    const [name, setName] = useState(user?.user_metadata?.full_name || '');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto h-12 w-12 bg-violet-600 rounded-xl flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-white" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Complete your profile
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Tell us about your role in the team
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-md focus:ring-violet-500 focus:border-violet-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm rounded-xl"
                            >
                                <option value="BD">BD (Business Development)</option>
                                <option value="PO">PO (Product Owner)</option>
                                <option value="BA">BA (Business Analyst)</option>
                                <option value="PM">PM (Product Manager)</option>
                                <option value="DEV">Dev (Developer)</option>
                                <option value="DEV_LEAD">Dev Team Lead</option>
                            </select>
                        </div>
                        <button
                            onClick={() => onSave(role, name)}
                            disabled={isLoading || !name.trim()}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

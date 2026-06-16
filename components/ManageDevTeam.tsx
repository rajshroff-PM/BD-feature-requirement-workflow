import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Profile } from '../types';
import { supabase } from '../supabaseClient';
import { getInitials } from '../lib/utils';

interface ManageDevTeamProps {
    onClose: () => void;
}

export const ManageDevTeam: React.FC<ManageDevTeamProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const [team, setTeam] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .in('role', ['DEV', 'DEV_LEAD', 'QA'])
                .order('full_name', { ascending: true });
            if (error) throw error;
            setTeam(data || []);
        } catch (err) {
            console.error('Error fetching dev team profiles:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-sm font-medium text-gray-500 hover:text-violet-600 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Users className="w-8 h-8 text-violet-600 mr-2" />
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">View Dev Team</h1>
                            <p className="text-gray-500 mt-1">Onboarded users with DEV or QA roles available for sprints</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="min-h-[400px] mt-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                            <p className="mt-4 text-gray-500">Loading team members...</p>
                        </div>
                    ) : team.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No developers onboarded</h3>
                            <p className="mt-1 text-gray-500 max-w-sm mx-auto">Users who sign up and are assigned the DEV or QA role will automatically appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {team.map((member) => (
                                <div key={member.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-shadow group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center space-x-3">
                                            {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.full_name || 'User'} className="h-10 w-10 rounded-full border border-gray-200 object-cover flex-shrink-0" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center border border-violet-200 flex-shrink-0">
                                                    <span className="text-violet-700 font-bold text-lg">{getInitials(member.full_name || 'Unknown')}</span>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-gray-900 line-clamp-1">{member.full_name || member.email}</h4>
                                                <span className="text-sm text-gray-500 font-medium">{member.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

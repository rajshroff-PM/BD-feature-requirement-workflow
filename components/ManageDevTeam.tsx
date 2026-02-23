import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Pencil, X, Save, ShieldAlert, Loader2 } from 'lucide-react';
import { DevTeamMember } from '../types';
import { supabase } from '../supabaseClient';
import { Badge } from './Badge';

interface ManageDevTeamProps {
    onClose: () => void;
}

export const ManageDevTeam: React.FC<ManageDevTeamProps> = ({ onClose }) => {
    const [team, setTeam] = useState<DevTeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Add/Edit State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<DevTeamMember | null>(null);
    const [formData, setFormData] = useState({ name: '', role: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('dev_team').select('*').order('name', { ascending: true });
            if (error) throw error;
            setTeam(data || []);
        } catch (err) {
            console.error('Error fetching dev team:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (member?: DevTeamMember) => {
        setError('');
        if (member) {
            setEditingMember(member);
            setFormData({ name: member.name, role: member.role || '' });
        } else {
            setEditingMember(null);
            setFormData({ name: '', role: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            if (editingMember) {
                const { error: updateError } = await supabase
                    .from('dev_team')
                    .update({ name: formData.name, role: formData.role })
                    .eq('id', editingMember.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('dev_team')
                    .insert([{ name: formData.name, role: formData.role }]);
                if (insertError) throw insertError;
            }
            await fetchTeam();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Error saving team member:', err);
            setError(err.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove ${name} from the dev team?`)) {
            return;
        }

        try {
            const { error } = await supabase.from('dev_team').delete().eq('id', id);
            if (error) throw error;
            setTeam(prev => prev.filter(m => m.id !== id));
        } catch (err) {
            console.error('Error deleting team member:', err);
            alert('Failed to delete member');
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

                <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 rounded-xl shadow-2xl">

                    {/* Header */}
                    <div className="bg-white px-6 py-4 border-b flex justify-between items-center shadow-md">
                        <div className="flex items-center space-x-3">
                            <div className="bg-violet-100 p-2 rounded-2xl">
                                <Users className="h-6 w-6 text-violet-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Manage Dev Team</h3>
                                <p className="text-sm text-gray-500">Configure team members to allocate them in sprints</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-2xl shadow-md transition-all"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Member</span>
                            </button>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 py-8 min-h-[400px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                                <p className="mt-4 text-gray-500">Loading team members...</p>
                            </div>
                        ) : team.length === 0 ? (
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No team members</h3>
                                <p className="mt-1 text-gray-500 max-w-sm mx-auto">Add developers here so PMs can assign them to sprints and track capacity.</p>
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-md text-white bg-violet-600 hover:bg-violet-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add First Member
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {team.map((member) => (
                                    <div key={member.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-shadow group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center border border-violet-200 flex-shrink-0">
                                                    <span className="text-violet-700 font-bold text-lg">{member.name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 line-clamp-1">{member.name}</h4>
                                                    {member.role ? (
                                                        <span className="text-sm text-gray-500 font-medium">{member.role}</span>
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">No role specified</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                                                <button onClick={() => handleOpenModal(member)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-colors" title="Edit">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(member.id, member.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Remove">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Sub-Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => !isSaving && setIsModalOpen(false)}></div>

                        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-xl shadow-xl">
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-gray-900">{editingMember ? 'Edit Team Member' : 'Add Team Member'}</h3>
                                <button onClick={() => !isSaving && setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="px-6 py-5 space-y-4">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Developer Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Jane Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-md focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                                        disabled={isSaving}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role / Title (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Backend Developer"
                                        value={formData.role}
                                        onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl shadow-md focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
                                        disabled={isSaving}
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 border-t border-gray-100">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 border border-gray-300 rounded-xl shadow-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving || !formData.name.trim()}
                                    className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {isSaving ? 'Saving...' : 'Save Member'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

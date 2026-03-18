import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, ShieldAlert, Loader2, Plus, Mail, Shield } from 'lucide-react';

interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    created_at?: string;
}

export const AdminDashboard: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // New User Form State
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('PO');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            alert('Failed to fetch users: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;
        } catch (err: any) {
            console.error('Role update failed', err);
            alert('Failed to update role');
            fetchUsers(); // Revert on failure
        }
    };

    const handleOnboardUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Directly insert into pending_invitations — no Edge Function needed
            const { error } = await supabase
                .from('pending_invitations')
                .insert({
                    email: newEmail.trim().toLowerCase(),
                    full_name: newName.trim(),
                    role: newRole
                });

            if (error) {
                // Handle duplicate email
                if (error.code === '23505') {
                    // Already exists — update their role instead
                    const { error: updateError } = await supabase
                        .from('pending_invitations')
                        .update({ full_name: newName.trim(), role: newRole })
                        .eq('email', newEmail.trim().toLowerCase());

                    if (updateError) throw new Error(updateError.message);
                } else {
                    throw new Error(error.message);
                }
            }

            // Also update their profile directly if they already exist in the system
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', newEmail.trim().toLowerCase())
                .maybeSingle();

            if (existingProfile) {
                await supabase
                    .from('profiles')
                    .update({ role: newRole, full_name: newName.trim() })
                    .eq('id', existingProfile.id);
            }

            alert(`✅ User "${newName}" (${newEmail}) has been onboarded as ${newRole}.\n\nThey can now go to the app and sign in with Google using this email.`);
            setModalOpen(false);
            setNewEmail('');
            setNewName('');
            setNewRole('PO');
            fetchUsers();
        } catch (err: any) {
            console.error('Onboarding failed:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const roleOptions = ['SUPER_ADMIN', 'BD', 'PO', 'BA', 'PM', 'DEV', 'DEV_LEAD'];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center px-4 sm:px-0 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <ShieldAlert className="w-6 h-6 mr-2 text-violet-600" />
                        Admin Dashboard
                    </h1>
                    <p className="mt-1 flex items-center text-sm text-gray-500">
                        Securely onboard users and manage role-based access control.
                    </p>
                </div>
                <div>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Onboard New User
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-2xl overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Role</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">
                                                    {u.full_name ? u.full_name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{u.full_name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 flex items-center">
                                            <Mail className="w-4 h-4 mr-1 text-gray-400" />
                                            {u.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            className={`text-sm rounded-lg border-gray-300 py-1.5 pl-3 pr-8 focus:ring-violet-500 focus:border-violet-500 ${u.role === 'SUPER_ADMIN' ? 'bg-amber-50 text-amber-900 font-medium border-amber-200' : 'bg-white'
                                                }`}
                                        >
                                            {roleOptions.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                            <Shield className="w-5 h-5 mr-2 text-violet-600" />
                            Invite User
                        </h3>
                        <form onSubmit={handleOnboardUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-violet-500 focus:border-violet-500 text-sm"
                                    placeholder="name@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-violet-500 focus:border-violet-500 text-sm"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Initial Role</label>
                                <select
                                    value={newRole}
                                    onChange={e => setNewRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-violet-500 focus:border-violet-500 text-sm"
                                >
                                    {roleOptions.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Send Invite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { RolePermissions, Role } from '../types';
import { Loader2, ShieldAlert, Check } from 'lucide-react';

interface AccessManagementProps {
    currentUser: any;
}

const ROLES: Role[] = ['SUPER_ADMIN', 'PM', 'MANAGEMENT', 'DEV_LEAD', 'DEV', 'QA', 'BA', 'BD'];

const PERMISSIONS = [
    {
        group: 'Module Access',
        items: [
            { key: 'view_sprint_planner', label: 'View Sprint Planner' },
            { key: 'view_capacity_tracker', label: 'View Capacity Tracker' },
            { key: 'view_analytics', label: 'View Analytics' },
            { key: 'view_products', label: 'View Products Portfolio' },
            { key: 'view_team', label: 'View Manage Dev Team' },
            { key: 'view_admin_dashboard', label: 'View Admin Dashboard' },
            { key: 'view_access_management', label: 'View Access Management' },
        ]
    },
    {
        group: 'Sprint Management',
        items: [
            { key: 'create_sprints', label: 'Create Sprints' },
            { key: 'edit_sprints', label: 'Edit Sprints' },
            { key: 'delete_sprints', label: 'Delete Sprints' },
        ]
    },
    {
        group: 'Ticket Management',
        items: [
            { key: 'create_tickets', label: 'Create Tickets' },
            { key: 'file_bugs', label: 'File Bugs' },
            { key: 'edit_tickets', label: 'Edit Tickets' },
            { key: 'delete_tickets', label: 'Delete Tickets' },
        ]
    }
];

export const AccessManagement: React.FC<AccessManagementProps> = ({ currentUser }) => {
    const [permissions, setPermissions] = useState<RolePermissions[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveIndicator, setSaveIndicator] = useState<string | null>(null);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*');
            if (error) throw error;
            setPermissions(data || []);
        } catch (err) {
            console.error('Error fetching role permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (role: Role, key: keyof RolePermissions, currentValue: boolean) => {
        if (!currentUser || !['PM', 'SUPER_ADMIN'].includes(currentUser.role)) {
            alert('You do not have permission to modify roles.');
            return;
        }

        // Optimistic update
        setPermissions(prev => prev.map(p => p.role === role ? { ...p, [key]: !currentValue } : p));
        setSaveIndicator(`${role}-${key}`);

        try {
            const { error } = await supabase
                .from('role_permissions')
                .update({ [key]: !currentValue })
                .eq('role', role);

            if (error) throw error;
            
            setTimeout(() => setSaveIndicator(null), 1000);
        } catch (err) {
            console.error('Error updating permission:', err);
            alert('Failed to update permission');
            fetchPermissions(); // Revert
            setSaveIndicator(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (!currentUser || !['PM', 'SUPER_ADMIN'].includes(currentUser.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
                <p className="text-gray-500 mt-2">You do not have permission to view or manage the access matrix.</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Role Access Management</h1>
                <p className="text-gray-500 mt-1">Configure what each role can see and do within the application.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 w-64 shadow-[1px_0_0_0_#e5e7eb]">
                                    Permission
                                </th>
                                {ROLES.map(role => (
                                    <th key={role} className="px-4 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px]">
                                        {role.replace('_', ' ')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {PERMISSIONS.map((group, gIdx) => (
                                <React.Fragment key={group.group}>
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={ROLES.length + 1} className="px-6 py-3 text-sm font-semibold text-gray-900 bg-gray-100/50">
                                            {group.group}
                                        </td>
                                    </tr>
                                    {group.items.map((item, iIdx) => (
                                        <tr key={item.key} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-700 sticky left-0 bg-white group-hover:bg-gray-50 shadow-[1px_0_0_0_#e5e7eb] z-10 transition-colors">
                                                {item.label}
                                            </td>
                                            {ROLES.map(role => {
                                                const rolePerm = permissions.find(p => p.role === role);
                                                const hasPerm = rolePerm ? (rolePerm[item.key as keyof RolePermissions] as boolean) : false;
                                                const isSaving = saveIndicator === `${role}-${item.key}`;

                                                return (
                                                    <td key={`${role}-${item.key}`} className="px-4 py-4 text-center">
                                                        <div className="flex items-center justify-center h-full">
                                                            <label className="relative inline-flex items-center cursor-pointer group">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="sr-only peer"
                                                                    checked={hasPerm}
                                                                    onChange={() => handleToggle(role, item.key as keyof RolePermissions, hasPerm)}
                                                                />
                                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                                                                {isSaving && (
                                                                    <div className="absolute -right-5">
                                                                        <Check className="w-3.5 h-3.5 text-green-500 animate-in fade-in" />
                                                                    </div>
                                                                )}
                                                            </label>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

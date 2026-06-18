'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useGlobal } from './providers';
import { LoginScreen } from '../components/LoginScreen';
import { RoleSelectionScreen } from '../components/RoleSelectionScreen';
import {
  FileSpreadsheet,
  Search,
  User as UserIcon,
  LogOut,
  Loader2,
  Package,
  Shield
} from 'lucide-react';
import { getInitials } from '../lib/utils';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { 
    user, sessionUser, loading, needsRoleSelection, 
    tickets, sprints, tasks, profiles,
    handleLogout 
  } = useGlobal();

  const pathname = usePathname();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (needsRoleSelection && sessionUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="mx-auto h-14 w-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Not Authorized</h2>
          <p className="text-gray-500 text-sm mb-1">
            Your account (<span className="font-medium text-gray-700">{sessionUser.email}</span>) has not been onboarded yet.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Please contact your <span className="font-semibold text-violet-600">PM or Super Admin</span> to get access.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const searchResults = {
    tickets: searchTerm ? tickets.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase())) : [],
    sprints: searchTerm ? sprints.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())) : [],
    tasks: searchTerm ? tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())) : [],
    team: searchTerm ? profiles.filter(p => (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) || p.email?.toLowerCase().includes(searchTerm.toLowerCase())) : []
  };

  const hasSearchResults = 
    searchResults.tickets.length > 0 ||
    searchResults.sprints.length > 0 ||
    searchResults.tasks.length > 0 ||
    searchResults.team.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <Link
            href="/"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none shrink-0"
          >
            <div className="bg-violet-600 p-2 rounded-2xl flex-shrink-0 shadow-sm">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden lg:block">Paathner Triage Matrix</h1>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1 bg-gray-100/80 p-1 rounded-2xl">
            <Link
              href="/current"
              className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                ['/', '/current', '/roadmap', '/backlog', '/upcoming', '/past'].includes(pathname) || pathname.startsWith('/sprint/') ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              Sprint Planner
            </Link>
            {user?.permissions?.view_capacity_tracker && (
              <Link
                href="/capacity"
                className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                  pathname === '/capacity' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                Capacity Tracker
              </Link>
            )}
            {user?.permissions?.view_analytics && (
              <Link
                href="/analytics"
                className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                  pathname === '/analytics' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                Analytics
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4 shrink-0">
            <div className="relative hidden sm:block">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                 <input
                   type="text"
                   placeholder="Search anything..."
                   className="pl-9 pr-4 py-1.5 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-full text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none w-56 lg:w-64 transition-all"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   onFocus={() => setIsSearchFocused(true)}
                   onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                 />
               </div>
               
               {isSearchFocused && searchTerm.trim() !== '' && (
                 <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl py-2 z-50 border border-gray-100 max-h-[80vh] overflow-y-auto">
                   {!hasSearchResults ? (
                     <div className="px-4 py-3 text-sm text-gray-500 text-center">No results found for "{searchTerm}"</div>
                   ) : (
                      <>
                        {searchResults.tickets.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tickets</div>
                            {searchResults.tickets.slice(0, 5).map(ticket => (
                              <Link
                                href={`/backlog?ticket=${ticket.id}`}
                                key={ticket.id}
                                className="block w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors"
                              >
                                <div className="text-xs text-gray-400 font-mono">{ticket.id}</div>
                                <div className="text-sm font-medium text-gray-900 truncate">{ticket.title}</div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults.sprints.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sprints</div>
                            {searchResults.sprints.slice(0, 5).map(sprint => (
                              <Link
                                href={`/sprint/${sprint.id}`}
                                key={sprint.id}
                                className="block w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors"
                              >
                                <div className="text-sm font-medium text-gray-900 truncate flex items-center justify-between">
                                  {sprint.name}
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${sprint.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {sprint.status}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults.tasks.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</div>
                            {searchResults.tasks.slice(0, 5).map(task => (
                              <Link
                                href={task.sprintId ? `/sprint/${task.sprintId}?ticket=${task.id}` : `/backlog?ticket=${task.id}`}
                                key={task.id}
                                className="block w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors"
                              >
                                <div className="text-xs text-gray-400 truncate">
                                    {(task.assignees || []).length > 0
                                        ? (task.assignees || []).map(id => profiles.find(p => p.id === id)?.full_name || profiles.find(p => p.id === id)?.email || 'Unknown').join(', ')
                                        : 'Unassigned'}
                                </div>
                                <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults.team.length > 0 && (
                          <div>
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Team Members</div>
                            {searchResults.team.slice(0, 5).map(member => (
                              <Link
                                href="/team"
                                key={member.id}
                                className="block w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors flex justify-between items-center"
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">{member.full_name || member.email}</div>
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{member.role}</div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                   )}
                 </div>
               )}
            </div>

            <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-100/80 text-violet-700 font-bold hover:bg-violet-200 hover:shadow-sm transition-all focus:outline-none ring-2 ring-transparent focus:ring-violet-500/30"
              >
                {user.name ? getInitials(user.name) : <UserIcon className="w-4 h-4" />}
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl py-2 z-20 border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 mb-1 bg-gray-50/50">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{user.role}</p>
                    </div>
                    {user?.permissions?.view_products && (
                      <Link
                        href="/products"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors"
                      >
                        <Package className="w-4 h-4 mr-3 text-gray-400" />
                        Products Portfolio
                      </Link>
                    )}
                    {user?.permissions?.view_team && (
                      <Link
                        href="/team"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors"
                      >
                        <UserIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Manage Dev Team
                      </Link>
                    )}
                    {user?.permissions?.view_admin_dashboard && (
                      <Link
                        href="/admin"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors border-t border-gray-50 mt-1"
                      >
                        <Shield className="w-4 h-4 mr-3 text-gray-400" />
                        Admin Panel
                      </Link>
                    )}
                    {user?.permissions?.view_access_management && (
                      <Link
                        href="/access"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors border-t border-gray-50 mt-1"
                      >
                        <Shield className="w-4 h-4 mr-3 text-gray-400" />
                        Access Management
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4 mr-3 text-red-400" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

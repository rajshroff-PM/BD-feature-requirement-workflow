import React, { useState, useEffect } from 'react';
import {
  Plus,
  FileSpreadsheet,
  ChevronRight,
  AlertCircle,
  X,
  Save,
  Download,
  Search,
  CheckCircle2,
  Clock,
  User as UserIcon,
  LogOut,
  Loader2
} from 'lucide-react';
import { Badge } from './components/Badge';
import { LoginScreen } from './components/LoginScreen';
import { Ticket, BadgeColor, User as UserType, Sprint, Task } from './types';
import { SprintPlanner } from './components/sprint-planner/SprintPlanner';
import { supabase } from './supabaseClient';

// Initial state for a new ticket
const initialTicketState: Ticket = {
  id: '',
  requestType: 'New',
  title: '',
  source: '',
  problem: '',
  severity: 'Medium',
  value: '',
  requestedDate: '',

  baStatus: 'Pending',
  pmStatus: 'Pending',
  devStatus: 'Pending',

  // PM Defaults
  productAlignment: '',
  techImpactBackend: undefined,
  techImpactMobile: undefined,
  situmDependency: undefined,
  effort: undefined,
  riskLevel: undefined,
  sprintCycle: ''
};

export default function FeatureTriageApp() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Ticket>(initialTicketState);
  const [activeTab, setActiveTab] = useState(0);

  const [isSaving, setIsSaving] = useState(false);

  // New State for Sprint Planner
  const [currentView, setCurrentView] = useState<'triage' | 'sprint-planner'>('triage');
  const [sprints, setSprints] = useState<Sprint[]>([
    {
      id: 'SPRINT-23',
      name: 'Sprint 23',
      goal: 'Backend optimization and bug fixes.',
      startDate: '2024-10-01',
      endDate: '2024-10-14',
      capacity: 20,
      status: 'Completed'
    },
    {
      id: 'SPRINT-24',
      name: 'Sprint 24',
      goal: 'Feature: One-Click Checkout & UI Revamp',
      startDate: '2024-10-15',
      endDate: '2024-10-29',
      capacity: 25,
      status: 'Active'
    },
    {
      id: 'SPRINT-25',
      name: 'Sprint 25',
      goal: 'Holiday Season Prep & Load Testing',
      startDate: '2024-10-30',
      endDate: '2024-11-12',
      capacity: 20,
      status: 'Planned'
    }
  ]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // 1. Auth & Profile Handling
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchProfile(session.user.id);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setUser({ name: data.full_name, role: data.role });
        fetchTickets();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Data Fetching
  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map DB fields to TS Interface (snake_case to camelCase mapping needed if strictly typed, 
      // but for now we rely on the DB columns matching or simple mapping)
      // Note: Our DB columns are snake_case, frontend is camelCase.
      // We need a mapper.
      const mappedTickets: Ticket[] = (data || []).map(t => ({
        id: t.id,
        requestType: t.request_type,
        title: t.title,
        source: t.source,
        problem: t.problem,
        severity: t.severity,
        value: t.value || '',
        requestedDate: t.requested_date,

        baStatus: t.ba_status,
        srsLink: t.srs_link,
        analysis: t.analysis,

        pmStatus: t.pm_status,
        productAlignment: t.product_alignment,
        techImpactBackend: t.tech_impact_backend,
        techImpactMobile: t.tech_impact_mobile,
        situmDependency: t.situm_dependency,
        effort: t.effort,
        riskLevel: t.risk_level,
        sprintCycle: t.sprint_cycle,

        devStatus: t.dev_status,
        deliveryDate: t.delivery_date,
        devComments: t.dev_comments
      }));

      setTickets(mappedTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const openNewTicket = () => {
    // Generate ID logic could be backend side, but for now:
    const newId = `REQ-${String(tickets.length + 1).padStart(3, '0')}`;
    setFormData({ ...initialTicketState, id: newId });
    setCurrentTicket(null);
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const openEditTicket = (ticket: Ticket) => {
    setFormData({ ...ticket });
    setCurrentTicket(ticket);

    // Default tab based on status
    if (ticket.devStatus !== 'Pending') setActiveTab(3);
    else if (ticket.pmStatus !== 'Pending') setActiveTab(2);
    else if (ticket.baStatus !== 'Pending') setActiveTab(1);
    else setActiveTab(0);

    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveTicket = async () => {
    setIsSaving(true);
    try {
      // Map camelCase to snake_case for DB
      const dbPayload = {
        id: formData.id,
        updated_at: new Date().toISOString(),

        title: formData.title,
        request_type: formData.requestType,
        source: formData.source,
        problem: formData.problem,
        severity: formData.severity,
        value: formData.value,
        requested_date: formData.requestedDate || null, // Handle empty strings for dates

        ba_status: formData.baStatus,
        srs_link: formData.srsLink,
        analysis: formData.analysis,

        pm_status: formData.pmStatus,
        product_alignment: formData.productAlignment,
        tech_impact_backend: formData.techImpactBackend,
        tech_impact_mobile: formData.techImpactMobile,
        situm_dependency: formData.situmDependency,
        effort: formData.effort,
        risk_level: formData.riskLevel,
        sprint_cycle: formData.sprintCycle,

        dev_status: formData.devStatus,
        delivery_date: formData.deliveryDate || null,
        dev_comments: formData.devComments
      };

      const { error } = await supabase
        .from('tickets')
        .upsert(dbPayload);

      if (error) throw error;

      await fetchTickets(); // Refresh data

      // AUTO-CREATE TASK IF SPRINT IS ASSIGNED
      if (formData.sprintCycle && formData.pmStatus === 'Approved') {
        // Check if task already exists for this ticket to avoid duplicates
        const existingTask = tasks.find(t => t.ticketId === formData.id && t.sprintId === formData.sprintCycle);

        if (!existingTask) {
          const selectedSprint = sprints.find(s => s.id === formData.sprintCycle);
          if (selectedSprint) {
            // Map T-Shirt size to days
            let days = 1;
            switch (formData.effort) {
              case 'S': days = 1; break;
              case 'M': days = 3; break;
              case 'L': days = 5; break;
              case 'XL': days = 10; break;
              default: days = 1;
            }

            // Calculate end date based on weekdays? For now simple addition
            const startDate = new Date(selectedSprint.startDate);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + days);

            const newTask: Task = {
              id: `TASK-${Date.now()}`,
              sprintId: selectedSprint.id,
              ticketId: formData.id,
              title: formData.title,
              assignee: 'Unassigned', // PM can assign later in Sprint Planner
              status: 'To Do',
              startDate: selectedSprint.startDate,
              endDate: endDate.toISOString().split('T')[0],
              effort: days
            };

            setTasks(prev => [...prev, newTask]);
            // console.log("Auto-created task:", newTask);
          }
        }
      }

      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving ticket:', error);
      alert('Failed to save ticket: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "ID", "Title", "Source", "Problem", "Value",
      "BA Status", "SRS Link", "Analysis",
      "PM Status", "Product Alignment", "Backend Impact", "Mobile Impact", "Situm Dep", "Effort", "Risk", "Sprint",
      "Dev Status", "Delivery Date", "Comments"
    ];

    const rows = tickets.map(t => [
      t.id, t.title, t.source, t.problem, t.value,
      t.baStatus, t.srsLink, t.analysis,
      t.pmStatus, t.productAlignment, t.techImpactBackend, t.techImpactMobile, t.situmDependency, t.effort, t.riskLevel, t.sprintCycle,
      t.devStatus, t.deliveryDate, t.devComments
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "feature_matrix.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string): BadgeColor => {
    if (status === 'Approved' || status === 'Analysis Complete' || status === 'Scheduled' || status === 'Done') return 'green';
    if (status === 'Rejected') return 'red';
    if (status === 'Pending') return 'yellow';
    if (status === 'In Progress') return 'blue';
    return 'gray';
  };

  const filteredTickets = tickets.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Permission Logic
  const canEdit = (tabIndex: number): boolean => {
    if (!user) return false;
    if (user.role === 'BD' && tabIndex === 0) return true;
    if (user.role === 'BA' && tabIndex === 1) return true;
    if (user.role === 'PM' && tabIndex === 2) return true;
    if (user.role === 'DEV' && tabIndex === 3) return true;
    return false;
  };

  // Helper to render input/textarea/select with readOnly enforcement
  const renderInput = (
    type: 'text' | 'date' | 'textarea' | 'select',
    name: keyof Ticket,
    label: string,
    options?: string[],
    rows: number = 2,
    placeholder?: string
  ) => {
    const isEditable = canEdit(activeTab);
    const commonClasses = `w-full mt-1 p-2 border rounded-md ${!isEditable ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`;

    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase">{label}</label>
        {type === 'textarea' ? (
          <textarea
            name={name}
            value={String(formData[name] || '')}
            onChange={handleInputChange}
            rows={rows}
            className={commonClasses}
            disabled={!isEditable}
            placeholder={isEditable ? placeholder : ''}
          />
        ) : type === 'select' ? (
          <select
            name={name}
            value={String(formData[name] || '')}
            onChange={handleInputChange}
            className={`${commonClasses} font-medium`}
            disabled={!isEditable}
          >
            <option value="" disabled>{placeholder || 'Select an option'}</option>
            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={type}
            name={name}
            value={String(formData[name] || '')}
            onChange={handleInputChange}
            className={commonClasses}
            disabled={!isEditable}
            placeholder={isEditable ? placeholder : ''}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="mt-4 text-gray-500">Loading Paathner...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Paathner Triage Matrix</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentView('triage')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'triage'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Triage Matrix
              </button>
              {user.role === 'PM' && (
                <button
                  onClick={() => setCurrentView('sprint-planner')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'sprint-planner'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Sprint Planner
                </button>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <span className="mr-2">Welcome, <strong>{user.name}</strong></span>
              <Badge color="blue">{user.role}</Badge>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </button>
          </div>    <div className="w-px h-6 bg-gray-300 mx-2"></div>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={exportToCSV} className="text-gray-600 hover:text-gray-900 px-3 py-2">
            <Download className="h-5 w-5" />
          </button>
          {user.role === 'BD' && (
            <button
              onClick={openNewTicket}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {currentView === 'sprint-planner' ? (
        <SprintPlanner
          sprints={sprints}
          tasks={tasks}
          tickets={tickets}
          onCreateSprint={(newSprint) => setSprints([...sprints, newSprint])}
          onAddTask={(newTask) => setTasks([...tasks, newTask])}
          onEditSprint={(updatedSprint) => setSprints(sprints.map(s => s.id === updatedSprint.id ? updatedSprint : s))}
          onEditTask={(updatedTask) => setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t))}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID & Title</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Source (BD)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">BA Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">PM Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dev Delivery</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEditTicket(ticket)}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 font-mono">{ticket.id}</span>
                        <span className="text-sm font-medium text-gray-900">{ticket.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ticket.source}</td>
                    <td className="px-6 py-4"><Badge color={getStatusColor(ticket.baStatus)}>{ticket.baStatus}</Badge></td>
                    <td className="px-6 py-4"><Badge color={getStatusColor(ticket.pmStatus)}>{ticket.pmStatus}</Badge></td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-700">{ticket.deliveryDate || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="h-4 w-4 text-gray-400 inline" />
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No tickets found. Click "New Request" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
              <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">

                {/* Modal Header */}
                <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{currentTicket ? `Edit ${currentTicket.id}` : 'New Feature Request'}</h3>
                    <p className="text-sm text-gray-500">Manage the lifecycle of this feature request.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
                </div>

                {/* Tab Navigation */}
                <div className="bg-gray-50 border-b px-6">
                  <nav className="-mb-px flex space-x-8">
                    {['Requirement (BD)', 'Analysis (BA)', 'Approval (PM)', 'Delivery (Dev)'].map((tab, index) => {
                      const isActive = activeTab === index;
                      const colors = ['border-blue-500 text-blue-600', 'border-purple-500 text-purple-600', 'border-orange-500 text-orange-600', 'border-green-500 text-green-600'];
                      return (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(index)}
                          className={`
                          whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                          ${isActive ? colors[index] : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                        >
                          {tab}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="px-6 py-6 max-h-[65vh] overflow-y-auto bg-white min-h-[300px]">

                  {/* Tab 0: BD Team */}
                  {activeTab === 0 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-blue-800 font-bold">
                            <UserIcon className="w-4 h-4 mr-2" /> Stage 1: Business Requirement
                          </h4>
                          <p className="text-sm text-blue-600 mt-1">Define the "Why" and "What" of the feature.</p>
                        </div>
                        {!canEdit(0) && <Badge color="gray">Read Only</Badge>}
                      </div>

                      {/* Request Type Selection */}
                      <div className="flex space-x-6 mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="requestType"
                            value="New"
                            checked={formData.requestType === 'New'}
                            onChange={handleInputChange}
                            disabled={!canEdit(0)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">New Feature</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="requestType"
                            value="Enhancement"
                            checked={formData.requestType === 'Enhancement'}
                            onChange={handleInputChange}
                            disabled={!canEdit(0)}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Existing Feature Enhancement</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2 md:col-span-1">
                          {formData.requestType === 'New' ? (
                            renderInput('text', 'title', 'Feature Title', undefined, undefined, 'e.g. "One-Click Checkout"')
                          ) : (
                            renderInput('select', 'title', 'Select Existing Feature', [
                              'Reporting Module',
                              'User Management',
                              'Notifications',
                              'Mobile App',
                              'Payment Gateway',
                              'Inventory System'
                            ], undefined, 'Select feature to enhance...')
                          )}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('text', 'source', 'Origin Source', undefined, undefined, 'e.g. "Client Meeting (Zara)"')}
                        </div>
                        <div className="col-span-2">
                          {renderInput('textarea', 'problem', 'Problem Statement (Pain Point)', undefined, 3, 'Describe the current issue. e.g. "Customers drop off because checkout is too slow."')}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('select', 'severity', 'Severity (Urgency)', ['Critical', 'High', 'Medium', 'Low'], undefined, 'Select urgency level...')}
                        </div>
                        <div className="col-span-2">
                          {renderInput('textarea', 'value', 'Business Value', undefined, 3, 'What is the benefit? e.g. "Expected to increase conversion by 10%."')}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('date', 'requestedDate', 'Requested Timeline (BD Preference)', undefined, undefined, 'Select date')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 1: BA Team */}
                  {activeTab === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-purple-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Stage 2: Functional Analysis
                          </h4>
                          <p className="text-sm text-purple-600 mt-1">Evaluate feasibility and requirements.</p>
                        </div>
                        {!canEdit(1) && <Badge color="gray">Read Only</Badge>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                          {renderInput('text', 'srsLink', 'SRS / Doc Link', undefined, undefined, 'e.g. "http://sharepoint/docs/REQ-123"')}
                        </div>
                        <div className="col-span-2">
                          {renderInput('textarea', 'analysis', 'Functional Analysis Notes', undefined, 4, 'Feasibility check, dependencies, and functional breakdown...')}
                        </div>
                        <div>
                          {renderInput('select', 'baStatus', 'Analysis Status', ['Pending', 'Analysis Complete'], undefined, 'Select status...')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: PM Team */}
                  {activeTab === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-orange-800 font-bold">
                            <AlertCircle className="w-4 h-4 mr-2" /> Stage 3: PM Approval & Technical Assessment
                          </h4>
                          <p className="text-sm text-orange-600 mt-1">Assess alignment, impact, and schedule.</p>
                        </div>
                        {!canEdit(2) && <Badge color="gray">Read Only</Badge>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                          {renderInput('text', 'productAlignment', 'Product Alignment', undefined, undefined, 'Does this align with goals? (Yes/No - Justification)')}
                        </div>

                        {/* Technical Impact */}
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('select', 'techImpactBackend', 'Tech Impact (Backend)', ['Low', 'Medium', 'High'], undefined, 'Changes to Laravel/PostgreSQL?')}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('select', 'techImpactMobile', 'Tech Impact (Mobile/Kiosk)', ['Low', 'Medium', 'High'], undefined, 'Changes to React/Capacitor/Situm?')}
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          {renderInput('select', 'situmDependency', 'Situm/Map Dependency', ['Yes', 'No'], undefined, 'Re-mapping required?')}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('select', 'riskLevel', 'Risk Level', ['Low', 'Medium', 'High'], undefined, 'e.g. "High - touches payment gateway"')}
                        </div>

                        {/* Planning */}
                        <div className="col-span-2 md:col-span-1">
                          {renderInput('select', 'effort', 'Effort (T-Shirt Size)', ['S', 'M', 'L', 'XL'], undefined, 'S=1d, M=3d, L=Sprint, XL=Refactor')}
                        </div>

                        <div className="col-span-2 md:col-span-1">
                          {/* SPRINT SELECTION DROPDOWN */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Sprint</label>
                            <select
                              name="sprintCycle"
                              value={formData.sprintCycle || ''}
                              onChange={handleInputChange}
                              disabled={!canEdit(2)}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                            >
                              <option value="">Select Sprint...</option>
                              {sprints
                                .filter(s => s.status !== 'Completed')
                                .map(s => (
                                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                                ))
                              }
                            </select>
                          </div>
                        </div>

                        {/* Approval - Full Width */}
                        <div className="col-span-2 border-t pt-4 mt-2">
                          {renderInput('select', 'pmStatus', 'Approval Decision', ['Pending', 'Approved', 'Rejected', 'On Hold'], undefined, 'Final Decision')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Dev Team */}
                  {activeTab === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-green-800 font-bold">
                            <Clock className="w-4 h-4 mr-2" /> Stage 4: Delivery Scheduling
                          </h4>
                          <p className="text-sm text-green-600 mt-1">Plan the delivery and technical execution.</p>
                        </div>
                        {!canEdit(3) && <Badge color="gray">Read Only</Badge>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          {renderInput('date', 'deliveryDate', 'Delivery Date', undefined, undefined, 'Select target delivery date')}
                        </div>
                        <div>
                          {renderInput('select', 'devStatus', 'Development Status', ['Pending', 'Scheduled', 'In Progress', 'Done'], undefined, 'Update progress...')}
                        </div>
                        <div className="col-span-2">
                          {renderInput('textarea', 'devComments', 'Technical Comments', undefined, 3, 'Implementation details, blockers, or release notes...')}
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse border-t">
                  {canEdit(activeTab) && (
                    <button
                      onClick={saveTicket}
                      disabled={isSaving}
                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      {isSaving ? 'Saving...' : 'Save & Close'}
                    </button>
                  )}
                  {!canEdit(activeTab) && (
                    <span className="text-sm text-gray-500 italic flex items-center mr-4">
                      You are viewing as {user.role}. Editing is restricted to your stage.
                    </span>
                  )}
                  <button onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  Search,
  User as UserIcon,
  LogOut,
  Loader2,
  Package,
  Shield
} from 'lucide-react';
import { Badge } from './components/Badge';
import { formatDate, getInitials } from './lib/utils';
import { LoginScreen } from './components/LoginScreen';
import { RoleSelectionScreen } from './components/RoleSelectionScreen';
import { Ticket, BadgeColor, User as UserType, Sprint, Task, Product, Feature, Profile } from './types';
import { SprintPlanner } from './components/sprint-planner/SprintPlanner';
import { ProductsPage } from './components/products/ProductsPage';
import { ManageDevTeam } from './components/ManageDevTeam';
import { CapacityTracker } from './components/CapacityTracker';
import { AdminDashboard } from './components/AdminDashboard';
import { Analytics } from './components/Analytics';
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

  poStatus: 'Pending',
  poOverview: '',

  baStatus: 'Pending',
  pmStatus: 'Pending',
  devStatus: 'Pending',

  // PM Defaults
  productAlignment: '',
  designReferenceLink: '',
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

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // New State for Sprint Planner & Dev Team
  const currentView = (searchParams.get('view') as 'sprint-planner' | 'capacity' | 'analytics' | 'products' | 'team' | 'admin') || 'sprint-planner';
  const setCurrentView = (view: 'sprint-planner' | 'capacity' | 'analytics' | 'products' | 'team' | 'admin') => {
    setSearchParams(prev => { prev.set('view', view); return prev; });
  };
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Auth & Profile Handling
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [roleSelectionLoading, setRoleSelectionLoading] = useState(false);
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionUser(session.user);
        fetchProfile(session.user);
      } else {
        setSessionUser(null);
        setUser(null);
        setNeedsRoleSelection(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser: any) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;
      if (data && data.role) {
        setUser({ id: authUser.id, name: data.full_name, role: data.role });
        setNeedsRoleSelection(false);
        fetchTickets();
        fetchSprints();
        fetchTasks();
        fetchProducts();
        fetchFeatures();
        fetchProfiles();
      } else {
        setNeedsRoleSelection(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (selectedRole: string, fullName: string) => {
    if (!sessionUser) return;
    setRoleSelectionLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: sessionUser.id,
        full_name: fullName || sessionUser.user_metadata?.full_name || 'New User',
        role: selectedRole,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;

      // Refetch profile to proceed
      await fetchProfile(sessionUser);
    } catch (err) {
      console.error('Error saving role', err);
      alert('Failed to save role. Please try again.');
    } finally {
      setRoleSelectionLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;

      const now = new Date();
      const validProducts: Product[] = [];
      const productsToDelete: string[] = [];

      (data || []).forEach(p => {
        if (p.pending_deletion_at) {
          const deletionTime = new Date(p.pending_deletion_at);
          const hoursPassed = (now.getTime() - deletionTime.getTime()) / (1000 * 60 * 60);

          if (hoursPassed >= 24) {
            productsToDelete.push(p.id);
          } else {
            validProducts.push({
              id: p.id,
              name: p.name,
              description: p.description,
              icon: p.icon,
              pendingDeletionAt: p.pending_deletion_at
            });
          }
        } else {
          validProducts.push({
            id: p.id,
            name: p.name,
            description: p.description,
            icon: p.icon
          });
        }
      });

      setProducts(validProducts);

      // Programmatically hard-delete expired products
      if (productsToDelete.length > 0) {
        // Run in background without awaiting to block UI
        supabase.from('products').delete().in('id', productsToDelete).then(({ error }) => {
          if (error) console.error('Error hard-deleting expired products:', error);
        });
      }

    } catch (err) { console.error('Error fetching products:', err); }
  };

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase.from('features').select('*').order('name');
      if (error) throw error;
      setFeatures((data || []).map(f => ({
        id: f.id,
        productId: f.product_id,
        name: f.name,
        description: f.description,
        srsLink: f.srs_link,
        designReferenceLink: f.design_reference_link,
        designReferenceImageUrls: f.design_reference_images || []
      })));
    } catch (err) { console.error('Error fetching features:', err); }
  };

  const fetchSprints = async () => {
    try {
      const { data, error } = await supabase.from('sprints').select('*').order('created_at', { ascending: true });
      if (error) throw error;

      const todayStr = new Date().toISOString().split('T')[0];

      const mappedSprints: Sprint[] = (data || []).map(s => {
        // Auto-resolve dynamic status based on date
        let newStatus = s.status;
        if (s.end_date < todayStr) {
          newStatus = 'Completed';
        } else if (s.start_date <= todayStr && s.end_date >= todayStr) {
          newStatus = 'Active';
        } else if (s.start_date > todayStr) {
          newStatus = 'Planned';
        }

        return {
          id: s.id,
          name: s.name,
          goal: s.goal,
          startDate: s.start_date,
          endDate: s.end_date,
          capacity: s.capacity,
          status: newStatus,
          team: s.team_members || []
        };
      });

      console.log('Successfully fetched sprints:', mappedSprints.length);
      setSprints(mappedSprints);
    } catch (err) {
      console.error('Error fetching sprints:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      const mappedTasks: Task[] = (data || []).map(t => ({
        id: t.id,
        sprintId: t.sprint_id,
        ticketId: t.ticket_id,
        ticketType: t.ticket_type || 'Task',
        parentId: t.parent_id,
        title: t.title,
        description: t.description,
        assignee: t.assignee,
        codeReviewer: t.code_reviewer,
        qaTester: t.qa_tester,
        priority: t.priority,
        startDate: t.start_date,
        dueDate: t.end_date,
        effort: t.effort,
        storyPoints: t.story_points,
        status: t.status,
        estimatedTime: t.estimated_time,
        loggedTime: t.logged_time,
        specLink: t.spec_link,
        figmaLink: t.figma_link,
        // Bug-specific
        bugEnvironment: t.bug_environment,
        bugSteps: t.bug_steps,
        bugExpected: t.bug_expected,
        bugActual: t.bug_actual,
        bugScreenshotUrl: t.bug_screenshot_url,
        qaStatus: t.qa_status,
        bugPlatform: t.bug_platforms || [],
        bugDevices: t.bug_devices || [],
        bugOsVersions: t.bug_os_versions || [],
        // Epic-specific
        targetReleaseDate: t.target_release_date,
        businessGoal: t.business_goal,
        // Spike-specific
        timeboxDays: t.timebox_days,
        researchQuestion: t.research_question,
        outcome: t.outcome,
      }));
      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').in('role', ['DEV', 'DEV_LEAD', 'QA']).order('full_name', { ascending: true });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  const handleCreateSprint = async (newSprint: Sprint) => {
    try {
      setSprints(prev => [...prev, newSprint]); // optimistic
      const { error } = await supabase.from('sprints').insert([{
        id: newSprint.id,
        name: newSprint.name,
        goal: newSprint.goal,
        start_date: newSprint.startDate,
        end_date: newSprint.endDate,
        capacity: newSprint.capacity,
        status: newSprint.status,
        team_members: newSprint.team || []
      }]);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error creating sprint:', err);
      alert('Failed to save sprint to database: ' + (err.message || JSON.stringify(err)));
      fetchSprints();
    }
  };

  const handleEditSprint = async (updatedSprint: Sprint) => {
    try {
      setSprints(prev => prev.map(s => s.id === updatedSprint.id ? updatedSprint : s)); // optimistic
      const { error } = await supabase.from('sprints').update({
        name: updatedSprint.name,
        goal: updatedSprint.goal,
        start_date: updatedSprint.startDate,
        end_date: updatedSprint.endDate,
        capacity: updatedSprint.capacity,
        status: updatedSprint.status,
        team_members: updatedSprint.team || []
      }).eq('id', updatedSprint.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating sprint:', err);
      fetchSprints();
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      setSprints(prev => prev.filter(s => s.id !== sprintId)); // optimistic
      setTasks(prev => prev.filter(t => t.sprintId !== sprintId)); // optimistic
      const { error } = await supabase.from('sprints').delete().eq('id', sprintId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting sprint:', err);
      fetchSprints();
      fetchTasks();
    }
  };

  const handleAddTask = async (newTask: Task) => {
    try {
      // Force Epics to have no sprint
      const finalSprintId = newTask.ticketType === 'Epic' ? null : (newTask.sprintId || null);
      const taskToSave = { ...newTask, sprintId: finalSprintId };
      setTasks(prev => [...prev, taskToSave]); // optimistic
      const { error } = await supabase.from('tasks').insert([{
        id: taskToSave.id,
        sprint_id: taskToSave.sprintId,
        ticket_id: newTask.ticketId || null,
        ticket_type: newTask.ticketType || 'Task',
        parent_id: newTask.parentId || null,
        title: newTask.title,
        description: newTask.description,
        assignee: newTask.assignee,
        code_reviewer: newTask.codeReviewer || null,
        qa_tester: newTask.qaTester || null,
        priority: newTask.priority || null,
        start_date: newTask.startDate,
        end_date: newTask.dueDate,
        effort: newTask.effort,
        story_points: newTask.storyPoints || null,
        status: newTask.status,
        estimated_time: newTask.estimatedTime,
        logged_time: newTask.loggedTime,
        spec_link: newTask.specLink || null,
        figma_link: newTask.figmaLink || null,
        bug_environment: newTask.bugEnvironment || null,
        bug_steps: newTask.bugSteps || null,
        bug_expected: newTask.bugExpected || null,
        bug_actual: newTask.bugActual || null,
        bug_screenshot_url: newTask.bugScreenshotUrl || null,
        qa_status: newTask.qaStatus || 'Open',
        bug_platforms: newTask.bugPlatform || [],
        bug_devices: newTask.bugDevices || [],
        bug_os_versions: newTask.bugOsVersions || [],
        target_release_date: newTask.targetReleaseDate || null,
        business_goal: newTask.businessGoal || null,
        timebox_days: newTask.timeboxDays || null,
        research_question: newTask.researchQuestion || null,
        outcome: newTask.outcome || null,
      }]);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error adding task:', err);
      alert('Failed to save task to database: ' + (err.message || JSON.stringify(err)));
      fetchTasks();
    }
  };

  const handleEditTask = async (updatedTask: Task) => {
    try {
      // Force Epics to have no sprint
      const finalSprintId = updatedTask.ticketType === 'Epic' ? null : (updatedTask.sprintId || null);
      const taskToSave = { ...updatedTask, sprintId: finalSprintId };
      setTasks(prev => prev.map(t => t.id === taskToSave.id ? taskToSave : t)); // optimistic
      const { error } = await supabase.from('tasks').update({
        sprint_id: taskToSave.sprintId,
        ticket_type: taskToSave.ticketType || 'Task',
        parent_id: taskToSave.parentId || null,
        title: updatedTask.title,
        description: updatedTask.description,
        assignee: updatedTask.assignee,
        code_reviewer: updatedTask.codeReviewer || null,
        qa_tester: updatedTask.qaTester || null,
        priority: updatedTask.priority || null,
        start_date: updatedTask.startDate,
        end_date: updatedTask.dueDate,
        effort: updatedTask.effort,
        story_points: updatedTask.storyPoints || null,
        status: updatedTask.status,
        estimated_time: updatedTask.estimatedTime,
        logged_time: updatedTask.loggedTime,
        spec_link: updatedTask.specLink || null,
        figma_link: updatedTask.figmaLink || null,
        bug_environment: updatedTask.bugEnvironment || null,
        bug_steps: updatedTask.bugSteps || null,
        bug_expected: updatedTask.bugExpected || null,
        bug_actual: updatedTask.bugActual || null,
        bug_screenshot_url: updatedTask.bugScreenshotUrl || null,
        qa_status: updatedTask.qaStatus || null,
        bug_platforms: updatedTask.bugPlatform || [],
        bug_devices: updatedTask.bugDevices || [],
        bug_os_versions: updatedTask.bugOsVersions || [],
        target_release_date: updatedTask.targetReleaseDate || null,
        business_goal: updatedTask.businessGoal || null,
        timebox_days: updatedTask.timeboxDays || null,
        research_question: updatedTask.researchQuestion || null,
        outcome: updatedTask.outcome || null,
      }).eq('id', updatedTask.id);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating task:', err);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== taskId)); // optimistic
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task:', err);
      fetchTasks();
    }
  };

  const handleCreateProduct = async (product: Product) => {
    try {
      setProducts(prev => [...prev, product]);
      const { error } = await supabase.from('products').insert([{
        id: product.id,
        name: product.name,
        description: product.description,
        icon: product.icon,
        pending_deletion_at: product.pendingDeletionAt || null
      }]);
      if (error) throw error;
    } catch (err) { console.error(err); fetchProducts(); }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    try {
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      const { error } = await supabase.from('products').update({
        name: updatedProduct.name,
        description: updatedProduct.description,
        icon: updatedProduct.icon,
        pending_deletion_at: updatedProduct.pendingDeletionAt || null
      }).eq('id', updatedProduct.id);
      if (error) throw error;
    } catch (err) { console.error(err); fetchProducts(); }
  };

  const handleCreateFeature = async (feature: Feature) => {
    try {
      setFeatures(prev => [...prev, feature]);
      const { error } = await supabase.from('features').insert([{
        id: feature.id,
        product_id: feature.productId,
        name: feature.name,
        description: feature.description,
        srs_link: feature.srsLink,
        design_reference_link: feature.designReferenceLink,
        design_reference_images: feature.designReferenceImageUrls || []
      }]);
      if (error) throw error;
    } catch (err) { console.error(err); fetchFeatures(); }
  };

  const handleEditFeature = async (updatedFeature: Feature) => {
    try {
      setFeatures(prev => prev.map(f => f.id === updatedFeature.id ? updatedFeature : f));
      const { error } = await supabase.from('features').update({
        name: updatedFeature.name,
        description: updatedFeature.description,
        srs_link: updatedFeature.srsLink,
        design_reference_link: updatedFeature.designReferenceLink,
        design_reference_images: updatedFeature.designReferenceImageUrls || []
      }).eq('id', updatedFeature.id);
      if (error) throw error;
    } catch (err) { console.error(err); fetchFeatures(); }
  };

  const handleDeleteFeature = async (featureId: string) => {
    try {
      setFeatures(prev => prev.filter(f => f.id !== featureId));
      const { error } = await supabase.from('features').delete().eq('id', featureId);
      if (error) throw error;
    } catch (err) { console.error(err); fetchFeatures(); }
  };

  const handleUploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    return data.publicUrl;
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
        createdAt: t.created_at,
        requestType: t.request_type,
        title: t.title,
        source: t.source,
        problem: t.problem,
        severity: t.severity,
        value: t.value || '',
        requestedDate: t.requested_date,

        poStatus: t.po_status,
        poOverview: t.po_overview,

        baStatus: t.ba_status,
        srsLink: t.srs_link,
        analysis: t.analysis,

        pmStatus: t.pm_status,
        productAlignment: t.product_alignment,
        designReferenceLink: t.design_reference_link,
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

  // ------------------------------------------------------------------
  //  UNIVERSAL SEARCH LOGIC
  // ------------------------------------------------------------------
  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return { tickets: [], sprints: [], tasks: [], team: [] };

    const term = searchTerm.toLowerCase();

    const matchedTickets = tickets.filter(t =>
      t.title.toLowerCase().includes(term) ||
      t.source.toLowerCase().includes(term) ||
      t.id.toLowerCase().includes(term)
    );

    const matchedSprints = sprints.filter(s =>
      s.name.toLowerCase().includes(term) ||
      (s.goal && s.goal.toLowerCase().includes(term))
    );

    const matchedTasks = tasks.filter(t => {
      const titleMatch = t.title.toLowerCase().includes(term);
      const assigneeMatch = (t.assignees || []).some(id => {
          const profile = profiles.find(p => p.id === id);
          const name = profile ? (profile.full_name || profile.email || '').toLowerCase() : '';
          return name.includes(term);
      });
      return titleMatch || assigneeMatch;
    });

    const matchedTeam = profiles.filter(m =>
      (m.full_name && m.full_name.toLowerCase().includes(term)) ||
      (m.role && m.role.toLowerCase().includes(term))
    );

    return {
      tickets: matchedTickets,
      sprints: matchedSprints,
      tasks: matchedTasks,
      team: matchedTeam
    };
  }, [searchTerm, tickets, sprints, tasks, profiles]);

  const hasSearchResults = searchResults.tickets.length > 0 ||
    searchResults.sprints.length > 0 ||
    searchResults.tasks.length > 0 ||
    searchResults.team.length > 0;
  // ------------------------------------------------------------------


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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Unified Global Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <button
            onClick={() => setCurrentView('sprint-planner')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none shrink-0"
          >
            <div className="bg-violet-600 p-2 rounded-2xl flex-shrink-0 shadow-sm">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden lg:block">Paathner Triage Matrix</h1>
          </button>
          
          {/* Main Navigation Tabs */}
          {(currentView === 'sprint-planner' || currentView === 'capacity' || currentView === 'analytics' || currentView === 'products' || currentView === 'team' || currentView === 'admin') && (
            <div className="hidden md:flex items-center space-x-1 bg-gray-100/80 p-1 rounded-2xl">
              <button
                onClick={() => setCurrentView('sprint-planner')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                  currentView === 'sprint-planner' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                Sprint Planner
              </button>
              {(user?.role === 'PM' || user?.role === 'MANAGEMENT' || user?.role === 'DEV_LEAD') && (
                <button
                  onClick={() => setCurrentView('capacity')}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                    currentView === 'capacity' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  Capacity Tracker
                </button>
              )}
              {(user?.role === 'PM' || user?.role === 'MANAGEMENT' || user?.role === 'DEV_LEAD' || user?.role === 'SUPER_ADMIN') && (
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-all ${
                    currentView === 'analytics' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  Analytics
                </button>
              )}
            </div>
          )}

          {/* Search & Profile */}
          <div className="flex items-center space-x-4 shrink-0">
            {/* Search Bar */}
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
               
               {/* Universal Search Results Dropdown */}
               {isSearchFocused && searchTerm.trim() !== '' && (
                 <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl py-2 z-50 border border-gray-100 max-h-[80vh] overflow-y-auto">
                   {!hasSearchResults ? (
                     <div className="px-4 py-3 text-sm text-gray-500 text-center">No results found for "{searchTerm}"</div>
                   ) : (
                      <>
                        {/* Tickets */}
                        {searchResults.tickets.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tickets</div>
                            {searchResults.tickets.slice(0, 5).map(ticket => (
                              <button
                                key={ticket.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors"
                                onClick={() => {
                                  setCurrentView('sprint-planner');
                                  setSearchTerm('');
                                  setIsSearchFocused(false);
                                }}
                              >
                                <div className="text-xs text-gray-400 font-mono">{ticket.id}</div>
                                <div className="text-sm font-medium text-gray-900 truncate">{ticket.title}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Sprints */}
                        {searchResults.sprints.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sprints</div>
                            {searchResults.sprints.slice(0, 5).map(sprint => (
                              <button
                                key={sprint.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors"
                                onClick={() => {
                                  setCurrentView('sprint-planner');
                                  setTimeout(() => window.dispatchEvent(new CustomEvent('select-sprint', { detail: sprint.id })), 100);
                                  setSearchTerm('');
                                  setIsSearchFocused(false);
                                }}
                              >
                                <div className="text-sm font-medium text-gray-900 truncate flex items-center justify-between">
                                  {sprint.name}
                                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${sprint.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {sprint.status}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Tasks */}
                        {searchResults.tasks.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tasks</div>
                            {searchResults.tasks.slice(0, 5).map(task => (
                              <button
                                key={task.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors"
                                onClick={() => {
                                  setCurrentView('sprint-planner');
                                  setTimeout(() => window.dispatchEvent(new CustomEvent('select-sprint', { detail: task.sprintId })), 100);
                                  setSearchTerm('');
                                  setIsSearchFocused(false);
                                }}
                              >
                                <div className="text-xs text-gray-400 truncate">
                                    {(task.assignees || []).length > 0
                                        ? (task.assignees || []).map(id => profiles.find(p => p.id === id)?.full_name || profiles.find(p => p.id === id)?.email || 'Unknown').join(', ')
                                        : 'Unassigned'}
                                </div>
                                <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                              </button>
                            ))}
                          </div>
                        )}
                        {/* Team */}
                        {searchResults.team.length > 0 && (
                          <div>
                            <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Team Members</div>
                            {searchResults.team.slice(0, 5).map(member => (
                              <button
                                key={member.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors flex justify-between items-center"
                                onClick={() => {
                                  setCurrentView('team');
                                  setSearchTerm('');
                                  setIsSearchFocused(false);
                                }}
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">{member.full_name || member.email}</div>
                                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{member.role}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                   )}
                 </div>
               )}
            </div>

            <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

            {/* User Profile Dropdown */}
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
                    {(user.role === 'PM' || user.role === 'BA') && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setCurrentView('products');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors"
                      >
                        <Package className="w-4 h-4 mr-3 text-gray-400" />
                        Products Portfolio
                      </button>
                    )}
                    {(user.role === 'DEV' || user.role === 'DEV_LEAD') && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setCurrentView('team');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors"
                      >
                        <UserIcon className="w-4 h-4 mr-3 text-gray-400" />
                        Manage Dev Team
                      </button>
                    )}
                    {['SUPER_ADMIN', 'PM', 'MANAGEMENT'].includes(user.role) && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setCurrentView('admin');
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 flex items-center transition-colors border-t border-gray-50 mt-1"
                      >
                        <Shield className="w-4 h-4 mr-3 text-gray-400" />
                        Admin Panel
                      </button>
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

      {currentView === 'sprint-planner' ? (
        <SprintPlanner
          currentUser={user}
          sprints={sprints}
          tasks={tasks}
          tickets={tickets}
          profiles={profiles}
          onCreateSprint={handleCreateSprint}
          onAddTask={handleAddTask}
          onEditSprint={handleEditSprint}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onDeleteSprint={handleDeleteSprint}
          userRole={user?.role}
        />
      ) : currentView === 'capacity' ? (
        <CapacityTracker
          sprints={sprints}
          tasks={tasks}
          profiles={profiles}
          onEditSprint={handleEditSprint}
        />
      ) : currentView === 'products' ? (
        <ProductsPage
          products={products}
          features={features}
          onCreateProduct={handleCreateProduct}
          onEditProduct={handleEditProduct}
          onCreateFeature={handleCreateFeature}
          onEditFeature={handleEditFeature}
          onDeleteFeature={handleDeleteFeature}
          onUploadImage={handleUploadImage}
        />
      ) : currentView === 'team' ? (
        <ManageDevTeam
          onClose={() => fetchProfiles()}
        />
      ) : currentView === 'admin' && ['SUPER_ADMIN', 'PM', 'MANAGEMENT'].includes(user?.role || '') ? (
        <AdminDashboard currentUser={user} />
      ) : currentView === 'analytics' ? (
        <Analytics sprints={sprints} tasks={tasks} />
      ) : null
      }

    </div>
  );
};
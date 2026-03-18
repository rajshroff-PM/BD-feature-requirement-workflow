import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  FileSpreadsheet,
  ChevronRight,
  AlertCircle,
  X,
  Save,
  Search,
  CheckCircle2,
  Clock,
  User as UserIcon,
  LogOut,
  Loader2,
  Filter,
  Package,
  Shield
} from 'lucide-react';
import { Badge } from './components/Badge';
import { formatDate, getInitials } from './lib/utils';
import { LoginScreen } from './components/LoginScreen';
import { RoleSelectionScreen } from './components/RoleSelectionScreen';
import { Ticket, BadgeColor, User as UserType, Sprint, Task, DevTeamMember, Product, Feature } from './types';
import { SprintPlanner } from './components/sprint-planner/SprintPlanner';
import { ProductsPage } from './components/products/ProductsPage';
import { ManageDevTeam } from './components/ManageDevTeam';
import { CapacityTracker } from './components/CapacityTracker';
import { AdminDashboard } from './components/AdminDashboard';
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

  const isModalOpen = searchParams.get('modal') === 'true';
  const setIsModalOpen = (open: boolean) => {
    setSearchParams(prev => {
      if (open) prev.set('modal', 'true');
      else prev.delete('modal');
      return prev;
    });
  };

  const [originalCurrentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const currentTicket = originalCurrentTicket; // To be mapped properly if needed, but keeping original state for object works fine

  const activeTab = parseInt(searchParams.get('tab') || '0', 10);
  const setActiveTab = (tabIndex: number) => {
    setSearchParams(prev => { prev.set('tab', tabIndex.toString()); return prev; });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Ticket>(initialTicketState);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    poStatus: '',
    baStatus: '',
    pmStatus: '',
    devStatus: ''
  });

  // New State for Sprint Planner & Dev Team
  const currentView = (searchParams.get('view') as 'triage' | 'sprint-planner' | 'capacity' | 'products' | 'team' | 'admin') || 'triage';
  const setCurrentView = (view: 'triage' | 'sprint-planner' | 'capacity' | 'products' | 'team' | 'admin') => {
    setSearchParams(prev => { prev.set('view', view); return prev; });
  };
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [devTeam, setDevTeam] = useState<DevTeamMember[]>([]);
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
        fetchDevTeam();
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
        title: t.title,
        description: t.description,
        assignee: t.assignee,
        startDate: t.start_date,
        endDate: t.end_date,
        effort: t.effort,
        status: t.status,
        estimatedTime: t.estimated_time,
        loggedTime: t.logged_time
      }));
      setTasks(mappedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchDevTeam = async () => {
    try {
      const { data, error } = await supabase.from('dev_team').select('*').order('name', { ascending: true });
      if (error) throw error;
      setDevTeam(data || []);
    } catch (err) {
      console.error('Error fetching dev team:', err);
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
      setTasks(prev => [...prev, newTask]); // optimistic
      const { error } = await supabase.from('tasks').insert([{
        id: newTask.id,
        sprint_id: newTask.sprintId,
        ticket_id: newTask.ticketId || null,
        title: newTask.title,
        description: newTask.description,
        assignee: newTask.assignee,
        start_date: newTask.startDate,
        end_date: newTask.endDate,
        effort: newTask.effort,
        status: newTask.status,
        estimated_time: newTask.estimatedTime,
        logged_time: newTask.loggedTime
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
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t)); // optimistic
      const { error } = await supabase.from('tasks').update({
        title: updatedTask.title,
        description: updatedTask.description,
        assignee: updatedTask.assignee,
        start_date: updatedTask.startDate,
        end_date: updatedTask.endDate,
        effort: updatedTask.effort,
        status: updatedTask.status,
        estimated_time: updatedTask.estimatedTime,
        logged_time: updatedTask.loggedTime
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

    const matchedTasks = tasks.filter(t =>
      t.title.toLowerCase().includes(term) ||
      (t.assignee && t.assignee.toLowerCase().includes(term))
    );

    const matchedTeam = devTeam.filter(m =>
      m.name.toLowerCase().includes(term) ||
      (m.role && m.role.toLowerCase().includes(term))
    );

    return {
      tickets: matchedTickets,
      sprints: matchedSprints,
      tasks: matchedTasks,
      team: matchedTeam
    };
  }, [searchTerm, tickets, sprints, tasks, devTeam]);

  const hasSearchResults = searchResults.tickets.length > 0 ||
    searchResults.sprints.length > 0 ||
    searchResults.tasks.length > 0 ||
    searchResults.team.length > 0;
  // ------------------------------------------------------------------

  const openNewTicket = () => {
    // Generate ID logic could be backend side, but for now:
    const newId = `REQ-${String(tickets.length + 1).padStart(3, '0')}`;
    setFormData({ ...initialTicketState, id: newId });
    setSelectedProductId('');
    setCurrentTicket(null);
    setActiveTab(0);
    setIsModalOpen(true);
  };

  const openEditTicket = (ticket: Ticket) => {
    setFormData({ ...ticket });
    setCurrentTicket(ticket);

    if (ticket.requestType === 'Enhancement') {
      const feat = features.find(f => f.name === ticket.title);
      if (feat) setSelectedProductId(feat.productId);
      else setSelectedProductId('');
    } else {
      setSelectedProductId('');
    }

    // Default tab based on role
    if (user?.role === 'BD') setActiveTab(0);
    else if (user?.role === 'PO') setActiveTab(1);
    else if (user?.role === 'BA') setActiveTab(2);
    else if (user?.role === 'PM') setActiveTab(3);
    else if (user?.role === 'DEV' || user?.role === 'DEV_LEAD') setActiveTab(4);
    else setActiveTab(0); // Fallback

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

        po_status: formData.poStatus,
        po_overview: formData.poOverview,

        ba_status: formData.baStatus,
        srs_link: formData.srsLink,
        analysis: formData.analysis,

        pm_status: formData.pmStatus,
        product_alignment: formData.productAlignment,
        design_reference_link: formData.designReferenceLink,
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

            // Insert auto-created task into Supabase
            const { error: taskError } = await supabase.from('tasks').insert([{
              id: newTask.id,
              sprint_id: newTask.sprintId,
              ticket_id: newTask.ticketId,
              title: newTask.title,
              description: newTask.description,
              assignee: newTask.assignee,
              start_date: newTask.startDate,
              end_date: newTask.endDate,
              effort: newTask.effort,
              status: newTask.status
            }]);
            if (taskError) console.error("Error auto-creating task:", taskError);
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



  const getStatusColor = (status: string): BadgeColor => {
    if (status === 'Approved' || status === 'Analysis Complete' || status === 'Scheduled' || status === 'Done') return 'green';
    if (status === 'Rejected') return 'red';
    if (status === 'Pending') return 'yellow';
    if (status === 'In Progress') return 'blue';
    return 'gray';
  };

  // For the main table filter
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPO = filters.poStatus ? t.poStatus === filters.poStatus : true;
    const matchesBA = filters.baStatus ? t.baStatus === filters.baStatus : true;
    const matchesPM = filters.pmStatus ? t.pmStatus === filters.pmStatus : true;
    const matchesDev = filters.devStatus ? t.devStatus === filters.devStatus : true;

    return matchesSearch && matchesPO && matchesBA && matchesPM && matchesDev;
  });

  // Permission Logic
  const canEdit = (tabIndex: number): boolean => {
    if (!user) return false;
    if (user.role === 'BD' && tabIndex === 0) return true;
    if (user.role === 'PO' && tabIndex === 1) return true;
    if (user.role === 'BA' && tabIndex === 2) return true;
    if (user.role === 'PM' && tabIndex === 3) return true;
    if ((user.role === 'DEV' || user.role === 'DEV_LEAD') && tabIndex === 4) return true;
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
    const commonClasses = `w-full mt-1 p-2 border rounded-xl ${!isEditable ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`;

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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => setCurrentView('triage')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="bg-violet-600 p-2 rounded-2xl flex-shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">Paathner Triage Matrix</h1>
          </button>
          <div className="flex items-center space-x-3">



            {user.role === 'BD' && (
              <button
                onClick={openNewTicket}
                className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-2xl shadow-md transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>New Request</span>
              </button>
            )}

            <div className="w-px h-6 bg-gray-300 mx-2 hidden md:block"></div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-violet-100 text-violet-700 font-bold hover:bg-violet-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500"
              >
                {user.name ? getInitials(user.name) : <UserIcon className="w-5 h-5" />}
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-20 border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-1">Role: {user.role}</p>
                    </div>
                    {(user.role === 'PM' || user.role === 'BA') && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setCurrentView('products');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Products Portfolio
                      </button>
                    )}
                    {(user.role === 'DEV' || user.role === 'DEV_LEAD') && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setCurrentView('team');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <UserIcon className="w-4 h-4 mr-2" />
                        Manage Dev Team
                      </button>
                    )}
                    {['SUPER_ADMIN', 'PM', 'PO'].includes(user.role) && (
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setCurrentView('admin');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-violet-700 font-medium hover:bg-violet-50 flex items-center transition-colors border-t border-gray-100 mt-1 pt-1"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Panel
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      {(currentView === 'triage' || currentView === 'sprint-planner' || currentView === 'capacity') && (
        <div className="bg-white border-b border-gray-200 sticky top-16 z-[9] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center space-x-6 h-full">
              <button
                onClick={() => setCurrentView('triage')}
                className={`h-full flex items-center border-b-2 px-1 text-sm font-bold transition-colors ${currentView === 'triage'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                  }`}
              >
                Triage Matrix
              </button>
              {(user?.role === 'PM' || user?.role === 'DEV' || user?.role === 'DEV_LEAD' || user?.role === 'PO' || user?.role === 'BA') && (
                <button
                  onClick={() => setCurrentView('sprint-planner')}
                  className={`h-full flex items-center border-b-2 px-1 text-sm font-bold transition-colors ${currentView === 'sprint-planner'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Sprint Planner
                </button>
              )}
              {(user?.role === 'PM' || user?.role === 'PO' || user?.role === 'DEV_LEAD') && (
                <button
                  onClick={() => setCurrentView('capacity')}
                  className={`h-full flex items-center border-b-2 px-1 text-sm font-bold transition-colors ${currentView === 'capacity'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                >
                  Capacity Tracker
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 my-2">
              {currentView === 'triage' && (
                <div className="relative">
                  <button
                    className={`flex items-center justify-center w-9 h-9 rounded-2xl border ${isFilterOpen ? 'bg-violet-50 border-violet-300 text-violet-600' : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'} transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500`}
                    title="Filter"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    <Filter className="h-4 w-4" />
                  </button>

                  {isFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsFilterOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl py-4 px-5 z-40 border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-sm font-bold text-gray-900">Filters</h3>
                          {(filters.poStatus || filters.baStatus || filters.pmStatus || filters.devStatus) && (
                            <button
                              onClick={() => setFilters({ poStatus: '', baStatus: '', pmStatus: '', devStatus: '' })}
                              className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PO Status</label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                              value={filters.poStatus}
                              onChange={(e) => setFilters(prev => ({ ...prev, poStatus: e.target.value }))}
                            >
                              <option value="">All</option>
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">BA Status</label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                              value={filters.baStatus}
                              onChange={(e) => setFilters(prev => ({ ...prev, baStatus: e.target.value }))}
                            >
                              <option value="">All</option>
                              <option value="Pending">Pending</option>
                              <option value="Analysis Complete">Analysis Complete</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">PM Status</label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                              value={filters.pmStatus}
                              onChange={(e) => setFilters(prev => ({ ...prev, pmStatus: e.target.value }))}
                            >
                              <option value="">All</option>
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                              <option value="On Hold">On Hold</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Dev Status</label>
                            <select
                              className="w-full p-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                              value={filters.devStatus}
                              onChange={(e) => setFilters(prev => ({ ...prev, devStatus: e.target.value }))}
                            >
                              <option value="">All</option>
                              <option value="Pending">Pending</option>
                              <option value="Scheduled">Scheduled</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Done">Done</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="relative hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search anything..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-2xl text-sm focus:ring-2 focus:ring-violet-500 outline-none w-64 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  />
                </div>

                {/* Universal Search Results Dropdown */}
                {isSearchFocused && searchTerm.trim() !== '' && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-2 z-50 border border-gray-200 max-h-[80vh] overflow-y-auto">
                    {!hasSearchResults ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">No results found for "{searchTerm}"</div>
                    ) : (
                      <>
                        {/* Tickets */}
                        {searchResults.tickets.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Tickets</div>
                            {searchResults.tickets.slice(0, 5).map(ticket => (
                              <button
                                key={ticket.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors border-l-2 border-transparent hover:border-violet-500"
                                onClick={() => {
                                  setCurrentView('triage');
                                  openEditTicket(ticket);
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
                            <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Sprints</div>
                            {searchResults.sprints.slice(0, 5).map(sprint => (
                              <button
                                key={sprint.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors border-l-2 border-transparent hover:border-violet-500"
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
                            <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Tasks</div>
                            {searchResults.tasks.slice(0, 5).map(task => (
                              <button
                                key={task.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors border-l-2 border-transparent hover:border-violet-500"
                                onClick={() => {
                                  setCurrentView('sprint-planner');
                                  setTimeout(() => window.dispatchEvent(new CustomEvent('select-sprint', { detail: task.sprintId })), 100);
                                  setSearchTerm('');
                                  setIsSearchFocused(false);
                                }}
                              >
                                <div className="text-xs text-gray-400 truncate">{task.assignee || 'Unassigned'}</div>
                                <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Team */}
                        {searchResults.team.length > 0 && (
                          <div>
                            <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Team Members</div>
                            {searchResults.team.slice(0, 5).map(member => (
                              <button
                                key={member.id}
                                className="w-full text-left px-4 py-2 hover:bg-violet-50 focus:bg-violet-50 outline-none transition-colors border-l-2 border-transparent hover:border-violet-500 flex justify-between items-center"
                                onClick={() => {
                                  setCurrentView('team');
                                  setSearchTerm('');
                                  setIsSearchFocused(false);
                                }}
                              >
                                <div className="text-sm font-medium text-gray-900 truncate">{member.name}</div>
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
            </div>
          </div>
        </div>
      )}

      {currentView === 'sprint-planner' ? (
        <SprintPlanner
          currentUser={user}
          sprints={sprints}
          tasks={tasks}
          tickets={tickets}
          devTeam={devTeam}
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
          onClose={() => fetchDevTeam()}
        />
      ) : currentView === 'admin' && ['SUPER_ADMIN', 'PM', 'PO'].includes(user?.role || '') ? (
        <AdminDashboard />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID & Title</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">PO Status</th>
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
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDate(ticket.createdAt)}
                    </td>
                    <td className="px-6 py-4"><Badge color={getStatusColor(ticket.poStatus)}>{ticket.poStatus}</Badge></td>
                    <td className="px-6 py-4"><Badge color={getStatusColor(ticket.baStatus)}>{ticket.baStatus}</Badge></td>
                    <td className="px-6 py-4"><Badge color={getStatusColor(ticket.pmStatus)}>{ticket.pmStatus}</Badge></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 items-start">
                        <span className="text-sm font-mono text-gray-700">{formatDate(ticket.deliveryDate)}</span>
                        <Badge color={getStatusColor(ticket.devStatus)}>{ticket.devStatus}</Badge>
                      </div>
                    </td>
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
      )
      }

      {/* Modal */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setIsModalOpen(false)}></div>
              <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-2xl shadow-xl">

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
                    {['Requirement (BD)', 'Product Owner (PO)', 'Analysis (BA)', 'Approval (PM)', 'Delivery (Dev)'].map((tab, index) => {
                      const isActive = activeTab === index;
                      const colors = [
                        'border-blue-500 text-blue-600',
                        'border-teal-500 text-teal-600',
                        'border-purple-500 text-purple-600',
                        'border-orange-500 text-orange-600',
                        'border-green-500 text-green-600'
                      ];
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
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 flex justify-between items-center">
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
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Product</label>
                                <select
                                  value={selectedProductId}
                                  onChange={(e) => {
                                    setSelectedProductId(e.target.value);
                                    setFormData(prev => ({ ...prev, title: '' })); // clear feature selection
                                  }}
                                  disabled={!canEdit(0)}
                                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 font-medium"
                                >
                                  <option value="" disabled>Select a Product...</option>
                                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Feature / Module</label>
                                <select
                                  name="title"
                                  value={formData.title}
                                  onChange={handleInputChange}
                                  disabled={!canEdit(0) || !selectedProductId}
                                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 font-medium disabled:opacity-50"
                                >
                                  <option value="" disabled>{selectedProductId ? 'Select feature to enhance...' : 'Select a product first...'}</option>
                                  {features.filter(f => f.productId === selectedProductId).map(f => (
                                    <option key={f.id} value={f.name}>{f.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
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

                  {/* Tab 1: Product Owner (PO) */}
                  {activeTab === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-teal-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Stage 2: Product Owner Approval
                          </h4>
                          <p className="text-sm text-teal-600 mt-1">Review the business requirement and provide an overview.</p>
                        </div>
                        {!canEdit(1) && <Badge color="gray">Read Only</Badge>}
                      </div>

                      {/* BD Info Summary (Read-Only) */}
                      <div className="bg-white p-5 rounded-2xl border border-gray-200 mb-6 shadow-sm">
                        <h5 className="text-sm font-bold text-gray-700 mb-4 border-b pb-2">Business Requirement Overview</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Feature Title</p>
                            <p className="text-sm text-gray-900 mt-1">{formData.title || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Origin Source</p>
                            <p className="text-sm text-gray-900 mt-1">{formData.source || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Problem Statement</p>
                            <p className="text-sm text-gray-900 mt-1">{formData.problem || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Severity</p>
                            <p className="text-[13px] font-medium mt-1">
                              <span className={`px-2 py-0.5 rounded-md ${formData.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                                formData.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                                  formData.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                }`}>
                                {formData.severity || '-'}
                              </span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Requested Timeline</p>
                            <p className="text-sm text-gray-900 mt-1">{formData.requestedDate ? formatDate(formData.requestedDate) : '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Business Value</p>
                            <p className="text-sm text-gray-900 mt-1">{formData.value || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                          {renderInput('textarea', 'poOverview', 'PO Notes', undefined, 4, 'Add notes for further stakeholders...')}
                        </div>
                        <div>
                          {renderInput('select', 'poStatus', 'Approval Decision', ['Pending', 'Approved', 'Rejected'], undefined, 'Select decision...')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: BA Team */}
                  {activeTab === 2 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-purple-800 font-bold">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Stage 3: Functional Analysis
                          </h4>
                          <p className="text-sm text-purple-600 mt-1">Evaluate feasibility and requirements.</p>
                        </div>
                        {!canEdit(2) && <Badge color="gray">Read Only</Badge>}
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

                  {/* Tab 3: PM Team */}
                  {activeTab === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-orange-800 font-bold">
                            <AlertCircle className="w-4 h-4 mr-2" /> Stage 4: PM Approval & Technical Assessment
                          </h4>
                          <p className="text-sm text-orange-600 mt-1">Assess alignment, impact, and schedule.</p>
                        </div>
                        {!canEdit(3) && <Badge color="gray">Read Only</Badge>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                          {renderInput('text', 'productAlignment', 'Product Alignment', undefined, undefined, 'Does this align with goals? (Yes/No - Justification)')}
                        </div>
                        <div className="col-span-2">
                          {renderInput('text', 'designReferenceLink', 'Design Reference Link (Figma)', undefined, undefined, 'e.g. https://www.figma.com/file/...')}
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
                              disabled={!canEdit(3)}
                              className="w-full rounded-2xl border-gray-300 shadow-md focus:border-violet-500 focus:ring-violet-500 transition-colors"
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

                  {/* Tab 4: Dev Team */}
                  {activeTab === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mb-4 flex justify-between items-center">
                        <div>
                          <h4 className="flex items-center text-green-800 font-bold">
                            <Clock className="w-4 h-4 mr-2" /> Stage 5: Delivery Scheduling
                          </h4>
                          <p className="text-sm text-green-600 mt-1">Plan the delivery and technical execution.</p>
                        </div>
                        {!canEdit(4) && <Badge color="gray">Read Only</Badge>}
                      </div>

                      {/* Requirement Overview Section for Dev */}
                      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-md">
                        <h5 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Requirement Overview</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase">SRS Link</span>
                            {formData.srsLink ? (
                              <a href={formData.srsLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                {formData.srsLink}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-500 italic">Not provided</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase">Design Reference Link</span>
                            {formData.designReferenceLink ? (
                              <a href={formData.designReferenceLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                {formData.designReferenceLink}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-500 italic">Not provided</span>
                            )}
                          </div>
                          <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase">Assigned Sprint</span>
                            <span className="text-sm text-gray-900 font-medium">
                              {sprints.find(s => s.id === formData.sprintCycle)?.name || <span className="text-gray-500 italic">None Assigned</span>}
                            </span>
                          </div>
                          <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase">Requested Timeline</span>
                            <span className="text-sm text-gray-900 font-medium">
                              {formData.requestedDate ? formatDate(formData.requestedDate) : <span className="text-gray-500 italic">Not set</span>}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-xs font-medium text-gray-500 uppercase">Functional Analysis Notes</span>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-xl mt-1 border border-gray-100 min-h-[60px]">
                              {formData.analysis ? formData.analysis : <span className="text-gray-400 italic">No notes provided.</span>}
                            </div>
                          </div>
                          <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase">Tech Impact (Backend)</span>
                            <span className="text-sm text-gray-900">{formData.techImpactBackend || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-medium text-gray-500 uppercase">Tech Impact (Mobile)</span>
                            <span className="text-sm text-gray-900">{formData.techImpactMobile || '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
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
                      className="inline-flex justify-center rounded-xl border border-transparent shadow-md px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
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
                  <button onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-md px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                    Cancel
                  </button>
                </div>

              </div>
            </div>
          </div>
        )
      }

    </div>
  );
};
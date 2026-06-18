'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Ticket, User as UserType, Sprint, Task, Product, Feature, Profile } from '../types';

interface GlobalContextType {
  user: UserType | null;
  sessionUser: any;
  loading: boolean;
  needsRoleSelection: boolean;
  roleSelectionLoading: boolean;
  tickets: Ticket[];
  sprints: Sprint[];
  tasks: Task[];
  products: Product[];
  features: Feature[];
  profiles: Profile[];
  handleSaveRole: (selectedRole: string, fullName: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  // Data fetchers to refresh specific data if needed
  fetchTickets: () => Promise<void>;
  fetchSprints: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchFeatures: () => Promise<void>;
  fetchProfiles: () => Promise<void>;
  // Mutations
  handleCreateSprint: (newSprint: Sprint) => Promise<void>;
  handleEditSprint: (updatedSprint: Sprint) => Promise<void>;
  handleDeleteSprint: (sprintId: string) => Promise<void>;
  handleAddTask: (newTask: Task) => Promise<void>;
  handleEditTask: (updatedTask: Task) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  handleCreateProduct: (product: Product) => Promise<void>;
  handleEditProduct: (updatedProduct: Product) => Promise<void>;
  handleCreateFeature: (feature: Feature) => Promise<void>;
  handleEditFeature: (updatedFeature: Feature) => Promise<void>;
  handleDeleteFeature: (featureId: string) => Promise<void>;
  handleUploadImage: (file: File) => Promise<string>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [needsRoleSelection, setNeedsRoleSelection] = useState(false);
  const [roleSelectionLoading, setRoleSelectionLoading] = useState(false);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

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
        const { data: permData } = await supabase
            .from('role_permissions')
            .select('*')
            .eq('role', data.role)
            .single();

        setUser({ 
          id: authUser.id, 
          name: data.full_name, 
          role: data.role,
          permissions: permData || {
              role: data.role,
              view_sprint_planner: true,
              view_capacity_tracker: false,
              view_analytics: false,
              view_products: false,
              view_team: false,
              view_admin_dashboard: false,
              view_access_management: false,
              create_sprints: false,
              edit_sprints: false,
              delete_sprints: false,
              create_tickets: true,
              file_bugs: false,
              edit_tickets: true,
              delete_tickets: false
          }
        });
        setNeedsRoleSelection(false);
        await Promise.all([
          fetchTickets(),
          fetchSprints(),
          fetchTasks(),
          fetchProducts(),
          fetchFeatures(),
          fetchProfiles()
        ]);
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
      await fetchProfile(sessionUser);
    } catch (err) {
      console.error('Error saving role', err);
      alert('Failed to save role. Please try again.');
    } finally {
      setRoleSelectionLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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

      if (productsToDelete.length > 0) {
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
        bugEnvironment: t.bug_environment,
        bugSteps: t.bug_steps,
        bugExpected: t.bug_expected,
        bugActual: t.bug_actual,
        bugScreenshotUrl: t.bug_screenshot_url,
        qaStatus: t.qa_status,
        bugPlatform: t.bug_platforms || [],
        bugDevices: t.bug_devices || [],
        bugOsVersions: t.bug_os_versions || [],
        targetReleaseDate: t.target_release_date,
        businessGoal: t.business_goal,
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

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  const handleCreateSprint = async (newSprint: Sprint) => {
    try {
      setSprints(prev => [...prev, newSprint]); 
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
      alert('Failed to save sprint: ' + (err.message || JSON.stringify(err)));
      fetchSprints();
    }
  };

  const handleEditSprint = async (updatedSprint: Sprint) => {
    try {
      setSprints(prev => prev.map(s => s.id === updatedSprint.id ? updatedSprint : s)); 
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
      setSprints(prev => prev.filter(s => s.id !== sprintId)); 
      setTasks(prev => prev.filter(t => t.sprintId !== sprintId)); 
      const { error } = await supabase.from('sprints').delete().eq('id', sprintId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting sprint:', err);
      alert(`Sprint deletion failed. If you see an RLS error, please run the SQL fix in Supabase.\n\nError details: ${err.message || JSON.stringify(err)}`);
      fetchSprints();
      fetchTasks();
    }
  };

  const handleAddTask = async (newTask: Task) => {
    try {
      const finalSprintId = newTask.ticketType === 'Epic' ? null : (newTask.sprintId || null);
      const taskToSave = { ...newTask, sprintId: finalSprintId };
      setTasks(prev => [...prev, taskToSave]); 
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
      alert('Failed to save task: ' + (err.message || JSON.stringify(err)));
      fetchTasks();
    }
  };

  const handleEditTask = async (updatedTask: Task) => {
    try {
      const finalSprintId = updatedTask.ticketType === 'Epic' ? null : (updatedTask.sprintId || null);
      const taskToSave = { ...updatedTask, sprintId: finalSprintId };
      setTasks(prev => prev.map(t => t.id === taskToSave.id ? taskToSave : t)); 
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
      setTasks(prev => prev.filter(t => t.id !== taskId)); 
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error deleting task:', err);
      alert(`Task deletion failed. If you see an RLS error, please run the SQL fix in Supabase.\n\nError details: ${err.message || JSON.stringify(err)}`);
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

  return (
    <GlobalContext.Provider value={{
      user, sessionUser, loading, needsRoleSelection, roleSelectionLoading,
      tickets, sprints, tasks, products, features, profiles,
      handleSaveRole, handleLogout,
      fetchTickets, fetchSprints, fetchTasks, fetchProducts, fetchFeatures, fetchProfiles,
      handleCreateSprint, handleEditSprint, handleDeleteSprint,
      handleAddTask, handleEditTask, handleDeleteTask,
      handleCreateProduct, handleEditProduct,
      handleCreateFeature, handleEditFeature, handleDeleteFeature,
      handleUploadImage
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error('useGlobal must be used within a GlobalProvider');
  }
  return context;
}

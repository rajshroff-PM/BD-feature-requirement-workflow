// ── Ticket Types ─────────────────────────────────────────────────────────────

export type TicketType = 'Epic' | 'Story' | 'Bug' | 'Task' | 'Spike';

export const TICKET_TYPE_CONFIG: Record<TicketType, {
  color: string;
  textColor: string;
  borderColor: string;
  bgLight: string;
  icon: string;
  label: string;
}> = {
  Epic:  { color: 'bg-purple-600', textColor: 'text-purple-700', borderColor: 'border-purple-300', bgLight: 'bg-purple-50', icon: 'Layers',      label: 'Epic'       },
  Story: { color: 'bg-blue-500',   textColor: 'text-blue-700',   borderColor: 'border-blue-300',   bgLight: 'bg-blue-50',   icon: 'BookOpen',    label: 'User Story' },
  Bug:   { color: 'bg-red-500',    textColor: 'text-red-700',    borderColor: 'border-red-300',    bgLight: 'bg-red-50',    icon: 'Bug',         label: 'Bug'        },
  Task:  { color: 'bg-gray-500',   textColor: 'text-gray-700',   borderColor: 'border-gray-300',   bgLight: 'bg-gray-50',   icon: 'CheckSquare', label: 'Task'       },
  Spike: { color: 'bg-amber-500',  textColor: 'text-amber-700',  borderColor: 'border-amber-300',  bgLight: 'bg-amber-50',  icon: 'Zap',         label: 'Spike'      },
};

// ── Roles ─────────────────────────────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'BD' | 'MANAGEMENT' | 'BA' | 'PM' | 'DEV' | 'DEV_LEAD' | 'QA';

export type BadgeColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';

// ── Users ─────────────────────────────────────────────────────────────────────

export interface User {
  id?: string;
  role: Role;
  name?: string;
}

// ── Tickets (legacy triage — kept for backward compat, no longer primary UI) ──

export interface Ticket {
  id: string;
  createdAt?: string;
  requestType: 'New' | 'Enhancement';
  title: string;
  source: string;
  problem: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  value: string;
  requestedDate?: string;
  srsLink?: string;
  analysis?: string;
  baStatus: 'Pending' | 'Analysis Complete';
  poStatus: 'Pending' | 'Approved' | 'Rejected';
  poOverview?: string;
  pmStatus: 'Pending' | 'Approved' | 'Rejected' | 'On Hold';
  productAlignment?: string;
  designReferenceLink?: string;
  techImpactBackend?: 'Low' | 'Medium' | 'High';
  techImpactMobile?: 'Low' | 'Medium' | 'High';
  situmDependency?: 'Yes' | 'No';
  effort?: 'S' | 'M' | 'L' | 'XL';
  riskLevel?: 'Low' | 'Medium' | 'High';
  sprintCycle?: string;
  deliveryDate?: string;
  devComments?: string;
  devStatus: 'Pending' | 'Scheduled' | 'In Progress' | 'Done';
}

// ── Team ─────────────────────────────────────────────────────────────────────

export interface DevTeamMember {
  id: string;
  name: string;
  role: string;
}

export interface SprintTeamMember extends DevTeamMember {
  daysWorking: number;
  presentDates?: string[];
}

// ── Sprints ───────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  capacity: number;
  status: 'Active' | 'Planned' | 'Completed';
  team?: SprintTeamMember[];
}

// ── Tasks (primary work item — Epic / Story / Bug / Task / Spike) ─────────────

export interface Task {
  id: string;
  sprintId?: string;       // nullable — null means Backlog
  ticketId?: string;       // legacy link to old tickets table
  ticketType: TicketType;  // Epic | Story | Bug | Task | Spike
  parentId?: string;       // Story → Epic; Bug/Task → Story or Epic
  title: string;
  description?: string;
  assignee: string;
  codeReviewer?: string;
  qaTester?: string;
  priority?: 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
  startDate: string;
  dueDate: string;
  effort: number;          // Days
  storyPoints?: number;    // Story-point estimate (Tech Lead sets)
  status: 'To Do' | 'In Progress' | 'Code Review' | 'QA' | 'Done';
  estimatedTime?: string;  // e.g. "1d 4h"
  loggedTime?: string;     // e.g. "2h 30m"
  specLink?: string;       // External spec / Notion / Google Doc
  figmaLink?: string;      // Figma design link

  // Story-specific

  // Bug-specific
  bugEnvironment?: 'Production' | 'Staging' | 'Dev';
  bugSteps?: string;
  bugExpected?: string;
  bugActual?: string;
  bugScreenshotUrl?: string;
  qaStatus?: 'Open' | 'In Progress' | 'Fixed' | 'Verified' | 'Closed';

  // Epic-specific
  targetReleaseDate?: string;
  businessGoal?: string;

  // Spike-specific
  timeboxDays?: number;
  researchQuestion?: string;
  outcome?: string;
}

// ── Task Logs ─────────────────────────────────────────────────────────────────

export interface TaskLog {
  id: string;
  taskId: string;
  profileId?: string;
  actionType: 'update_field' | 'log_time';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  loggedAmount?: string;
  createdAt: string;
  profile?: {
    fullName: string;
    avatarUrl?: string;
  };
}

// ── Products & Features ───────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  pendingDeletionAt?: string;
}

export interface Feature {
  id: string;
  productId: string;
  name: string;
  description?: string;
  srsLink?: string;
  designReferenceLink?: string;
  designReferenceImageUrls?: string[];
}

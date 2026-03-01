export interface Ticket {
  id: string;
  createdAt?: string; // Triage creation date
  // BD Fields
  requestType: 'New' | 'Enhancement';
  title: string;
  source: string;
  problem: string; // The "Pain Point"
  severity: 'Critical' | 'High' | 'Medium' | 'Low'; // BD Perception of Urgency
  value: string;   // The "Business Value"
  requestedDate?: string; // BD Preferred Timeline

  // BA Fields
  srsLink?: string;
  analysis?: string;
  baStatus: 'Pending' | 'Analysis Complete';

  // Product Owner Fields
  poStatus: 'Pending' | 'Approved' | 'Rejected';
  poOverview?: string;

  // PM Fields
  pmStatus: 'Pending' | 'Approved' | 'Rejected' | 'On Hold';
  productAlignment?: string; // Yes/No + Justification
  designReferenceLink?: string; // Figma Link
  techImpactBackend?: 'Low' | 'Medium' | 'High';
  techImpactMobile?: 'Low' | 'Medium' | 'High';
  situmDependency?: 'Yes' | 'No';
  effort?: 'S' | 'M' | 'L' | 'XL';
  riskLevel?: 'Low' | 'Medium' | 'High';
  sprintCycle?: string; // Assign Sprint

  // Dev Lead Fields
  deliveryDate?: string;
  devComments?: string;
  devStatus: 'Pending' | 'Scheduled' | 'In Progress' | 'Done';
}

export type BadgeColor = 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'purple';

export type Role = 'BD' | 'PO' | 'BA' | 'PM' | 'DEV';

export interface User {
  id?: string;
  role: Role;
  name?: string;
}

export interface DevTeamMember {
  id: string;
  name: string;
  role: string;
}

export interface SprintTeamMember extends DevTeamMember {
  daysWorking: number;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  capacity: number; // Total man-days
  status: 'Active' | 'Planned' | 'Completed';
  team?: SprintTeamMember[]; // assigned team members and their capacity
}

export interface Task {
  id: string;
  sprintId: string;
  ticketId?: string; // Linked backend ticket
  title: string;
  description?: string; // Optional description
  assignee: string; // e.g., 'Dave (Dev)'
  startDate: string;
  endDate: string;
  effort: number; // Days
  status: 'To Do' | 'In Progress' | 'Done';
  estimatedTime?: string;
  loggedTime?: string;
}

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
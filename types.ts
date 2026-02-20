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

  // PM Fields
  pmStatus: 'Pending' | 'Approved' | 'Rejected' | 'On Hold';
  productAlignment?: string; // Yes/No + Justification
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

export type Role = 'BD' | 'BA' | 'PM' | 'DEV';

export interface User {
  role: Role;
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  capacity: number; // Total man-days
  status: 'Active' | 'Planned' | 'Completed';
}

export interface Task {
  id: string;
  sprintId: string;
  ticketId?: string; // Linked backend ticket
  title: string;
  assignee: string; // e.g., 'Dave (Dev)'
  startDate: string;
  endDate: string;
  effort: number; // Days
  status: 'To Do' | 'In Progress' | 'Done';
}
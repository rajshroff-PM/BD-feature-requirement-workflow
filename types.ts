export interface Ticket {
  id: string;
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
  name: string;
  role: Role;
}
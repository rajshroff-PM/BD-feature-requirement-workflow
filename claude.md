# Paathner Triage Matrix Application Documentation

## Overview
The Paathner Triage Matrix is a full-stack web application designed to streamline the feature request, triage, and sprint planning process. It acts as a centralized workflow management tool for tracking feature requirements from initial request through analysis, product planning, and final development delivery.

## How the Application Works
1. **Role-Based Workflow:** Users log into the system, and their permissions are determined by their assigned role (managed via Supabase). The application enforces a multi-stage ticket progression where each role focuses on their specific phase of the pipeline.
2. **Feature Triage (Ticketing System):** The core interface allows for the creation, editing, and tracking of request tickets. A ticket moves through several distinct statuses:
   - **New Request:** Created with initial problem/value statements.
   - **BA Analysis:** Evaluated for detailed requirements.
   - **PM Review:** Evaluated for strategic impact, risk, effort, and scheduled into sprints.
   - **Development:** Executed by the Dev team with tracked delivery dates.
3. **Sprint Planner:** A dedicated module where Product Managers and Developers can plan and manage sprints. It allows:
   - Creating, editing, and deleting sprints.
   - Assigning tasks (which can be auto-generated when a PM approves a ticket and assigns a sprint cycle) to specific Dev Team members.
   - Tracking sprint capacity and dynamically updating sprint statuses (Planned, Active, Completed) based on dates.
4. **Universal Search:** An omni-search bar that allows users to instantly find tickets, sprints, tasks, and team members from anywhere in the app.
5. **Data Management & Authentication:** All data (Tickets, Sprints, Tasks, User Profiles, Dev Team configurations) is securely stored and retrieved using a Supabase PostgreSQL backend. Authentication is handled via Supabase Auth, supporting both Email/Password and **Google OAuth** login.
   - **New User Onboarding:** Upon first login via Google, a database trigger automatically creates a base profile. The application intercepts the user with a mandatory **Role Selection Screen**, forcing them to define their stakeholder role before granting access to the Triage Matrix. Row Level Security (RLS) policies govern data access, ensuring users can only update their own profiles and access appropriate ticket sections.
6. **Reporting & Exports:** Users can export Sprint reports into PDF and CSV formats from the Sprint Planner.

## Stakeholders and Roles
The application strictly enforces a role-based access control (RBAC) system. Each stakeholder can only edit specific fields relevant to their stage in the workflow, while viewing the rest of the ticket as read-only.

1. **Business Development (BD)**
   - **Responsibilities:** Identify market needs, propose new features, and log customer/business problems.
   - **Permissions:** Can create new feature requests. They have exclusive edit access to the BD portion of a ticket (Title, Request Type, Source, Problem, Severity, Value, Requested Date).

2. **Business Analyst (BA)**
   - **Responsibilities:** Analyze the BD requests, create formal Software Requirements Specifications (SRS), and provide technical/business analysis.
   - **Permissions:** Can edit the BA section of a ticket (BA Status, SRS Link, Analysis).

3. **Product Manager (PM)**
   - **Responsibilities:** Assess product alignment, technical impact, cross-platform dependencies, risk level, estimate effort (T-Shirt sizing), and schedule features into sprints.
   - **Permissions:** Can edit the PM section of a ticket (PM Status, Product Alignment, Design Links, Tech Impact, Risk, Sprint Cycle). Has access to the **Sprint Planner** to create sprints and manage tasks.

4. **Development Team (DEV / Developers)**
   - **Responsibilities:** Review assigned features, provide developer comments, commit to delivery dates, and work on sprint tasks.
   - **Permissions:** Can edit the DEV section of a ticket (Dev Status, Delivery Date, Dev Comments). Has access to the **Sprint Planner** to track and update their assigned sprint tasks.

## Technology Stack
- **Frontend Framework:** React 19 with Vite.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS with custom modern UI styling (Outfit font, vibrant colors).
- **Backend & Auth:** Supabase (PostgreSQL Database, Auth APIs).
- **Icons & UI Utilities:** Lucide React, Radix UI.
- **Export Capabilities:** jsPDF, jsPDF-Autotable.

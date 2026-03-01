# Paathner Triage Matrix & Sprint Planner - Application Overview

## Table of Contents
1. [Introduction](#introduction)
2. [Technology Stack](#technology-stack)
3. [User Roles and Permissions](#user-roles-and-permissions)
4. [Core Modules](#core-modules)
5. [End-to-End Workflow](#end-to-end-workflow)
6. [Data Model and Architecture](#data-model-and-architecture)

---

## 1. Introduction
The **Paathner Triage Matrix** is a comprehensive internal tool designed to streamline the lifecycle of feature requests and system enhancements. The application creates a highly structured environment where requirements flow from initial conceptualization by Business Development (BD) through rigorous analysis and planning, all the way to execution within the Development team's Sprints. 

The application effectively bridges the gap between commercial ideation and technical delivery, ensuring all stakeholders (BAs, POs, PMs, and Developers) have a dedicated, transparent workspace to provide input without accidentally modifying another department's work.

---

## 2. Technology Stack
The application is built using a modern, robust web stack designed for rapid interactions and real-time syncing.

- **Frontend Framework:** React 19 layered with Vite for fast local development and optimized bundling.
- **Language:** TypeScript for strong type safety and predictable domain modeling.
- **Styling & UI:** 
  - Tailwind CSS for rapid, utility-first styling.
  - "Kleon" modern UI aesthetic featuring vibrant violet accents, rounded borders, and the "Outfit" typography set.
  - Radix UI primitives for accessible component structure (slots, labels).
  - Lucide React for consistent iconography.
- **Backend & Database:** 
  - Services provided entirely by **Supabase**.
  - PostgreSQL Relational Database for complex querying and robust data integrity.
  - Supabase Auth (Google OAuth) for identity.
  - Supabase Storage for secure image and file attachments (e.g., design references).
- **Exporting & Reporting:** `jspdf` and `jspdf-autotable` to dynamically generate automated Sprint summary files (PDF & CSV).

---

## 3. User Roles and Permissions
The application relies heavily on **Role-Based Access Control (RBAC)** to safely partition responsibilities. Upon logging in via Google Auth, users select their respective role. The system instantly customizes their view and edit capabilities.

- **Business Development (BD):** Identify commercial gaps. They hold permission to create new Triage Matrix tickets, detailing the "Pain Point", business value, perceived urgency, and ideal timeline.
- **Business Analyst (BA):** Perform initial discovery. They append Systems Requirements Specifications (SRS) links and analytical commentary to the BD tickets.
- **Product Owner (PO):** Focus purely on overarching strategic alignment. They can approve or reject the BA/BD plans by providing their strategic overview.
- **Product Manager (PM):** The center of gravity for execution. PMs evaluate UI/UX dependencies (Figma), cross-platform impact (Backend/Mobile/Situm), measure effort scale, and assign the ticket to an upcoming Sprint. PMs also manage high-level Product definitions and Features.
- **Developer / Dev Lead (DEV):** Add granular scheduling delivery dates, commit to statuses (In Progress, Done, Scheduled), track sprint capacity, and generate reports.

_Security Note: When a user interacts with a ticket, the tool automatically opens the tab tied to their role. Fields belonging to other roles are completely **read-only**, preventing accidental overwrites._

---

## 4. Core Modules

### A. The Triage Matrix (Ticket Management)
The heart of the application. The matrix displays a unified list of all requests with status badges. Clicking a ticket opens a massive, multi-tabbed modal:
- **Tabbed Stages:** Grouped by BD, BA, PO, PM, and DEV.
- Users fill out their portion of the contract and change their specific department's status (e.g., from `Pending` to `Approved`).

### B. Sprint Planner
A dedicated workspace primarily used by PMs and Dev Leads to track execution.
- **Sprint Management:** Create iterations (Sprints) equipped with an overarching Goal, Start/End dates, and Total Man-Day Capacity.
- **Task Association:** Breakdown Triage tickets into sub-tasks assigned to specific frontend/backend developers. 
- **Filtering & Search:** The interface features a robust filtering system. Clicking a team member's avatar immediately pivots the board to show only their assignments. A universal search bar quickly pulls up target sprints, profiles, and historical tickets.
- **Exports:** Sprints can be instantly downloaded as neatly formatted PDFs or CSV files to be shared in stand-up meetings.

### C. Product & Feature Governance
Categorization features designed for PMs:
- **Product Directory:** Create top-level products. Supports a strategic **24-hour soft-delete timer**; if a product is deleted, it is visibly deactivated but can be retrieved for 24 hours before a permanent database purge.
- **Feature Drill-down:** Attach specific capability documentation directly to products, uploading design screenshots or SRS links.

---

## 5. End-to-End Workflow

**1. Ideation & Intake:**
A BD member hears from a client about a missing system feature. They log into the tool, hit "New Request," and fill out the BD sections: what is the problem, what is the value, and when does the client need it.

**2. Discovery & Viability:**
A BA sees the `Pending` ticket, investigates the feasibility, creates an external SRS document, and attaches the link. Following this, the PO reviews the business case against the company's roadmap and sets their status to `Approved`.

**3. T-Shirt Sizing & Architecture:**
The PM receives the approved concept. They link the necessary UX/UI Figma files, score the effort (S/M/L/XL), tag any external dependencies (like Situm engines), and align the ticket to an actual `Sprint Cycle`.

**4. Sprint Execution:**
The ticket transitions out of pure Triage and into the Sprint Planner. Over on the Sprint dashboard, the Dev Lead assigns standard development tasks derived from the ticket to individual developers (`Dave`, `Sarah`, etc.). Devs progress their tasks from `To Do` -> `In Progress` -> `Done`.

**5. Delivery & Reporting:**
As the sprint lifecycle concludes, PMs/Dev Leads generate the Sprint Report (PDF) detailing the accomplished payload and remaining capacity to review in the retrospective.

---

## 6. Data Model and Architecture

The application ensures high availability and consistency without a custom backend server by relying directly on Supabase via `supabase-js`. 
- **`App.tsx`:** Acts as the primary control center, maintaining React Context/State for `tickets`, `sprints`, `products`, `features`, and the current user's role.
- **Data Schemas (`types.ts`):** 
  - `Ticket`: Contains exactly segregated fields (e.g., `poStatus`, `pmStatus`, `baStatus`).
  - `Sprint` / `Task`, `Product` / `Feature` form relational hierarchies.
- **Real-time Migrations:** The schema relies on automated Supabase SQL migrations pushed from local dev environments to strictly structure relational capabilities prior to deployment to platforms like Vercel.

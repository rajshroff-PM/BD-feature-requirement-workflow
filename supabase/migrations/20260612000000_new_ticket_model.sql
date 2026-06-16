-- ============================================================
-- Migration: New Ticket Model
-- Extends tasks table to support Epic/Story/Bug/Task/Spike types
-- Adds QA role to profiles and pending_invitations constraints
-- ============================================================

-- 1. Extend tasks table with ticket type hierarchy and type-specific fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'Task'
    CHECK (ticket_type IN ('Epic', 'Story', 'Bug', 'Task', 'Spike')),
  ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS story_points INTEGER,
  ADD COLUMN IF NOT EXISTS spec_link TEXT,
  ADD COLUMN IF NOT EXISTS figma_link TEXT,

  -- Story-specific
  ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT,
  ADD COLUMN IF NOT EXISTS qa_readiness TEXT DEFAULT 'Pending'
    CHECK (qa_readiness IN ('Pending', 'Needs Revision', 'AC Approved')),

  -- Bug-specific
  ADD COLUMN IF NOT EXISTS bug_environment TEXT
    CHECK (bug_environment IN ('Production', 'Staging', 'Dev')),
  ADD COLUMN IF NOT EXISTS bug_steps TEXT,
  ADD COLUMN IF NOT EXISTS bug_expected TEXT,
  ADD COLUMN IF NOT EXISTS bug_actual TEXT,
  ADD COLUMN IF NOT EXISTS bug_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS qa_status TEXT DEFAULT 'Open'
    CHECK (qa_status IN ('Open', 'In Progress', 'Fixed', 'Verified', 'Closed')),

  -- Epic-specific
  ADD COLUMN IF NOT EXISTS target_release_date DATE,
  ADD COLUMN IF NOT EXISTS business_goal TEXT,

  -- Spike-specific
  ADD COLUMN IF NOT EXISTS timebox_days INTEGER,
  ADD COLUMN IF NOT EXISTS research_question TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT;

-- 2. Extend status field to include 'Backlog' (items not yet in a sprint)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('Backlog', 'To Do', 'In Progress', 'Done'));

-- Backfill existing tasks to 'To Do' if they somehow have no status
UPDATE public.tasks SET status = 'To Do' WHERE status IS NULL;

-- 3. Allow sprint_id to be NULL (backlog items have no sprint)
--    sprint_id already exists and references sprints(id) — make it nullable
ALTER TABLE public.tasks ALTER COLUMN sprint_id DROP NOT NULL;

-- 4. Add QA role to profiles constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'MANAGEMENT', 'DEV', 'DEV_LEAD', 'QA'));

-- 5. Add QA role to pending_invitations constraint
ALTER TABLE public.pending_invitations DROP CONSTRAINT IF EXISTS pending_invitations_role_check;
ALTER TABLE public.pending_invitations ADD CONSTRAINT pending_invitations_role_check
  CHECK (role IN ('SUPER_ADMIN', 'BD', 'BA', 'PM', 'MANAGEMENT', 'DEV', 'DEV_LEAD', 'QA'));

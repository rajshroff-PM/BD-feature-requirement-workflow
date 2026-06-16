-- ============================================================
-- Migration: Update Tasks Status Check
-- Adds 'Code Review' and 'QA' to the tasks_status_check constraint
-- ============================================================

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('Backlog', 'To Do', 'In Progress', 'Code Review', 'QA', 'Done'));

-- Add new fields for bug tickets
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS bug_platforms TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bug_devices TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS bug_os_versions TEXT[] DEFAULT '{}';

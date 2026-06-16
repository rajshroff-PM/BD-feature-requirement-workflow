-- Add assignees array to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignees uuid[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS code_reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS qa_tester_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- We are dropping dev_team to force alignment with profiles
DROP TABLE IF EXISTS dev_team CASCADE;

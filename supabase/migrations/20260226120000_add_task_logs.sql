-- Migration: Add task_logs table for tracking task changes

CREATE TABLE IF NOT EXISTS task_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id text REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    action_type text NOT NULL CHECK (action_type IN ('update_field', 'log_time')),
    field_name text,
    old_value text,
    new_value text,
    logged_amount text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "task_logs viewable by authenticated users" 
ON task_logs FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "task_logs insertable by authenticated users" 
ON task_logs FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Add time tracking columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS estimated_time text,
ADD COLUMN IF NOT EXISTS logged_time text;

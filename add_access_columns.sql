-- Add access control columns for modular access
ALTER TABLE profiles ADD COLUMN access_sprint_planner BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN access_capacity_tracker BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN access_analytics BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN can_create_sprints BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN can_create_tasks BOOLEAN DEFAULT true;

-- Update existing default access based on roles
UPDATE profiles 
SET access_capacity_tracker = true, 
    access_analytics = true,
    can_create_sprints = true
WHERE role IN ('PM', 'SUPER_ADMIN', 'MANAGEMENT');

UPDATE profiles
SET access_capacity_tracker = true
WHERE role = 'DEV_LEAD';

-- Ensure everyone can access sprint planner as a baseline
UPDATE profiles SET access_sprint_planner = true;

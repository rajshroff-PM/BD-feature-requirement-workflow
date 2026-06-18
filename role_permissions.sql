-- Enable RLS and setup table
CREATE TABLE role_permissions (
    role text PRIMARY KEY,
    view_sprint_planner boolean DEFAULT true,
    view_capacity_tracker boolean DEFAULT false,
    view_analytics boolean DEFAULT false,
    view_products boolean DEFAULT false,
    view_team boolean DEFAULT false,
    view_admin_dashboard boolean DEFAULT false,
    view_access_management boolean DEFAULT false,
    create_sprints boolean DEFAULT false,
    edit_sprints boolean DEFAULT false,
    delete_sprints boolean DEFAULT false,
    create_tickets boolean DEFAULT true,
    file_bugs boolean DEFAULT false,
    edit_tickets boolean DEFAULT true,
    delete_tickets boolean DEFAULT false
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Role permissions are viewable by everyone" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "Role permissions can be updated by authenticated users" ON role_permissions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Role permissions can be inserted by authenticated users" ON role_permissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- Insert default roles
INSERT INTO role_permissions (role, view_sprint_planner, view_capacity_tracker, view_analytics, view_products, view_team, view_admin_dashboard, view_access_management, create_sprints, edit_sprints, delete_sprints, create_tickets, file_bugs, edit_tickets, delete_tickets) VALUES
('SUPER_ADMIN', true, true, true, true, true, true, true, true, true, true, true, true, true, true),
('PM', true, true, true, true, true, true, true, true, true, true, true, true, true, true),
('MANAGEMENT', true, true, true, true, true, true, false, true, true, false, true, true, true, false),
('DEV_LEAD', true, true, false, false, true, false, false, true, true, false, true, false, true, false),
('DEV', true, false, false, false, true, false, false, false, false, false, true, false, true, false),
('QA', true, false, false, false, false, false, false, false, false, false, false, true, true, false),
('BA', true, false, false, true, false, false, false, false, false, false, true, false, true, false),
('BD', true, false, false, false, false, false, false, false, false, false, true, false, true, false)
ON CONFLICT (role) DO NOTHING;

-- Also, clean up the previously added columns from profiles if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='access_sprint_planner') THEN
        ALTER TABLE profiles DROP COLUMN access_sprint_planner;
        ALTER TABLE profiles DROP COLUMN access_capacity_tracker;
        ALTER TABLE profiles DROP COLUMN access_analytics;
        ALTER TABLE profiles DROP COLUMN can_create_sprints;
        ALTER TABLE profiles DROP COLUMN can_create_tasks;
    END IF;
END $$;

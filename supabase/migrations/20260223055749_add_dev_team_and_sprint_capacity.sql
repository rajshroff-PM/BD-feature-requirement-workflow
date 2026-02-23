-- Create dev_team table
CREATE TABLE IF NOT EXISTS dev_team (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  name text NOT NULL,
  role text
);

-- Add team_members JSONB column to sprints table
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS team_members jsonb;

-- Enable RLS for dev_team
ALTER TABLE dev_team ENABLE ROW LEVEL SECURITY;

-- Add Dev Team policies
CREATE POLICY "Public dev_team viewable by everyone" ON dev_team FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert dev_team" ON dev_team FOR ALL USING (auth.role() = 'authenticated');

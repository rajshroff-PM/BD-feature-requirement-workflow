-- RUN THIS FIRST TO WIPE THE OLD TABLES:
drop table if exists tasks cascade;
drop table if exists sprints cascade;

-- THEN RE-RUN THE ORIGINAL CREATION SCRIPT:
-- 1. SPRINTS TABLE
create table sprints (
  id text primary key, -- e.g. "SPRINT-1" or timestamp based
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  goal text,
  start_date date,
  end_date date,
  capacity numeric,
  status text check (status in ('Active', 'Planned', 'Completed'))
);

-- 2. TASKS TABLE
create table tasks (
  id text primary key, -- e.g. "TASK-12345"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sprint_id text references sprints(id) on delete cascade not null,
  ticket_id text, -- references tickets(id) if needed, using text for now to match interface
  title text not null,
  assignee text,
  start_date date,
  end_date date,
  effort numeric,
  status text check (status in ('To Do', 'In Progress', 'Done'))
);

-- 3. ENABLE ROW LEVEL SECURITY
alter table sprints enable row level security;
alter table tasks enable row level security;

-- 4. POLICIES
-- Allow full access to authenticated users for now
create policy "Authenticated users can do all on sprints" on sprints for all using ( auth.role() = 'authenticated' );
create policy "Authenticated users can do all on tasks" on tasks for all using ( auth.role() = 'authenticated' );

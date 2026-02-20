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
-- Fully open select capabilities to all users reading the board, just as tickets do.
create policy "Sprints are viewable by everyone" on sprints for select using ( true );
create policy "Tasks are viewable by everyone" on tasks for select using ( true );

-- Restrict insertions, updates, and deletes to authenticated accounts (e.g. BD/BA/PM/Dev).
create policy "Authenticated users can insert sprints" on sprints for insert with check ( auth.role() = 'authenticated' );
create policy "Authenticated users can update sprints" on sprints for update using ( auth.role() = 'authenticated' );
create policy "Authenticated users can delete sprints" on sprints for delete using ( auth.role() = 'authenticated' );

create policy "Authenticated users can insert tasks" on tasks for insert with check ( auth.role() = 'authenticated' );
create policy "Authenticated users can update tasks" on tasks for update using ( auth.role() = 'authenticated' );
create policy "Authenticated users can delete tasks" on tasks for delete using ( auth.role() = 'authenticated' );

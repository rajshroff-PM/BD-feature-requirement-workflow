-- Drop existing policies if they match to avoid duplicates
drop policy if exists "Authenticated users can do all on sprints" on sprints;
drop policy if exists "Authenticated users can do all on tasks" on tasks;

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

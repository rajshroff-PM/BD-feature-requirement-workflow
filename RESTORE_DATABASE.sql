-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Extends Auth)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('BD', 'BA', 'PM', 'DEV')),
  avatar_url text,
  updated_at timestamp with time zone
);

-- 1.5. DEV TEAM TABLE
create table dev_team (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  role text
);

-- 2. TICKETS TABLE 
create table tickets (
  id text primary key, -- e.g. "REQ-001"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references profiles(id),
  
  -- Core Info
  title text not null,
  request_type text check (request_type in ('New', 'Enhancement')),
  
  -- BD Fields
  source text,
  problem text,
  value text,
  severity text check (severity in ('Critical', 'High', 'Medium', 'Low')),
  requested_date date,

  -- BA Fields
  ba_status text default 'Pending',
  srs_link text,
  analysis text,

  -- PM Fields
  pm_status text default 'Pending',
  product_alignment text,
  tech_impact_backend text,
  tech_impact_mobile text,
  situm_dependency text,
  effort text,
  risk_level text,
  sprint_cycle text,

  -- Dev Fields
  dev_status text default 'Pending',
  delivery_date date,
  dev_comments text
);

-- 3. ENABLE ROW LEVEL SECURITY
alter table profiles enable row level security;
alter table tickets enable row level security;

-- 4. POLICIES (Simple for now, can be refined later)
-- Allow read access to everyone for now (authenticated)
create policy "Public profiles are viewable by everyone" on profiles for select using ( true );
create policy "Public dev_team viewable by everyone" on dev_team for select using ( true );
create policy "Tickets are viewable by everyone" on tickets for select using ( true );

-- Insert access
create policy "Users can insert their own profile" on profiles for insert with check ( auth.uid() = id );
create policy "Authenticated users can insert dev_team" on dev_team for all using ( auth.role() = 'authenticated' );
create policy "Authenticated users can insert tickets" on tickets for insert with check ( auth.role() = 'authenticated' );

-- Update access (simplified for prototype)
create policy "Users can update tickets" on tickets for update using ( auth.role() = 'authenticated' );

-- 5. TRIGGER to auto-create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
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
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS design_reference_link text;
-- Add time tracking columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS estimated_time text,
ADD COLUMN IF NOT EXISTS logged_time text;
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


-- Add Product Owner columns to the tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS po_status VARCHAR(50) DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS po_overview TEXT;

-- Update existing records to have a 'Pending' po_status if they don't already
UPDATE public.tickets SET po_status = 'Pending' WHERE po_status IS NULL;
-- Modify the handle_new_user function if it restricts roles, making sure 'PO' passes.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'BD')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely drop any check constraint on profiles.role that might reject 'PO', then add it back including 'PO'
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.profiles'::regclass
      AND a.attname = 'role'
      AND c.contype = 'c'
    LIMIT 1;
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
        EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT ' || quote_ident(constraint_name) || ' CHECK (role IN (''BD'', ''BA'', ''PM'', ''DEV'', ''PO''))';
    END IF;
END;
$$;
ALTER TABLE tasks ADD COLUMN description TEXT;
-- 1. PRODUCTS TABLE
create table products (
  id text primary key, -- e.g. "PROD-1"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  icon text
);

-- 2. FEATURES TABLE
create table features (
  id text primary key, -- e.g. "FEAT-1"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  product_id text references products(id) on delete cascade not null,
  name text not null,
  description text,
  srs_link text
);

-- 3. ENABLE ROW LEVEL SECURITY
alter table products enable row level security;
alter table features enable row level security;

-- 4. POLICIES
create policy "Authenticated users can do all on products" on products for all using ( auth.role() = 'authenticated' );
create policy "Authenticated users can do all on features" on features for all using ( auth.role() = 'authenticated' );
-- Add design reference columns to features table
ALTER TABLE features ADD COLUMN IF NOT EXISTS design_reference_link TEXT;
ALTER TABLE features ADD COLUMN IF NOT EXISTS design_reference_images TEXT[];

-- Create storage bucket for attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public access to view attachments
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');
-- Add pending_deletion_at column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS pending_deletion_at TIMESTAMP WITH TIME ZONE;
-- Modify the handle_new_user function to stop automatically assigning 'BD'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- The public.profiles table likely references auth.users(id). 
-- When removing a user in the dashboard, PostgreSQL blocks it because their profile still exists.
-- We must update the foreign key constraint to ON DELETE CASCADE.

DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find the foreign key constraint connecting profiles.id to auth.users.id
    SELECT c.conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t1 ON c.conrelid = t1.oid
    JOIN pg_class t2 ON c.confrelid = t2.oid
    WHERE t1.relname = 'profiles' AND t2.relname = 'users' AND c.contype = 'f';

    IF constraint_name IS NOT NULL THEN
        -- Drop the existing constraint
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
        
        -- Re-add it with ON DELETE CASCADE
        EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT ' || quote_ident(constraint_name) || 
                ' FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE';
    ELSE
        -- If for some reason it wasn't named or found, just explicitly try to add it
        -- (This might fail if the constraint exists under an unknown situation, but usually it finds it)
        BEGIN
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore if it somehow exists
        END;
    END IF;
END;
$$;
-- The profiles table was missing an UPDATE policy, causing "Failed to save role" 
-- because upsert tries to UPDATE the row created by the handle_new_user trigger.

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);
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

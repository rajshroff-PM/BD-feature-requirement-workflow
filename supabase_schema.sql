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
create policy "Tickets are viewable by everyone" on tickets for select using ( true );

-- Insert access
create policy "Users can insert their own profile" on profiles for insert with check ( auth.uid() = id );
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

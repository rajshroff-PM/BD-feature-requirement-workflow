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

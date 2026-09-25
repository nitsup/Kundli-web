create extension if not exists "pgcrypto";

create type public.app_role as enum ('user', 'pandit', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'user',
  language text not null default 'en',
  timezone text not null default 'Asia/Kolkata',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  time_of_birth time not null,
  birth_time_accuracy text not null check (birth_time_accuracy in ('exact', 'approximate', 'unknown')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null default 'Asia/Kolkata',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pandits (
  id uuid primary key references public.profiles(id) on delete cascade,
  experience_years integer,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  pandit_id uuid not null references public.pandits(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  report_type text not null,
  related_birth_profile_id uuid references public.birth_profiles(id),
  related_client_id uuid references public.clients(id),
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null,
  plan text not null default 'free',
  allowance integer not null default 0,
  used_count integer not null default 0,
  billing_period_start timestamptz not null default now(),
  billing_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  resource_type text,
  resource_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.birth_profiles enable row level security;
alter table public.pandits enable row level security;
alter table public.clients enable row level security;
alter table public.reports enable row level security;
alter table public.ai_usage enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles are viewable by owner or admin" on public.profiles
for select using (
  auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "Profiles are editable by owner or admin" on public.profiles
for update using (
  auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "Birth profiles are viewable by owner" on public.birth_profiles
for select using (auth.uid() = owner_id);

create policy "Birth profiles are editable by owner" on public.birth_profiles
for update using (auth.uid() = owner_id);

create policy "Birth profiles are insertable by owner" on public.birth_profiles
for insert with check (auth.uid() = owner_id);

create policy "Pandit records are limited to their own profile or admin" on public.pandits
for select using (
  auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "Clients are visible to their pandit or admin" on public.clients
for select using (
  exists (
    select 1 from public.pandits p where p.id = auth.uid() and p.id = pandit_id
  ) or exists (
    select 1 from public.profiles pp where pp.id = auth.uid() and pp.role = 'admin'
  )
);

create policy "Clients are editable by their pandit or admin" on public.clients
for update using (
  exists (
    select 1 from public.pandits p where p.id = auth.uid() and p.id = pandit_id
  ) or exists (
    select 1 from public.profiles pp where pp.id = auth.uid() and pp.role = 'admin'
  )
);

create policy "Reports are scoped to owner and pandit-client chain" on public.reports
for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.clients c
    join public.pandits p on p.id = c.pandit_id
    where c.id = related_client_id and p.id = auth.uid()
  ) or exists (
    select 1 from public.profiles pp where pp.id = auth.uid() and pp.role = 'admin'
  )
);

create policy "AI usage is visible only to owner or admin" on public.ai_usage
for select using (
  auth.uid() = owner_id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "Audit log access is admin-only" on public.audit_logs
for select using (
  exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
);

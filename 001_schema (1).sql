-- UDSM Campus Navigator: schema + Row Level Security
create extension if not exists pg_trgm;

create type app_role as enum ('user','editor','admin');
create type report_status as enum ('pending','approved','rejected');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role app_role not null default 'user',
  language text not null default 'en' check (language in ('en','sw')),
  created_at timestamptz not null default now()
);

create table categories (
  id serial primary key,
  slug text unique not null,
  name_en text not null,
  name_sw text not null,
  icon text
);

create table path_nodes (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  category_id int references categories(id),
  name text not null,
  abbreviation text,
  description text,
  campus_area text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  node_id uuid references path_nodes(id),
  opening_hours text,
  accessibility text,
  keywords text[] default '{}',
  verified boolean not null default false,
  published boolean not null default false,
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);
create index on locations using gin (name gin_trgm_ops);
create index on locations using gin (keywords);

create table buildings (
  location_id uuid primary key references locations(id) on delete cascade,
  floors int
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(location_id) on delete cascade,
  room_number text not null,
  name text,
  floor int,
  capacity int,
  verified boolean not null default false
);
create index on rooms using gin (room_number gin_trgm_ops);

create table facilities (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  label text not null
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  storage_path text not null,
  caption text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table pathways (
  id uuid primary key default gen_random_uuid(),
  from_node uuid not null references path_nodes(id) on delete cascade,
  to_node uuid not null references path_nodes(id) on delete cascade,
  geometry jsonb,
  length_m double precision not null,
  verified boolean not null default false
);

create table navigation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  from_label text,
  to_location_id uuid references locations(id),
  created_at timestamptz not null default now()
);

create table user_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  location_id uuid references locations(id) on delete set null,
  kind text not null check (kind in ('missing_building','wrong_room','moved','old_photo','path_update')),
  message text not null check (char_length(message) between 5 and 2000),
  lat double precision, lng double precision,
  status report_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table admin_activity (
  id bigserial primary key,
  admin_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id text,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create function has_role(r app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = any(r));
$$;

do $$ declare t text; begin
  foreach t in array array['profiles','categories','locations','buildings','rooms','facilities','photos',
    'path_nodes','pathways','navigation_history','user_reports','admin_activity'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create policy "own profile read" on profiles for select using (id = auth.uid() or has_role('{admin}'));
create policy "own profile update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "admin manages profiles" on profiles for all using (has_role('{admin}'));

create policy "read categories" on categories for select using (true);
create policy "admin write categories" on categories for all using (has_role('{admin}'));

create policy "read published locations" on locations for select using (published or has_role('{editor,admin}'));
create policy "staff write locations" on locations for all
  using (has_role('{editor,admin}')) with check (has_role('{editor,admin}'));

do $$ declare t text; begin
  foreach t in array array['buildings','rooms','facilities','photos','path_nodes'] loop
    execute format('create policy "read %1$s" on %1$s for select using (true)', t);
    execute format('create policy "staff write %1$s" on %1$s for all using (has_role(''{editor,admin}'')) with check (has_role(''{editor,admin}''))', t);
  end loop;
end $$;

create policy "read verified paths" on pathways for select using (verified or has_role('{editor,admin}'));
create policy "staff write paths" on pathways for all using (has_role('{editor,admin}'));

create policy "own history" on navigation_history for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "submit report" on user_reports for insert with check (auth.uid() = user_id and status = 'pending');
create policy "read own reports" on user_reports for select using (user_id = auth.uid() or has_role('{editor,admin}'));
create policy "staff review reports" on user_reports for update using (has_role('{editor,admin}'));

create policy "admin reads activity" on admin_activity for select using (has_role('{admin}'));
create policy "staff logs activity" on admin_activity for insert with check (has_role('{editor,admin}') and admin_id = auth.uid());

-- Storage (run separately): bucket "location-photos", public read, staff-only upload
-- insert into storage.buckets (id, name, public) values ('location-photos','location-photos',true);
-- create policy "staff upload photos" on storage.objects for insert
--   with check (bucket_id='location-photos' and has_role('{editor,admin}'));

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  root_node_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  mind_map_id uuid not null references public.mind_maps(id) on delete cascade,
  parent_node_id uuid references public.nodes(id) on delete set null,
  label text not null default '',
  notes text,
  pos_x double precision not null default 0,
  pos_y double precision not null default 0,
  color text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.edges (
  id uuid primary key default gen_random_uuid(),
  mind_map_id uuid not null references public.mind_maps(id) on delete cascade,
  source_node_id uuid not null references public.nodes(id) on delete cascade,
  target_node_id uuid not null references public.nodes(id) on delete cascade,
  label text,
  edge_type text not null default 'default',
  created_at timestamptz not null default now(),
  constraint edges_no_self_loop check (source_node_id <> target_node_id)
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.nodes(id) on delete cascade,
  mind_map_id uuid not null references public.mind_maps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_bucket text not null default 'mindmap-media',
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text not null,
  file_size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds numeric(10,2),
  preview_image_path text,
  created_at timestamptz not null default now()
);

alter table public.mind_maps
  drop constraint if exists mind_maps_root_node_fk;

alter table public.mind_maps
  add constraint mind_maps_root_node_fk
  foreign key (root_node_id) references public.nodes(id) on delete set null;

create index if not exists idx_mind_maps_user_id on public.mind_maps(user_id);
create index if not exists idx_nodes_mind_map_id on public.nodes(mind_map_id);
create index if not exists idx_nodes_parent_node_id on public.nodes(parent_node_id);
create index if not exists idx_edges_mind_map_id on public.edges(mind_map_id);
create index if not exists idx_edges_source_node_id on public.edges(source_node_id);
create index if not exists idx_edges_target_node_id on public.edges(target_node_id);
create index if not exists idx_media_node_id on public.media(node_id);
create index if not exists idx_media_mind_map_id on public.media(mind_map_id);
create index if not exists idx_media_user_id on public.media(user_id);

alter table public.profiles enable row level security;
alter table public.mind_maps enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;
alter table public.media enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "mind_maps_own_all" on public.mind_maps;
drop policy if exists "nodes_own_all" on public.nodes;
drop policy if exists "edges_own_all" on public.edges;
drop policy if exists "media_own_all" on public.media;

create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id);

create policy "mind_maps_own_all"
on public.mind_maps for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "nodes_own_all"
on public.nodes for all
using (
  exists (
    select 1 from public.mind_maps mm
    where mm.id = mind_map_id
      and mm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.mind_maps mm
    where mm.id = mind_map_id
      and mm.user_id = auth.uid()
  )
);

create policy "edges_own_all"
on public.edges for all
using (
  exists (
    select 1 from public.mind_maps mm
    where mm.id = mind_map_id
      and mm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.mind_maps mm
    where mm.id = mind_map_id
      and mm.user_id = auth.uid()
  )
);

create policy "media_own_all"
on public.media for all
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.mind_maps mm
    where mm.id = mind_map_id
      and mm.user_id = auth.uid()
  )
);
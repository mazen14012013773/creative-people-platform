create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

do $$
begin
  create type public.user_role as enum ('Freelancer', 'Admin');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.report_status as enum ('Pending', 'Resolved');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.profile_event_type as enum ('View', 'WhatsAppClick');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  email citext not null unique,
  password_hash text not null,
  phone text,
  whatsapp_number text,
  role public.user_role not null default 'Freelancer',
  bio text,
  title text,
  location text,
  min_budget numeric(12, 2) check (min_budget is null or min_budget >= 0),
  hourly_rate numeric(12, 2) check (hourly_rate is null or hourly_rate >= 0),
  avatar_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.user_skills (
  user_id uuid not null references public.users (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  primary key (user_id, skill_id)
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  project_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.users (id) on delete cascade,
  client_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.users (id) on delete cascade,
  reason text not null,
  status public.report_status not null default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.profile_events (
  id bigint generated always as identity primary key,
  freelancer_id uuid not null references public.users (id) on delete cascade,
  event_type public.profile_event_type not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 120),
  message text not null check (char_length(trim(message)) between 3 and 1000),
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_active
  on public.notifications (is_active, created_at desc);

create index if not exists idx_users_discovery
  on public.users (is_active, is_featured desc, created_at desc);

create index if not exists idx_users_location
  on public.users (location);

create index if not exists idx_users_min_budget
  on public.users (min_budget);

create index if not exists idx_users_name_trgm
  on public.users using gin (name gin_trgm_ops);

create index if not exists idx_users_title_trgm
  on public.users using gin (title gin_trgm_ops);

create index if not exists idx_users_bio_trgm
  on public.users using gin (bio gin_trgm_ops);

create index if not exists idx_skills_name_trgm
  on public.skills using gin (name gin_trgm_ops);

create index if not exists idx_user_skills_skill
  on public.user_skills (skill_id);

create index if not exists idx_portfolio_user
  on public.portfolio_items (user_id, created_at desc);

create index if not exists idx_reviews_freelancer
  on public.reviews (freelancer_id, created_at desc);

create index if not exists idx_reports_status
  on public.reports (status, created_at desc);

create index if not exists idx_reports_freelancer
  on public.reports (freelancer_id);

create index if not exists idx_profile_events_freelancer
  on public.profile_events (freelancer_id, event_type, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;

create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create or replace view public.freelancer_stats as
select
  u.id as freelancer_id,
  coalesce(r.review_count, 0)::integer as review_count,
  coalesce(round(r.avg_rating, 2), 0)::numeric(3, 2) as avg_rating,
  coalesce(v.view_count, 0)::integer as view_count,
  coalesce(w.click_count, 0)::integer as whatsapp_click_count
from public.users u
left join (
  select freelancer_id, count(*) as review_count, avg(rating)::numeric as avg_rating
  from public.reviews
  group by freelancer_id
) r on r.freelancer_id = u.id
left join (
  select freelancer_id, count(*) as view_count
  from public.profile_events
  where event_type = 'View'
  group by freelancer_id
) v on v.freelancer_id = u.id
left join (
  select freelancer_id, count(*) as click_count
  from public.profile_events
  where event_type = 'WhatsAppClick'
  group by freelancer_id
) w on w.freelancer_id = u.id;

alter table public.users enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.profile_events enable row level security;

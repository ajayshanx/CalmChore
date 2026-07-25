-- Calm Chore: initial schema
create extension if not exists "pgcrypto";

create type accent_colour as enum ('blue','red','purple','orange','gold','teal');
create type recurrence_type as enum ('none','daily','weekly','monthly','manual');
create type assignment_type as enum ('single','multi');
create type chore_status as enum ('active','inactive');
create type execution_status as enum ('unassigned','assigned','accepted','unverified','incomplete','verified_complete','verified_partially_complete');
create type freeze_status as enum ('auto_applied','approved','pending','declined');
create type break_status as enum ('active','cancelled');
create type redemption_category as enum ('grocery','purchases','eating_out','screen_time','cash','other');
create type redemption_status as enum ('pending','approved','rejected');
create type friendship_status as enum ('pending','approved');
create type ledger_type as enum ('chore_award','weekly_streak_bonus','redemption_debit','manual_adjustment');
create type age_group as enum ('2-3','4-6','7-11','12+');
create type feedback_actor as enum ('parent','child');

-- Families: the shared account a parent (or parents) and their children belong to
create table families (
  id uuid primary key default gen_random_uuid(),
  timezone text not null default 'UTC', -- IANA name; family's timezone of record for day/week boundaries
  created_at timestamptz not null default now()
);

-- Parents: 1:1 with Supabase auth.users
create table parents (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  status text not null default 'active' check (status in ('invited','active')),
  invited_by uuid references parents(id),
  created_at timestamptz not null default now()
);
create index parents_family_idx on parents(family_id);

-- Consent acceptances: T&C acceptance history per parent (earliest row = "first accepted")
create table consent_acceptances (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete cascade,
  version text not null,
  accepted_at timestamptz not null default now()
);
create index consent_parent_idx on consent_acceptances(parent_id, accepted_at);

-- Children
create table children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  username text unique,
  passcode_hash text,
  nickname text unique,
  accent_colour accent_colour,
  is_parent_managed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint children_login_fields check (
    is_parent_managed = true or (username is not null and passcode_hash is not null)
  )
);
create index children_family_idx on children(family_id);
create unique index children_colour_per_family on children(family_id, accent_colour) where accent_colour is not null;

-- Example Chores: fixed curated reference content shown in Chore Ideas (not user-submitted)
create table example_chores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  info text,
  age_group age_group not null,
  feels_like_minutes int,
  suggested_points int
);

-- Chores: family-owned chore definitions
create table chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  created_by_parent_id uuid references parents(id),
  name text not null,
  info text,
  points int not null check (points > 0),
  requires_proof boolean not null default false,
  assignment_type assignment_type not null default 'single',
  recurrence_type recurrence_type not null default 'none',
  recurrence_end_date date,
  recurrence_count int,
  status chore_status not null default 'active',
  like_count int not null default 0,
  has_schedule boolean not null default false,
  created_at timestamptz not null default now()
);
create index chores_family_idx on chores(family_id);
create index chores_ideas_idx on chores(has_schedule, like_count desc);

-- Chore instances: scheduled occurrences of a chore
create table chore_instances (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references chores(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time,
  deadline_at timestamptz,
  points int not null,
  created_at timestamptz not null default now()
);
create index chore_instances_chore_idx on chore_instances(chore_id, scheduled_date);

-- Chore assignments: one row per child executing a given instance
create table chore_assignments (
  id uuid primary key default gen_random_uuid(),
  chore_instance_id uuid not null references chore_instances(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  status execution_status not null default 'assigned',
  accepted_at timestamptz,
  proof_photo_url text,
  submitted_at timestamptz,
  awarded_points int,
  incomplete_reason text,
  validated_at timestamptz,
  validated_by_parent_id uuid references parents(id),
  created_at timestamptz not null default now(),
  unique (chore_instance_id, child_id)
);
create index chore_assignments_child_idx on chore_assignments(child_id, status);

-- Chore freezes
create table chore_freezes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  freeze_from date not null,
  freeze_to date not null,
  reason text,
  status freeze_status not null default 'pending',
  requested_at timestamptz default now(),
  decided_by_parent_id uuid references parents(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (freeze_to >= freeze_from)
);
create index chore_freezes_child_idx on chore_freezes(child_id, status);

-- Chore breaks
create table chore_breaks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_by_parent_id uuid references parents(id),
  status break_status not null default 'active',
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create table chore_break_children (
  chore_break_id uuid not null references chore_breaks(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  primary key (chore_break_id, child_id)
);

-- Points ledger (Points History)
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  delta int not null,
  type ledger_type not null,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index points_ledger_child_idx on points_ledger(child_id, created_at);

-- Streak tracking (tier/level derived at read time from current_streak_days)
create table child_streaks (
  child_id uuid primary key references children(id) on delete cascade,
  current_streak_days int not null default 0,
  last_counted_date date,
  streak_started_date date,
  updated_at timestamptz not null default now()
);

-- Redemption requests
create table redemption_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  category redemption_category not null,
  request_details jsonb not null default '{}',
  status redemption_status not null default 'pending',
  points_used int,
  rejection_reason text,
  decided_by_parent_id uuid references parents(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index redemption_child_idx on redemption_requests(child_id, status);

-- Friendships
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_child_id uuid not null references children(id) on delete cascade,
  addressee_child_id uuid not null references children(id) on delete cascade,
  status friendship_status not null default 'pending',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by_parent_id uuid references parents(id),
  check (requester_child_id <> addressee_child_id),
  unique (requester_child_id, addressee_child_id)
);
create index friendships_addressee_idx on friendships(addressee_child_id, status);
create index friendships_requester_idx on friendships(requester_child_id, status);

-- Feedback
create table feedback (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  submitted_by_type feedback_actor not null,
  submitted_by_parent_id uuid references parents(id),
  submitted_by_child_id uuid references children(id),
  message text not null,
  created_at timestamptz not null default now()
);

-- Notification preferences (per action, per parent or per child)
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  parent_id uuid references parents(id),
  child_id uuid references children(id),
  action text not null,
  channel_inapp boolean not null default true,
  channel_email boolean not null default false,
  check ((parent_id is not null) <> (child_id is not null))
);
create unique index notif_pref_unique_parent on notification_preferences(parent_id, action) where parent_id is not null;
create unique index notif_pref_unique_child on notification_preferences(child_id, action) where child_id is not null;

-- Chore likes (drives "Most Popular" in Chore Ideas from other families)
create table chore_likes (
  chore_id uuid not null references chores(id) on delete cascade,
  parent_id uuid not null references parents(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chore_id, parent_id)
);

-- Triggers: keep chores.has_schedule and chores.like_count in sync
create or replace function update_chore_has_schedule() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update chores set has_schedule = true where id = NEW.chore_id;
  elsif TG_OP = 'DELETE' then
    update chores set has_schedule = exists(select 1 from chore_instances where chore_id = OLD.chore_id) where id = OLD.chore_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_chore_instances_has_schedule
after insert or delete on chore_instances
for each row execute function update_chore_has_schedule();

create or replace function update_chore_like_count() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update chores set like_count = like_count + 1 where id = NEW.chore_id;
  elsif TG_OP = 'DELETE' then
    update chores set like_count = like_count - 1 where id = OLD.chore_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_chore_likes_count
after insert or delete on chore_likes
for each row execute function update_chore_like_count();

-- Selah API schema. Idempotent: safe to run on every deploy.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  display_name text not null default 'Friend',
  friend_code text unique not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Mutual friendship: linking inserts both (a,b) and (b,a).
create table if not exists friendships (
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- One current reading-progress snapshot per user (what friends see).
create table if not exists progress (
  user_id uuid primary key references users(id) on delete cascade,
  plan_title text,
  plan_duration_days int,
  completed_days int,
  read_streak int,
  last_active_day text,
  updated_at timestamptz not null default now()
);

-- Full-app backups; the API keeps only the most recent N per user.
create table if not exists backups (
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null,
  primary key (user_id, created_at)
);

-- Private-Pay — Neon Postgres schema (replaces Supabase).
-- Mirrors the tables the previous Supabase project exposed, minus RLS:
-- access control now lives server-side in api/db.js.

create extension if not exists "pgcrypto";

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  username       text unique,
  created_at     timestamptz not null default now()
);

create table if not exists payment_links (
  id             uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  username       text,
  alias          text not null unique,
  created_at     timestamptz not null default now()
);

create table if not exists payments (
  id                 uuid primary key default gen_random_uuid(),
  sender_address     text,
  recipient_username text,
  amount             numeric(38, 18) not null,
  currency           text not null default 'BOT',
  tx_hash            text,
  status             text not null default 'completed',
  created_at         timestamptz not null default now()
);

create table if not exists balances (
  id                  uuid primary key default gen_random_uuid(),
  username            text unique,
  wallet_address      text unique,
  eth_balance         numeric(38, 18) not null default 0, -- BOT
  usdc_balance        numeric(38, 18) not null default 0, -- USDT
  sepolia_eth_balance numeric(38, 18) not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists user_points (
  id              uuid primary key default gen_random_uuid(),
  wallet_address  text not null unique,
  total_points    integer not null default 0,
  lifetime_points integer not null default 0,
  level           integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists points_config (
  id           uuid primary key default gen_random_uuid(),
  action_type  text not null unique,
  points_value integer not null default 0,
  description  text,
  is_active    boolean not null default true
);

create table if not exists point_transactions (
  id                     uuid primary key default gen_random_uuid(),
  wallet_address         text not null,
  action_type            text not null,
  points                 integer not null default 0,
  description            text,
  related_payment_id     uuid,
  related_payment_link_id uuid,
  metadata               jsonb,
  created_at             timestamptz not null default now()
);


create index if not exists payments_recipient_idx on payments (recipient_username);
create index if not exists payments_sender_idx    on payments (sender_address);
create index if not exists payments_created_idx   on payments (created_at desc);
create index if not exists links_wallet_idx       on payment_links (wallet_address);
create index if not exists point_tx_wallet_idx    on point_transactions (wallet_address, created_at desc);

-- Replaces the Supabase `award_points` RPC.
create or replace function award_points(
  p_wallet_address text,
  p_action_type    text,
  p_description    text default null,
  p_related_payment_id uuid default null,
  p_related_payment_link_id uuid default null,
  p_metadata       jsonb default null
) returns integer
language plpgsql
as $$
declare
  v_points integer;
  v_total  integer;
begin
  select points_value into v_points
    from points_config
   where action_type = p_action_type and is_active
   limit 1;

  if v_points is null then
    return 0;
  end if;

  insert into user_points (wallet_address, total_points, lifetime_points, level)
       values (p_wallet_address, v_points, v_points, 1)
  on conflict (wallet_address) do update
      set total_points    = user_points.total_points + v_points,
          lifetime_points = user_points.lifetime_points + v_points,
          level           = greatest(1, ((user_points.lifetime_points + v_points) / 1000) + 1),
          updated_at      = now()
  returning total_points into v_total;

  insert into point_transactions (
    wallet_address, action_type, points, description,
    related_payment_id, related_payment_link_id, metadata
  ) values (
    p_wallet_address, p_action_type, v_points, p_description,
    p_related_payment_id, p_related_payment_link_id, p_metadata
  );

  return v_points;
end;
$$;

-- ENS profile cache (was written directly by the browser via the Supabase client).
alter table users add column if not exists ens_name   text;
alter table users add column if not exists ens_avatar text;
create index if not exists users_ens_name_idx on users (lower(ens_name));
create index if not exists links_username_idx on payment_links (username);

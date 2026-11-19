-- Ultimate Football Manager 3D — Phase 53A: economy on the server (foundation).
--
-- Run ONCE in Supabase → SQL Editor → New query → paste everything → Run,
-- after the Phase 50–52 files. Running it again is harmless.
--
-- What it adds:
--   - economy_states: each player's EP / items / cards (club + squad) as kept
--     by the server. Players can READ their own row but never write it: only the
--     Edge Function `economy` writes (it connects to the database directly).
--   - economy_log: one line per economy action (who, what, EP before / after).
--   - app_settings: game-wide switches; economy_mode stays 'off' until Phase 53D
--     (the game then sends every EP / card action to the server).

-- =====================================================================
-- 1. Server copy of each player's economy
-- =====================================================================
create table if not exists public.economy_states (
    user_id     uuid primary key references auth.users (id) on delete cascade,
    club        jsonb not null,
    roster      jsonb not null,
    revision    bigint not null default 1,
    imported_at timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint economy_states_club_object check (jsonb_typeof(club) = 'object'),
    constraint economy_states_roster_array check (jsonb_typeof(roster) = 'array'),
    constraint economy_states_size check (pg_column_size(club) + pg_column_size(roster) < 3000000)
);

alter table public.economy_states enable row level security;
revoke all on table public.economy_states from anon, authenticated;
grant select on table public.economy_states to authenticated;

drop policy if exists economy_states_select_own on public.economy_states;
create policy economy_states_select_own on public.economy_states
    for select to authenticated
    using ((select auth.uid()) = user_id or (select public.is_developer()));

-- =====================================================================
-- 2. Action log
-- =====================================================================
create table if not exists public.economy_log (
    id         bigserial primary key,
    user_id    uuid not null references auth.users (id) on delete cascade,
    action     text not null,
    ep_before  bigint,
    ep_after   bigint,
    detail     jsonb,
    created_at timestamptz not null default now()
);

create index if not exists economy_log_user_time on public.economy_log (user_id, created_at desc);

alter table public.economy_log enable row level security;
revoke all on table public.economy_log from anon, authenticated;
grant select on table public.economy_log to authenticated;

drop policy if exists economy_log_select_own on public.economy_log;
create policy economy_log_select_own on public.economy_log
    for select to authenticated
    using ((select auth.uid()) = user_id or (select public.is_developer()));

-- =====================================================================
-- 3. Game-wide settings
-- =====================================================================
create table if not exists public.app_settings (
    key        text primary key,
    value      jsonb not null,
    updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values ('economy_mode', '"off"') on conflict (key) do nothing;

alter table public.app_settings enable row level security;
revoke all on table public.app_settings from anon, authenticated;
grant select on table public.app_settings to anon, authenticated;
grant update on table public.app_settings to authenticated;

drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings
    for select to anon, authenticated
    using (true);

drop policy if exists app_settings_update_dev on public.app_settings;
create policy app_settings_update_dev on public.app_settings
    for update to authenticated
    using ((select public.is_developer()))
    with check ((select public.is_developer()));

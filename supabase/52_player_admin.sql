-- Ultimate Football Manager 3D — Phase 52: player database edits + ADMIN tools.
--
-- Run ONCE in Supabase → SQL Editor → New query → paste everything → Run,
-- after schema.sql (Phase 50) and 51_dev_and_gift_codes.sql (Phase 51).
-- Running it again is harmless.
--
-- What it adds:
--   - player_edits: changes to existing players (kind 'override', id = the
--     game's player id) and brand-new players (kind 'custom', id 'cx-…').
--     Everyone (even signed-out players) can read it; only developer accounts
--     can write. The base players stay in the game code.
--   - catalog_version: a counter that goes +1 on every change, so the game
--     knows when to download the edits again.
--   - Developer-only access to gift codes (list / create / turn off) and
--     functions to list / add / remove developers from the game's ADMIN screen.

-- =====================================================================
-- 1. Player edits
-- =====================================================================
create table if not exists public.player_edits (
    id         text primary key,
    kind       text not null,
    data       jsonb not null,
    updated_at timestamptz not null default now(),
    updated_by uuid default auth.uid() references auth.users (id) on delete set null,
    constraint player_edits_kind check (kind in ('override', 'custom')),
    constraint player_edits_id_format check (id ~ '^[a-z0-9][a-z0-9_-]{1,80}$'),
    constraint player_edits_custom_id check ((kind = 'custom') = (id like 'cx-%')),
    constraint player_edits_data_object check (jsonb_typeof(data) = 'object'),
    constraint player_edits_size check (pg_column_size(data) < 20000)
);

alter table public.player_edits enable row level security;
revoke all on table public.player_edits from anon, authenticated;
grant select on table public.player_edits to anon, authenticated;
grant insert, update, delete on table public.player_edits to authenticated;

drop policy if exists player_edits_read on public.player_edits;
create policy player_edits_read on public.player_edits
    for select to anon, authenticated
    using (true);

drop policy if exists player_edits_insert_dev on public.player_edits;
create policy player_edits_insert_dev on public.player_edits
    for insert to authenticated
    with check ((select public.is_developer()));

drop policy if exists player_edits_update_dev on public.player_edits;
create policy player_edits_update_dev on public.player_edits
    for update to authenticated
    using ((select public.is_developer()))
    with check ((select public.is_developer()));

drop policy if exists player_edits_delete_dev on public.player_edits;
create policy player_edits_delete_dev on public.player_edits
    for delete to authenticated
    using ((select public.is_developer()));

create or replace function public.player_edits_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
end;
$$;

drop trigger if exists player_edits_touch on public.player_edits;
create trigger player_edits_touch
    before update on public.player_edits
    for each row execute function public.player_edits_touch();

-- =====================================================================
-- 2. Catalog version (+1 on every change to player_edits)
-- =====================================================================
create table if not exists public.catalog_version (
    id         smallint primary key default 1,
    version    bigint not null default 0,
    updated_at timestamptz not null default now(),
    constraint catalog_version_single check (id = 1)
);

insert into public.catalog_version (id) values (1) on conflict (id) do nothing;

alter table public.catalog_version enable row level security;
revoke all on table public.catalog_version from anon, authenticated;
grant select on table public.catalog_version to anon, authenticated;

drop policy if exists catalog_version_read on public.catalog_version;
create policy catalog_version_read on public.catalog_version
    for select to anon, authenticated
    using (true);

create or replace function public.catalog_version_bump()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.catalog_version set version = version + 1, updated_at = now() where id = 1;
    return null;
end;
$$;

revoke all on function public.catalog_version_bump() from public, anon, authenticated;

drop trigger if exists player_edits_bump_version on public.player_edits;
create trigger player_edits_bump_version
    after insert or update or delete on public.player_edits
    for each statement execute function public.catalog_version_bump();

-- =====================================================================
-- 3. Gift codes: developers can list / create / turn off codes in the game
-- =====================================================================
grant select, insert, update on table public.gift_codes to authenticated;

drop policy if exists gift_codes_select_dev on public.gift_codes;
create policy gift_codes_select_dev on public.gift_codes
    for select to authenticated
    using ((select public.is_developer()));

drop policy if exists gift_codes_insert_dev on public.gift_codes;
create policy gift_codes_insert_dev on public.gift_codes
    for insert to authenticated
    with check ((select public.is_developer()));

drop policy if exists gift_codes_update_dev on public.gift_codes;
create policy gift_codes_update_dev on public.gift_codes
    for update to authenticated
    using ((select public.is_developer()))
    with check ((select public.is_developer()));

-- How many accounts used each code (developers only; others get no rows).
create or replace function public.gift_code_uses()
returns table (code text, uses bigint)
language sql
stable
security definer
set search_path = ''
as $$
    select r.code, count(*)::bigint
    from public.gift_redemptions r
    where public.is_developer()
    group by r.code;
$$;

revoke all on function public.gift_code_uses() from public, anon;
grant execute on function public.gift_code_uses() to authenticated;

-- =====================================================================
-- 4. Developers: list / add / remove from the game (developers only)
-- =====================================================================
create or replace function public.list_developers()
returns table (user_id uuid, email text, note text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
    select d.user_id, u.email::text, d.note, d.created_at
    from public.developers d
    join auth.users u on u.id = d.user_id
    where public.is_developer()
    order by d.created_at;
$$;

revoke all on function public.list_developers() from public, anon;
grant execute on function public.list_developers() to authenticated;

-- Returns {"ok": true, "user_id"} or {"ok": false, "error": forbidden | not_found | already}
create or replace function public.add_developer(p_email text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_user uuid;
begin
    if not public.is_developer() then
        return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;

    select id into v_user from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;

    if v_user is null then
        return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;

    insert into public.developers (user_id, note)
    values (v_user, nullif(btrim(coalesce(p_note, '')), ''))
    on conflict (user_id) do nothing;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'already');
    end if;

    return jsonb_build_object('ok', true, 'user_id', v_user);
end;
$$;

revoke all on function public.add_developer(text, text) from public, anon;
grant execute on function public.add_developer(text, text) to authenticated;

-- Returns {"ok": true} or {"ok": false, "error": forbidden | self | not_found}
create or replace function public.remove_developer(p_user uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
    if not public.is_developer() then
        return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;

    if p_user = (select auth.uid()) then
        return jsonb_build_object('ok', false, 'error', 'self');
    end if;

    delete from public.developers where user_id = p_user;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;

    return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.remove_developer(uuid) from public, anon;
grant execute on function public.remove_developer(uuid) to authenticated;

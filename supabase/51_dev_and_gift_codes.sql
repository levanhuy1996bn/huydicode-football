-- Ultimate Football Manager 3D — Phase 51: developer accounts + gift codes.
--
-- Run ONCE in Supabase → SQL Editor → New query → paste everything → Run,
-- after schema.sql (Phase 50). Running it again is harmless.
--
-- After running it:
--   1. Make your own account a developer (supabase/admin.sql, part 1).
--   2. Create gift codes in Table Editor → gift_codes, or with admin.sql part 2.
--
-- Players can never read these tables directly: the game only calls the two
-- functions below (is_developer, redeem_gift_code) and reads its own
-- redemptions.

-- =====================================================================
-- 1. Developer accounts (replaces the old DEV code typed in Settings)
-- =====================================================================
create table if not exists public.developers (
    user_id    uuid primary key references auth.users (id) on delete cascade,
    note       text,
    created_at timestamptz not null default now()
);

alter table public.developers enable row level security;
revoke all on table public.developers from anon, authenticated;

-- true when the signed-in account is in public.developers.
create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1 from public.developers where user_id = (select auth.uid())
    );
$$;

revoke all on function public.is_developer() from public, anon;
grant execute on function public.is_developer() to authenticated;

-- =====================================================================
-- 2. Gift codes: one code for everyone, each account can use it once
-- =====================================================================
create table if not exists public.gift_codes (
    code       text primary key,
    -- e.g. {"ep": 5000000, "premium": 1, "boost": 2}
    -- keys: ep (EP card amount), standard / premium (player packs),
    --       boost, protection, fitness, form, bottle (counts)
    rewards    jsonb not null,
    note       text,                      -- shown to the player, e.g. 'Welcome gift'
    starts_at  timestamptz,               -- empty = usable now
    expires_at timestamptz,               -- empty = never expires
    max_uses   integer,                   -- empty = unlimited accounts
    active     boolean not null default true,
    created_at timestamptz not null default now(),
    constraint gift_codes_code_format check (code ~ '^[A-Z0-9_-]{4,32}$'),
    constraint gift_codes_rewards_object check (jsonb_typeof(rewards) = 'object'),
    constraint gift_codes_max_uses check (max_uses is null or max_uses > 0)
);

alter table public.gift_codes enable row level security;
revoke all on table public.gift_codes from anon, authenticated;

-- One row per (code, account): the primary key makes "only once" a database rule.
create table if not exists public.gift_redemptions (
    code        text not null references public.gift_codes (code) on update cascade on delete cascade,
    user_id     uuid not null references auth.users (id) on delete cascade,
    rewards     jsonb not null,            -- copy of the rewards at redeem time
    redeemed_at timestamptz not null default now(),
    primary key (code, user_id)
);

create index if not exists gift_redemptions_user_id on public.gift_redemptions (user_id);

alter table public.gift_redemptions enable row level security;
revoke all on table public.gift_redemptions from anon, authenticated;
grant select on table public.gift_redemptions to authenticated;

drop policy if exists gift_redemptions_select_own on public.gift_redemptions;
create policy gift_redemptions_select_own on public.gift_redemptions
    for select to authenticated
    using ((select auth.uid()) = user_id);

-- Redeem a code for the signed-in account.
-- Returns {"ok": true, "code", "rewards", "note", "redeemed_at"}
--      or {"ok": false, "error": signed_out | invalid | not_started | expired | already_used | used_up}
create or replace function public.redeem_gift_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_user uuid := (select auth.uid());
    v_code text := upper(btrim(coalesce(p_code, '')));
    v_gift public.gift_codes%rowtype;
    v_used integer;
    v_now  timestamptz := now();
begin
    if v_user is null then
        return jsonb_build_object('ok', false, 'error', 'signed_out');
    end if;

    if v_code !~ '^[A-Z0-9_-]{4,32}$' then
        return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    -- Lock the code row so max_uses is counted correctly when many redeem at once.
    select * into v_gift from public.gift_codes where code = v_code for update;

    if not found or not v_gift.active then
        return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if v_gift.starts_at is not null and v_now < v_gift.starts_at then
        return jsonb_build_object('ok', false, 'error', 'not_started');
    end if;

    if v_gift.expires_at is not null and v_now >= v_gift.expires_at then
        return jsonb_build_object('ok', false, 'error', 'expired');
    end if;

    if exists (select 1 from public.gift_redemptions where code = v_code and user_id = v_user) then
        return jsonb_build_object('ok', false, 'error', 'already_used');
    end if;

    if v_gift.max_uses is not null then
        select count(*) into v_used from public.gift_redemptions where code = v_code;

        if v_used >= v_gift.max_uses then
            return jsonb_build_object('ok', false, 'error', 'used_up');
        end if;
    end if;

    insert into public.gift_redemptions (code, user_id, rewards, redeemed_at)
    values (v_code, v_user, v_gift.rewards, v_now)
    on conflict do nothing;

    if not found then
        return jsonb_build_object('ok', false, 'error', 'already_used');
    end if;

    return jsonb_build_object(
        'ok', true,
        'code', v_code,
        'rewards', v_gift.rewards,
        'note', v_gift.note,
        'redeemed_at', v_now
    );
end;
$$;

revoke all on function public.redeem_gift_code(text) from public, anon;
grant execute on function public.redeem_gift_code(text) to authenticated;

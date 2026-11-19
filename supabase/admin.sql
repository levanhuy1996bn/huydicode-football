-- Ultimate Football Manager 3D — admin snippets (Supabase → SQL Editor).
-- Do NOT run this whole file: copy only the part you need, change the values, Run.

-- ---------------------------------------------------------------------
-- 1. Make an account a developer (DEV panel appears in Settings when it signs in)
--    The account must already exist (create it in the game first).
-- ---------------------------------------------------------------------
insert into public.developers (user_id, note)
select id, 'owner' from auth.users where email = 'YOUR_EMAIL_HERE'
on conflict (user_id) do nothing;

-- Remove a developer:
-- delete from public.developers
-- where user_id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

-- ---------------------------------------------------------------------
-- 2. New gift code for everyone (each account can use it once)
--    code: CAPITAL letters, digits, - or _, 4–32 characters.
--    rewards keys: ep (EP card amount), standard / premium (player packs),
--                  boost, protection, fitness, form, bottle (counts).
--    expires_at / max_uses: leave null for no limit.
-- ---------------------------------------------------------------------
insert into public.gift_codes (code, rewards, note, expires_at, max_uses)
values (
    'WELCOME2026',
    '{"ep": 5000000, "premium": 1, "boost": 2}',
    'Welcome gift',
    '2026-12-31 23:59:59+07',
    null
);

-- Turn a code off (players then get "invalid code"):
-- update public.gift_codes set active = false where code = 'WELCOME2026';

-- ---------------------------------------------------------------------
-- 3. Who used a code
-- ---------------------------------------------------------------------
-- select r.redeemed_at, u.email
-- from public.gift_redemptions r
-- join auth.users u on u.id = r.user_id
-- where r.code = 'WELCOME2026'
-- order by r.redeemed_at desc;

-- How many accounts used each code:
-- select code, count(*) from public.gift_redemptions group by code order by code;

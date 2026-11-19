-- Phase 50: tài khoản + bản lưu trên mây (Supabase).
-- Chạy MỘT LẦN trong Supabase → SQL Editor → New query → dán toàn bộ → Run.
-- Mỗi người chơi một dòng: toàn bộ bản lưu (giải, thế giới, đội hình, CLB,
-- đội hình đã lưu, kỷ lục tập luyện) trong cột `data` (JSON).

create table if not exists public.saves (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  data           jsonb       not null,
  format_version integer     not null default 1,      -- phiên bản cấu trúc bản lưu
  revision       bigint      not null default 1,      -- tăng mỗi lần lưu (phát hiện xung đột giữa 2 máy)
  summary        jsonb,                               -- CLB, mùa, vòng, EP… để hiện khi phải chọn bản lưu
  device         text,                                -- máy lưu gần nhất (vd. "iPhone · Safari")
  updated_at     timestamptz not null default now(),
  constraint saves_size check (pg_column_size(data) < 3000000) -- tối đa ~3 MB / người
);

-- Cho game (người đã đăng nhập) truy cập bảng qua Data API. Cần thiết khi
-- project tắt "Grant API access to new tables automatically". Khách chưa đăng
-- nhập (anon) không có quyền gì.
revoke all on table public.saves from anon;
grant select, insert, update, delete on table public.saves to authenticated;

-- Bảo mật theo dòng: mỗi người chỉ đọc / ghi / xoá bản lưu của chính mình.
alter table public.saves enable row level security;

drop policy if exists "saves_select_own" on public.saves;
drop policy if exists "saves_insert_own" on public.saves;
drop policy if exists "saves_update_own" on public.saves;
drop policy if exists "saves_delete_own" on public.saves;

create policy "saves_select_own" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "saves_insert_own" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "saves_update_own" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "saves_delete_own" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);

-- updated_at luôn là giờ máy chủ.
create or replace function public.saves_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saves_touch_updated_at on public.saves;
create trigger saves_touch_updated_at
  before update on public.saves
  for each row execute function public.saves_touch_updated_at();

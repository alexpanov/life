-- Player-owned snapshots, with separate main/starter slots.
create table public.game_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('game', 'starter')),
  payload text not null check (octet_length(payload) <= 1048576 and jsonb_typeof(payload::jsonb) = 'object'),
  backup_payload text not null default '',
  backup_present boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  constraint valid_backup check (
    (not backup_present and backup_payload = '') or
    (backup_present and octet_length(backup_payload) <= 1048576 and jsonb_typeof(backup_payload::jsonb) = 'object')
  )
);

alter table public.game_saves enable row level security;
revoke all on public.game_saves from anon;
grant select, insert, update on public.game_saves to authenticated;

create policy "read own game saves" on public.game_saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own game saves" on public.game_saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own game saves" on public.game_saves
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Compare-and-swap prevents another tab/device silently losing its latest save.
-- SECURITY INVOKER keeps ownership policies active; caller cannot choose user_id.
create function public.save_game(
  p_slot text,
  p_payload text,
  p_expected_present boolean,
  p_expected_payload text
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_expected_present then
    update public.game_saves
    set backup_payload = payload, backup_present = true,
        payload = p_payload, updated_at = now()
    where user_id = (select auth.uid()) and slot = p_slot
      and payload = p_expected_payload;
  else
    insert into public.game_saves(user_id, slot, payload)
    values ((select auth.uid()), p_slot, p_payload)
    on conflict (user_id, slot) do nothing;
  end if;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Save changed on another device; reload before saving'
      using errcode = '40001';
  end if;
  return true;
end;
$$;

revoke all on function public.save_game(text, text, boolean, text) from public, anon;
grant execute on function public.save_game(text, text, boolean, text) to authenticated;

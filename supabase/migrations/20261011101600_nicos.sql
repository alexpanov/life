-- One Niko per owner. Column names match prisma/models/nico.prisma.
create table public.nicos (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  last_name text not null,
  introduced boolean not null,
  hero_name text,
  revision integer not null,
  primary key (owner_id, id)
);

alter table public.nicos enable row level security;
revoke all on public.nicos from anon;
grant select, insert, update on public.nicos to authenticated;

create policy "read own nico" on public.nicos
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "insert own nico" on public.nicos
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "update own nico" on public.nicos
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

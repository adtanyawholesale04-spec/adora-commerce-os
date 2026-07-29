-- Move relocatable extensions out of the exposed application schema and
-- optimize profiles RLS auth evaluation without changing access semantics.

create schema if not exists extensions;

alter extension pg_trgm set schema extensions;
alter extension unaccent set schema extensions;

drop policy profiles_self_select on public.profiles;
create policy profiles_self_select
on public.profiles
for select
using (auth_user_id = (select auth.uid()));

drop policy profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

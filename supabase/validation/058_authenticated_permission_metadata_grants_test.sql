-- ACOS local validation: authenticated permission metadata grants

begin;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'public.permissions',
    'public.roles',
    'public.role_permissions',
    'public.membership_roles'
  ];
begin
  foreach v_table in array v_tables loop
    if not has_table_privilege('authenticated', v_table, 'SELECT') then
      raise exception 'authenticated SELECT missing for %', v_table;
    end if;

    if has_table_privilege('anon', v_table, 'SELECT') then
      raise exception 'anon SELECT unexpectedly granted for %', v_table;
    end if;

    if has_table_privilege('authenticated', v_table, 'INSERT')
       or has_table_privilege('authenticated', v_table, 'UPDATE')
       or has_table_privilege('authenticated', v_table, 'DELETE') then
      raise exception 'authenticated write privilege unexpectedly granted for %', v_table;
    end if;
  end loop;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'permissions'
      and c.relrowsecurity
  ) then
    raise exception 'permissions RLS is not enabled';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'roles'
      and c.relrowsecurity
  ) then
    raise exception 'roles RLS is not enabled';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'role_permissions'
      and c.relrowsecurity
  ) then
    raise exception 'role_permissions RLS is not enabled';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'membership_roles'
      and c.relrowsecurity
  ) then
    raise exception 'membership_roles RLS is not enabled';
  end if;
end;
$$;

select 'authenticated_permission_metadata_grants|pass' as result;

rollback;

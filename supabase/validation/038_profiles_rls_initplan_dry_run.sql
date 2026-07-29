begin;

drop policy profiles_self_select on public.profiles;
create policy profiles_self_select
on public.profiles
for select
to authenticated
using (auth_user_id = (select auth.uid()));

drop policy profiles_self_update on public.profiles;
create policy profiles_self_update
on public.profiles
for update
to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));

-- The production role currently has no direct UPDATE grant. Grant it only
-- inside this rollback-only transaction to exercise the optimized policy.
grant update on public.profiles to authenticated;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa38',
    'authenticated',
    'authenticated',
    'profiles-rls-owner@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa39',
    'authenticated',
    'authenticated',
    'profiles-rls-other@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc38',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa38',
    'Profiles RLS Owner',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc39',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa39',
    'Profiles RLS Other',
    'ACTIVE'
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa38',
  true
);

do $$
declare
  v_count integer;
  v_rows integer;
begin
  select count(*)
  into v_count
  from public.profiles
  where id in (
    'cccccccc-cccc-cccc-cccc-cccccccccc38'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccc39'::uuid
  );

  if v_count <> 1 then
    raise exception 'optimized self-select expected 1 row, got %', v_count;
  end if;

  update public.profiles
  set display_name = 'Profiles RLS Owner Updated'
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccc38'::uuid;

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'optimized self-update expected 1 row, got %', v_rows;
  end if;

  update public.profiles
  set display_name = 'Cross User Update'
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccc39'::uuid;

  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'optimized cross-user update expected 0 rows, got %', v_rows;
  end if;
end
$$;

reset role;

do $$
declare
  v_select_expression text;
  v_update_expression text;
  v_update_check_expression text;
begin
  select pg_get_expr(polqual, polrelid)
  into v_select_expression
  from pg_policy
  where polrelid = 'public.profiles'::regclass
    and polname = 'profiles_self_select';

  select pg_get_expr(polqual, polrelid),
         pg_get_expr(polwithcheck, polrelid)
  into v_update_expression, v_update_check_expression
  from pg_policy
  where polrelid = 'public.profiles'::regclass
    and polname = 'profiles_self_update';

  if v_select_expression not like '%SELECT auth.uid()%' then
    raise exception 'optimized select policy does not use an initplan';
  end if;

  if v_update_expression not like '%SELECT auth.uid()%' or
     v_update_check_expression not like '%SELECT auth.uid()%' then
    raise exception 'optimized update policy does not use initplans';
  end if;
end
$$;

select 'profiles_rls_initplan_dry_run' as check_name, 'pass' as result;

rollback;

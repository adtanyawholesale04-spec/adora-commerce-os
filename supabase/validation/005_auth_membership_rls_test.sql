\set ON_ERROR_STOP on

begin;

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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'authenticated',
    'authenticated',
    'rls-user-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'authenticated',
    'authenticated',
    'rls-user-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'RLS Org A', 'rls-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'RLS Org B', 'rls-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc01',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'RLS User A',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc02',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'RLS User B',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id,
  organization_id,
  profile_id,
  status,
  is_default,
  joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd01',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
    'cccccccc-cccc-cccc-cccc-cccccccccc01',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd02',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
    'cccccccc-cccc-cccc-cccc-cccccccccc02',
    'ACTIVE',
    true,
    now()
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  true
);

do $$
declare
  v_profile_count integer;
  v_membership_count integer;
  v_visible_count integer;
begin
  if public.current_profile_id() <> 'cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid then
    raise exception 'user A current_profile_id failed';
  end if;

  select count(*)
  into v_profile_count
  from public.profiles
  where auth_user_id in (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
  );

  if v_profile_count <> 1 then
    raise exception 'user A profile RLS count expected 1, got %', v_profile_count;
  end if;

  if exists (
    select 1
    from public.profiles
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccc02'::uuid
  ) then
    raise exception 'user A can see another profile';
  end if;

  if not public.is_org_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid) then
    raise exception 'user A membership for org A failed';
  end if;

  if public.is_org_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid) then
    raise exception 'user A should not be member of org B';
  end if;

  select count(*)
  into v_membership_count
  from public.organization_memberships
  where organization_id in (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid
  );

  if v_membership_count <> 1 then
    raise exception 'user A membership RLS count expected 1, got %', v_membership_count;
  end if;

  select count(*)
  into v_visible_count
  from public.organizations
  where slug in ('rls-org-a', 'rls-org-b');

  if v_visible_count <> 1 then
    raise exception 'user A organization RLS count expected 1, got %', v_visible_count;
  end if;

  if not exists (
    select 1
    from public.organizations
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid
  ) then
    raise exception 'user A cannot see own organization';
  end if;

  if exists (
    select 1
    from public.organizations
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid
  ) then
    raise exception 'user A can see another organization';
  end if;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  true
);

do $$
declare
  v_profile_count integer;
  v_membership_count integer;
  v_visible_count integer;
begin
  if public.current_profile_id() <> 'cccccccc-cccc-cccc-cccc-cccccccccc02'::uuid then
    raise exception 'user B current_profile_id failed';
  end if;

  select count(*)
  into v_profile_count
  from public.profiles
  where auth_user_id in (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid
  );

  if v_profile_count <> 1 then
    raise exception 'user B profile RLS count expected 1, got %', v_profile_count;
  end if;

  if exists (
    select 1
    from public.profiles
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccc01'::uuid
  ) then
    raise exception 'user B can see another profile';
  end if;

  if not public.is_org_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid) then
    raise exception 'user B membership for org B failed';
  end if;

  if public.is_org_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid) then
    raise exception 'user B should not be member of org A';
  end if;

  select count(*)
  into v_membership_count
  from public.organization_memberships
  where organization_id in (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid
  );

  if v_membership_count <> 1 then
    raise exception 'user B membership RLS count expected 1, got %', v_membership_count;
  end if;

  select count(*)
  into v_visible_count
  from public.organizations
  where slug in ('rls-org-a', 'rls-org-b');

  if v_visible_count <> 1 then
    raise exception 'user B organization RLS count expected 1, got %', v_visible_count;
  end if;

  if not exists (
    select 1
    from public.organizations
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02'::uuid
  ) then
    raise exception 'user B cannot see own organization';
  end if;

  if exists (
    select 1
    from public.organizations
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::uuid
  ) then
    raise exception 'user B can see another organization';
  end if;
end $$;

reset role;

select 'auth_profile_membership_rls' as check_name, 'pass' as result;

rollback;

\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa191',
    'authenticated',
    'authenticated',
    'invite-accept-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa192',
    'authenticated',
    'authenticated',
    'accepted-new-member@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa193',
    'authenticated',
    'authenticated',
    'wrong-accepted-member@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa194',
    'authenticated',
    'authenticated',
    'suspended-accepted-member@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
  'Member Invite Acceptance Org',
  'member-invite-acceptance-org',
  'ACTIVE'
);

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa191',
    'Invite Acceptance Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc94',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa194',
    'Suspended Acceptance Member',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd91',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd94',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'cccccccc-cccc-cccc-cccc-cccccccccc94',
    'SUSPENDED',
    false,
    null
  );

insert into public.organization_invitations (
  id, organization_id, email, status, invited_by, expires_at
) values
  (
    '19191919-1919-1919-9919-191919191921',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'accepted-new-member@example.test',
    'PENDING',
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    now() + interval '7 days'
  ),
  (
    '19191919-1919-1919-9919-191919191922',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'accepted-new-member@example.test',
    'PENDING',
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    now() + interval '7 days'
  ),
  (
    '19191919-1919-1919-9919-191919191923',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91',
    'suspended-accepted-member@example.test',
    'PENDING',
    'cccccccc-cccc-cccc-cccc-cccccccccc91',
    now() + interval '7 days'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa192', true);

do $$
declare
  v_first record;
  v_second record;
begin
  select *
  into v_first
  from public.api_accept_member_invitation(
    '19191919-1919-1919-9919-191919191921'::uuid
  );

  if v_first.invitation_status <> 'ACCEPTED'
     or v_first.membership_status <> 'ACTIVE'
     or v_first.created_profile is not true
     or v_first.activated_membership is not true
     or v_first.reused_existing is not false then
    raise exception 'invite acceptance success row was incorrect: %', row_to_json(v_first);
  end if;

  select *
  into v_second
  from public.api_accept_member_invitation(
    '19191919-1919-1919-9919-191919191921'::uuid
  );

  if v_second.invitation_id <> v_first.invitation_id
     or v_second.membership_id <> v_first.membership_id
     or v_second.reused_existing is not true then
    raise exception 'invite acceptance idempotency row was incorrect: %', row_to_json(v_second);
  end if;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.profiles p
  join public.organization_memberships om on om.profile_id = p.id
  join public.organization_invitations oi on oi.accepted_by_profile_id = p.id
  where p.auth_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa192'::uuid
    and p.status = 'ACTIVE'
    and om.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid
    and om.status = 'ACTIVE'
    and om.is_default = true
    and oi.id = '19191919-1919-1919-9919-191919191921'::uuid
    and oi.status = 'ACCEPTED'
    and oi.accepted_at is not null;

  if v_count <> 1 then
    raise exception 'invite acceptance did not create active profile/membership and accepted invitation';
  end if;

  select count(*) into v_count
  from public.audit_logs al
  where al.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb91'::uuid
    and al.actor_type = 'USER'
    and al.entity_type = 'organization_invitation'
    and al.entity_id = '19191919-1919-1919-9919-191919191921'::uuid
    and al.action = 'admin.member.invite.accepted'
    and al.after_json ->> 'role_assignment' = 'deferred';

  if v_count <> 1 then
    raise exception 'invite acceptance audit log missing';
  end if;

  select count(*) into v_count
  from public.membership_roles mr
  join public.organization_memberships om on om.id = mr.membership_id
  join public.profiles p on p.id = om.profile_id
  where p.auth_user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa192'::uuid;

  if v_count <> 0 then
    raise exception 'invite acceptance unexpectedly assigned roles';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa193', true);

do $$
begin
  begin
    perform public.api_accept_member_invitation(
      '19191919-1919-1919-9919-191919191922'::uuid
    );

    raise exception 'email mismatch invite acceptance unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa194', true);

do $$
begin
  begin
    perform public.api_accept_member_invitation(
      '19191919-1919-1919-9919-191919191923'::uuid
    );

    raise exception 'suspended membership invite acceptance unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

reset role;

select 'member_invite_acceptance_activation' as check_name, 'pass' as result;

rollback;

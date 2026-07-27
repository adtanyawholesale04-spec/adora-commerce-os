\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa171',
    'authenticated',
    'authenticated',
    'member-invite-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa172',
    'authenticated',
    'authenticated',
    'member-invite-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71', 'Member Invite Org A', 'member-invite-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72', 'Member Invite Org B', 'member-invite-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa171',
    'Member Invite Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc72',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa172',
    'Member Invite Limited',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd71',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'cccccccc-cccc-cccc-cccc-cccccccccc71',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd72',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'cccccccc-cccc-cccc-cccc-cccccccccc72',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777771',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'member_invite_manager',
    'Member Invite Manager',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
    'member_invite_limited',
    'Member Invite Limited',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777771'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777772'::uuid, id
from public.permissions
where code in ('members.view');

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd71', '77777777-7777-7777-7777-777777777771'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd72', '77777777-7777-7777-7777-777777777772');

insert into public.organization_invitations (
  id, organization_id, email, status, invited_by, expires_at, accepted_by_profile_id, accepted_at
) values (
  '12121212-1212-1212-1212-121212121271',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71',
  'accepted-staff@example.test',
  'ACCEPTED',
  'cccccccc-cccc-cccc-cccc-cccccccccc71',
  now() + interval '1 day',
  'cccccccc-cccc-cccc-cccc-cccccccccc71',
  now()
);

set local role authenticated;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa171', true);

do $$
declare
  v_first record;
  v_second record;
  v_count integer;
begin
  select *
  into v_first
  from public.api_request_member_invitation(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid,
    '  NEW-STAFF@Example.Test  ',
    '99999999-9999-9999-9999-999999999971'::uuid
  );

  if v_first.invitation_id is null or v_first.invitation_status <> 'PENDING' then
    raise exception 'member invite RPC did not return pending invitation';
  end if;

  if v_first.reused_existing is not false then
    raise exception 'first invite should not reuse existing invitation';
  end if;

  if v_first.expires_at < now() + interval '6 days 23 hours'
     or v_first.expires_at > now() + interval '7 days 1 hour' then
    raise exception 'member invite TTL is not approximately 7 days: %', v_first.expires_at;
  end if;

  select count(*) into v_count
  from public.organization_invitations
  where id = v_first.invitation_id
    and organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid
    and email = 'new-staff@example.test'
    and invited_by = 'cccccccc-cccc-cccc-cccc-cccccccccc71'::uuid
    and status = 'PENDING';

  if v_count <> 1 then
    raise exception 'member invite expected one normalized invitation, got %', v_count;
  end if;

  select *
  into v_second
  from public.api_request_member_invitation(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid,
    'new-staff@example.test',
    null
  );

  if v_second.invitation_id <> v_first.invitation_id or v_second.reused_existing is not true then
    raise exception 'duplicate invite did not reuse existing pending invitation';
  end if;

  select count(*) into v_count
  from public.organization_invitations
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid
    and email = 'new-staff@example.test'
    and status = 'PENDING';

  if v_count <> 1 then
    raise exception 'duplicate invite created extra pending row, got %', v_count;
  end if;

  begin
    perform public.api_request_member_invitation(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid,
      'accepted-staff@example.test',
      null
    );

    raise exception 'accepted invite conflict unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.audit_logs al
  join public.organization_invitations oi on oi.id = al.entity_id
  where al.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid
    and al.actor_profile_id = 'cccccccc-cccc-cccc-cccc-cccccccccc71'::uuid
    and oi.email = 'new-staff@example.test'
    and al.action = 'admin.member.invite.request'
    and al.request_id = '99999999-9999-9999-9999-999999999971'::uuid;

  if v_count <> 1 then
    raise exception 'member invite expected one audit log, got %', v_count;
  end if;

  select count(*) into v_count
  from public.audit_logs al
  join public.organization_invitations oi on oi.id = al.entity_id
  where al.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid
    and oi.email = 'new-staff@example.test'
    and al.action = 'admin.member.invite.request.duplicate_reused';

  if v_count <> 1 then
    raise exception 'duplicate invite expected one duplicate audit log, got %', v_count;
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa172', true);

do $$
begin
  begin
    perform public.api_request_member_invitation(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb71'::uuid,
      'limited@example.test',
      null
    );

    raise exception 'limited user member invite unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_request_member_invitation(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb72'::uuid,
      'cross-tenant@example.test',
      null
    );

    raise exception 'cross-tenant member invite unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'member_invite_request_rpc' as check_name, 'pass' as result;

rollback;

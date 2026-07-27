\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa181',
    'authenticated',
    'authenticated',
    'member-invite-email-manager@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa182',
    'authenticated',
    'authenticated',
    'member-invite-email-limited@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81', 'Member Invite Email Org A', 'member-invite-email-org-a', 'ACTIVE'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb82', 'Member Invite Email Org B', 'member-invite-email-org-b', 'ACTIVE');

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc81',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa181',
    'Member Invite Email Manager',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc82',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa182',
    'Member Invite Email Limited',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id, organization_id, profile_id, status, is_default, joined_at
) values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd81',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'cccccccc-cccc-cccc-cccc-cccccccccc81',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd82',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'cccccccc-cccc-cccc-cccc-cccccccccc82',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777781',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'member_invite_email_manager',
    'Member Invite Email Manager',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777782',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81',
    'member_invite_email_limited',
    'Member Invite Email Limited',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777781'::uuid, id
from public.permissions
where code in ('members.view', 'members.manage');

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777782'::uuid, id
from public.permissions
where code in ('members.view');

insert into public.membership_roles (membership_id, role_id)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd81', '77777777-7777-7777-7777-777777777781'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd82', '77777777-7777-7777-7777-777777777782');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa181', true);

do $$
declare
  v_invite record;
  v_prepare record;
  v_audit record;
begin
  select *
  into v_invite
  from public.api_request_member_invitation(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    ' EMAIL-BOUNDARY@Example.Test ',
    '99999999-9999-9999-9999-999999999981'::uuid
  );

  select *
  into v_prepare
  from public.api_prepare_member_invitation_email_send(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    v_invite.invitation_id
  );

  if v_prepare.invitation_id <> v_invite.invitation_id
     or v_prepare.invite_email <> 'email-boundary@example.test'
     or v_prepare.should_send is not true
     or v_prepare.already_sent is not false then
    raise exception 'email preparation did not mark new invite as sendable';
  end if;

  select *
  into v_audit
  from public.api_record_member_invitation_email_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    v_invite.invitation_id,
    '99999999-9999-9999-9999-999999999981'::uuid,
    'SENT',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa189'::uuid,
    null
  );

  if v_audit.audit_log_id is null or v_audit.delivery_status <> 'SENT' then
    raise exception 'email sent audit was not recorded';
  end if;

  select *
  into v_prepare
  from public.api_prepare_member_invitation_email_send(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    v_invite.invitation_id
  );

  if v_prepare.should_send is not false or v_prepare.already_sent is not true then
    raise exception 'email preparation did not become idempotent after sent audit';
  end if;

  select *
  into v_audit
  from public.api_record_member_invitation_email_event(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
    v_invite.invitation_id,
    '99999999-9999-9999-9999-999999999982'::uuid,
    'FAILED',
    null,
    'auth_admin_invite_failed'
  );

  if v_audit.audit_log_id is null or v_audit.delivery_status <> 'FAILED' then
    raise exception 'email failed audit was not recorded';
  end if;
end $$;

reset role;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.audit_logs al
  join public.organization_invitations oi on oi.id = al.entity_id
  where al.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid
    and oi.email = 'email-boundary@example.test'
    and al.action = 'admin.member.invite.email_sent'
    and al.after_json->>'auth_user_id' = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa189';

  if v_count <> 1 then
    raise exception 'expected one email_sent audit row, got %', v_count;
  end if;

  select count(*) into v_count
  from public.audit_logs al
  join public.organization_invitations oi on oi.id = al.entity_id
  where al.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid
    and oi.email = 'email-boundary@example.test'
    and al.action = 'admin.member.invite.email_failed'
    and al.after_json->>'error_code' = 'auth_admin_invite_failed';

  if v_count <> 1 then
    raise exception 'expected one email_failed audit row, got %', v_count;
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa182', true);

do $$
declare
  v_invitation_id uuid;
begin
  select id into v_invitation_id
  from public.organization_invitations
  where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid
    and email = 'email-boundary@example.test'
  limit 1;

  begin
    perform public.api_prepare_member_invitation_email_send(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
      v_invitation_id
    );

    raise exception 'limited user email prepare unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_record_member_invitation_email_event(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb81'::uuid,
      v_invitation_id,
      null,
      'SENT',
      null,
      null
    );

    raise exception 'limited user email record unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.api_prepare_member_invitation_email_send(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb82'::uuid,
      v_invitation_id
    );

    raise exception 'cross-tenant email prepare unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'member_invite_auth_admin_email_boundary' as check_name, 'pass' as result;

rollback;

-- ADORA Commerce OS (ACOS)
-- 045_member_invite_request_rpc.sql
--
-- Purpose:
-- - Persist admin.member.invite.request through a guarded RPC boundary.
-- - Keep invitation creation and audit logging in one PostgreSQL transaction.
-- - Use authenticated user context and members.manage permission, not service role.

create or replace function public.api_request_member_invitation(
  p_organization_id uuid,
  p_email varchar,
  p_client_request_id uuid default null
)
returns table (
  invitation_id uuid,
  invitation_status varchar,
  expires_at timestamptz,
  reused_existing boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_email varchar(320);
  v_existing_id uuid;
  v_existing_status varchar(30);
  v_existing_expires_at timestamptz;
  v_new_expires_at timestamptz;
  v_reused boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'Missing permission: members.manage' using errcode = '42501';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  v_email := lower(trim(coalesce(p_email, '')));

  if length(v_email) < 3
     or length(v_email) > 320
     or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text || ':' || v_email));

  select oi.id, oi.status, oi.expires_at
  into v_existing_id, v_existing_status, v_existing_expires_at
  from public.organization_invitations oi
  where oi.organization_id = p_organization_id
    and lower(oi.email) = v_email
    and oi.status in ('PENDING', 'ACCEPTED')
  order by oi.created_at desc
  limit 1
  for update;

  if v_existing_id is not null and v_existing_status = 'PENDING' and v_existing_expires_at > now() then
    v_reused := true;

    insert into public.audit_logs (
      organization_id,
      actor_profile_id,
      actor_type,
      entity_type,
      entity_id,
      action,
      before_json,
      after_json,
      reason,
      request_id
    ) values (
      p_organization_id,
      v_profile_id,
      'USER',
      'organization_invitation',
      v_existing_id,
      'admin.member.invite.request.duplicate_reused',
      jsonb_build_object(
        'id', v_existing_id,
        'status', v_existing_status,
        'expires_at', v_existing_expires_at
      ),
      jsonb_build_object(
        'id', v_existing_id,
        'email', v_email,
        'status', v_existing_status,
        'expires_at', v_existing_expires_at,
        'ttl_days', 7,
        'auth_admin_email_sent', false
      ),
      'member_invite_duplicate_reused',
      p_client_request_id
    );

    invitation_id := v_existing_id;
    invitation_status := v_existing_status;
    expires_at := v_existing_expires_at;
    reused_existing := v_reused;
    return next;
    return;
  end if;

  if v_existing_id is not null and v_existing_status = 'ACCEPTED' then
    raise exception 'Email already has an accepted invitation or membership conflict' using errcode = '22023';
  end if;

  v_new_expires_at := now() + interval '7 days';

  insert into public.organization_invitations (
    organization_id,
    email,
    status,
    invited_by,
    expires_at
  ) values (
    p_organization_id,
    v_email,
    'PENDING',
    v_profile_id,
    v_new_expires_at
  )
  returning id, status, organization_invitations.expires_at
  into invitation_id, invitation_status, expires_at;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    before_json,
    after_json,
    reason,
    request_id
  ) values (
    p_organization_id,
    v_profile_id,
    'USER',
    'organization_invitation',
    invitation_id,
    'admin.member.invite.request',
    null,
    jsonb_build_object(
      'id', invitation_id,
      'email', v_email,
      'status', invitation_status,
      'expires_at', expires_at,
      'ttl_days', 7,
      'auth_admin_email_sent', false
    ),
    'member_invite_requested',
    p_client_request_id
  );

  reused_existing := v_reused;
  return next;
end;
$$;

revoke execute on function public.api_request_member_invitation(uuid, varchar, uuid)
  from public, anon;
grant execute on function public.api_request_member_invitation(uuid, varchar, uuid)
  to authenticated;

grant select on table public.organization_invitations to authenticated;

drop policy if exists organization_invitations_permission_select
  on public.organization_invitations;
create policy organization_invitations_permission_select
on public.organization_invitations
as restrictive
for select
to authenticated
using (public.has_org_permission(organization_id, 'members.view'));

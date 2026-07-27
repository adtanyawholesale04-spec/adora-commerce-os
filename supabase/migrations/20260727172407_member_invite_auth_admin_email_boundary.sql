-- ADORA Commerce OS (ACOS)
-- A3 member invite Auth Admin email-send boundary
--
-- Purpose:
-- - Keep Supabase Auth Admin email delivery behind a server-only application boundary.
-- - Give the application an authenticated RPC to prepare one pending invitation for email send.
-- - Record Auth Admin email SENT/FAILED events in append-only audit_logs.
-- - Make retries idempotent after a successful email audit event.

create or replace function public.api_prepare_member_invitation_email_send(
  p_organization_id uuid,
  p_invitation_id uuid
)
returns table (
  invitation_id uuid,
  invite_email varchar,
  should_send boolean,
  already_sent boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_already_sent boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'Missing permission: members.manage' using errcode = '42501';
  end if;

  select oi.id, oi.email, oi.status, oi.expires_at
  into v_invitation
  from public.organization_invitations oi
  where oi.id = p_invitation_id
    and oi.organization_id = p_organization_id
  limit 1;

  if v_invitation.id is null then
    raise exception 'Invitation not found' using errcode = '22023';
  end if;

  if v_invitation.status <> 'PENDING' then
    raise exception 'Invitation is not pending' using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'Invitation is expired' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.audit_logs al
    where al.organization_id = p_organization_id
      and al.entity_type = 'organization_invitation'
      and al.entity_id = p_invitation_id
      and al.action = 'admin.member.invite.email_sent'
  )
  into v_already_sent;

  invitation_id := v_invitation.id;
  invite_email := lower(trim(v_invitation.email));
  already_sent := v_already_sent;
  should_send := not v_already_sent;
  return next;
end;
$$;

revoke execute on function public.api_prepare_member_invitation_email_send(uuid, uuid)
  from public, anon;
grant execute on function public.api_prepare_member_invitation_email_send(uuid, uuid)
  to authenticated;

create or replace function public.api_record_member_invitation_email_event(
  p_organization_id uuid,
  p_invitation_id uuid,
  p_client_request_id uuid default null,
  p_delivery_status varchar default 'SENT',
  p_auth_user_id uuid default null,
  p_error_code varchar default null
)
returns table (
  audit_log_id uuid,
  delivery_status varchar
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_invitation record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'Missing permission: members.manage' using errcode = '42501';
  end if;

  if p_delivery_status not in ('SENT', 'FAILED') then
    raise exception 'Unsupported invitation email delivery status' using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select oi.id, oi.email, oi.status, oi.expires_at
  into v_invitation
  from public.organization_invitations oi
  where oi.id = p_invitation_id
    and oi.organization_id = p_organization_id
  limit 1;

  if v_invitation.id is null then
    raise exception 'Invitation not found' using errcode = '22023';
  end if;

  if v_invitation.status <> 'PENDING' then
    raise exception 'Invitation is not pending' using errcode = '22023';
  end if;

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
    p_invitation_id,
    case
      when p_delivery_status = 'SENT' then 'admin.member.invite.email_sent'
      else 'admin.member.invite.email_failed'
    end,
    null,
    jsonb_build_object(
      'id', p_invitation_id,
      'email', lower(trim(v_invitation.email)),
      'status', v_invitation.status,
      'expires_at', v_invitation.expires_at,
      'delivery_status', p_delivery_status,
      'auth_user_id', p_auth_user_id,
      'error_code', p_error_code
    ),
    case
      when p_delivery_status = 'SENT' then 'member_invite_auth_admin_email_sent'
      else 'member_invite_auth_admin_email_failed'
    end,
    p_client_request_id
  )
  returning id into audit_log_id;

  delivery_status := p_delivery_status;
  return next;
end;
$$;

revoke execute on function public.api_record_member_invitation_email_event(
  uuid,
  uuid,
  uuid,
  varchar,
  uuid,
  varchar
) from public, anon;
grant execute on function public.api_record_member_invitation_email_event(
  uuid,
  uuid,
  uuid,
  varchar,
  uuid,
  varchar
) to authenticated;

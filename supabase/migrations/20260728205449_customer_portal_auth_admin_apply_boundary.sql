-- Part 5: server-only Auth Admin apply boundary for verified customer contacts.
-- This migration never calls Auth Admin and never stores raw contact values in audit logs.

create or replace function public.api_apply_customer_contact_change(
  p_organization_id uuid,
  p_request_id uuid,
  p_auth_user_id uuid,
  p_client_request_id uuid default null
)
returns table (
  request_id uuid,
  status text,
  contact_type text,
  auth_user_id uuid,
  already_applied boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_is_service_role boolean;
  v_request record;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';
  if not v_is_service_role then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_auth_user_id is null then
    raise exception 'Auth user ID is required' using errcode = '22023';
  end if;

  select r.*, p.auth_user_id as linked_auth_user_id
  into v_request
  from public.customer_contact_change_requests r
  join public.profiles p on p.id = r.profile_id
  where r.organization_id = p_organization_id
    and r.id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Contact change request not found' using errcode = '22023';
  end if;
  if v_request.linked_auth_user_id <> p_auth_user_id then
    raise exception 'Auth user does not match contact request owner' using errcode = '42501';
  end if;
  if v_request.status = 'APPLIED' then
    return query select v_request.id, v_request.status::text, v_request.contact_type::text,
      p_auth_user_id, true;
    return;
  end if;
  if v_request.status <> 'VERIFIED' then
    raise exception 'Contact change request is not verified' using errcode = '22023';
  end if;

  update public.customer_contact_change_requests
  set status = 'APPLIED', applied_at = now()
  where id = p_request_id;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'CUSTOMER_CONTACT_CHANGE_REQUEST', p_request_id,
    'CUSTOMER_CONTACT_CHANGE_APPLIED',
    jsonb_build_object(
      'status', 'APPLIED',
      'contact_type', v_request.contact_type,
      'auth_user_id', p_auth_user_id
    ),
    'Auth Admin verified contact apply', p_client_request_id
  );

  return query select p_request_id, 'APPLIED'::text, v_request.contact_type::text,
    p_auth_user_id, false;
end;
$$;

create or replace function public.api_record_customer_contact_change_apply_failure(
  p_organization_id uuid,
  p_request_id uuid,
  p_auth_user_id uuid,
  p_error_code text,
  p_client_request_id uuid default null
)
returns table (
  request_id uuid,
  status text,
  recorded boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_is_service_role boolean;
  v_status text;
  v_linked_auth_user_id uuid;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';
  if not v_is_service_role then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if nullif(trim(p_error_code), '') is null then
    raise exception 'Error code is required' using errcode = '22023';
  end if;

  select r.status, p.auth_user_id
  into v_status, v_linked_auth_user_id
  from public.customer_contact_change_requests r
  join public.profiles p on p.id = r.profile_id
  where r.organization_id = p_organization_id and r.id = p_request_id;

  if v_status is null then
    raise exception 'Contact change request not found' using errcode = '22023';
  end if;
  if v_linked_auth_user_id <> p_auth_user_id then
    raise exception 'Auth user does not match contact request owner' using errcode = '42501';
  end if;
  if v_status not in ('VERIFIED', 'APPLIED') then
    raise exception 'Contact change request is not in an applyable state' using errcode = '22023';
  end if;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'CUSTOMER_CONTACT_CHANGE_REQUEST', p_request_id,
    'CUSTOMER_CONTACT_CHANGE_APPLY_FAILED',
    jsonb_build_object(
      'status', v_status,
      'auth_user_id', p_auth_user_id,
      'error_code', left(trim(p_error_code), 80)
    ),
    'Auth Admin verified contact apply failed; retry remains allowed', p_client_request_id
  );

  return query select p_request_id, v_status, true;
end;
$$;

revoke all on function public.api_apply_customer_contact_change(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.api_record_customer_contact_change_apply_failure(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.api_apply_customer_contact_change(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.api_record_customer_contact_change_apply_failure(uuid, uuid, uuid, text, uuid) to service_role;

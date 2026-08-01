-- ADORA Commerce OS (ACOS)
-- Forward-only correction for the existing Fulfillment assignment lint warning.
-- The public contract, guards, audit actions and grants remain unchanged.

create or replace function public.api_assign_fulfillment(
  p_organization_id uuid,
  p_fulfillment_id uuid,
  p_assignee_profile_id uuid,
  p_client_request_id uuid,
  p_reason text,
  p_expected_assignee_profile_id uuid default null
)
returns table (
  fulfillment_id uuid,
  previous_assignee_profile_id uuid,
  current_assignee_profile_id uuid,
  operation text,
  idempotency_reused boolean,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_profile_id uuid;
  v_fulfillment record;
  v_assignee record;
  v_previous_audit record;
  v_operation text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if p_assignee_profile_id is null then
    raise exception 'Assignee profile is required' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 10
     or length(trim(coalesce(p_reason, ''))) > 500 then
    raise exception 'Reason must be between 10 and 500 characters' using errcode = '22023';
  end if;

  if not public.has_org_permission(p_organization_id, 'warehouse.pick') then
    raise exception 'Missing permission: warehouse.pick' using errcode = '42501';
  end if;

  v_actor_profile_id := public.current_profile_id();

  if v_actor_profile_id is null then
    raise exception 'Active actor profile not found' using errcode = '42501';
  end if;

  select f.id, f.organization_id, f.assigned_profile_id, f.status
  into v_fulfillment
  from public.fulfillments f
  where f.id = p_fulfillment_id
    and f.organization_id = p_organization_id
  for update;

  if v_fulfillment.id is null then
    raise exception 'Fulfillment not found' using errcode = '22023';
  end if;

  select om.profile_id, om.status as membership_status, p.status as profile_status
  into v_assignee
  from public.organization_memberships om
  join public.profiles p on p.id = om.profile_id
  where om.organization_id = p_organization_id
    and om.profile_id = p_assignee_profile_id;

  if v_assignee.profile_id is null
     or v_assignee.membership_status <> 'ACTIVE'
     or v_assignee.profile_status <> 'ACTIVE' then
    raise exception 'Assignee must be an active member profile in the organization' using errcode = '42501';
  end if;

  select al.id, al.before_json, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'fulfillment'
    and al.entity_id = p_fulfillment_id
    and al.request_id = p_client_request_id
    and al.action in (
      'admin.fulfillment.assign',
      'admin.fulfillment.reassign',
      'admin.fulfillment.assign.already_assigned',
      'admin.fulfillment.assignment.duplicate_reused'
    )
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'fulfillment_id' <> p_fulfillment_id::text
       or v_previous_audit.before_json ->> 'requested_assignee_profile_id' <> p_assignee_profile_id::text
       or v_previous_audit.before_json ->> 'reason' <> trim(p_reason) then
      raise exception 'Idempotency key conflicts with an existing request' using errcode = '22023';
    end if;

    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, v_actor_profile_id, 'USER', 'fulfillment', p_fulfillment_id,
      'admin.fulfillment.assignment.duplicate_reused',
      jsonb_build_object(
        'fulfillment_id', p_fulfillment_id,
        'requested_assignee_profile_id', p_assignee_profile_id,
        'original_audit_log_id', v_previous_audit.id,
        'reason', trim(p_reason)
      ),
      jsonb_build_object(
        'fulfillment_id', p_fulfillment_id,
        'current_assignee_profile_id', v_fulfillment.assigned_profile_id,
        'idempotency_reused', true
      ),
      trim(p_reason), p_client_request_id
    )
    returning id into audit_log_id;

    fulfillment_id := p_fulfillment_id;
    previous_assignee_profile_id := (v_previous_audit.after_json ->> 'current_assignee_profile_id')::uuid;
    current_assignee_profile_id := v_fulfillment.assigned_profile_id;
    operation := 'duplicate_reused';
    idempotency_reused := true;
    return next;
    return;
  end if;

  if p_expected_assignee_profile_id is distinct from v_fulfillment.assigned_profile_id then
    raise exception 'Fulfillment assignment changed; refresh and retry' using errcode = '40001';
  end if;

  if v_fulfillment.assigned_profile_id is null then
    v_operation := 'admin.fulfillment.assign';
    operation := 'assign';
  elsif v_fulfillment.assigned_profile_id = p_assignee_profile_id then
    v_operation := 'admin.fulfillment.assign.already_assigned';
    operation := 'already_assigned';
  else
    v_operation := 'admin.fulfillment.reassign';
    operation := 'reassign';
  end if;

  if v_fulfillment.assigned_profile_id is distinct from p_assignee_profile_id then
    update public.fulfillments
    set assigned_profile_id = p_assignee_profile_id,
        updated_at = now()
    where id = p_fulfillment_id
      and organization_id = p_organization_id;
  end if;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_actor_profile_id, 'USER', 'fulfillment', p_fulfillment_id,
    v_operation,
    jsonb_build_object(
      'fulfillment_id', p_fulfillment_id,
      'previous_assignee_profile_id', v_fulfillment.assigned_profile_id,
      'requested_assignee_profile_id', p_assignee_profile_id,
      'reason', trim(p_reason)
    ),
    jsonb_build_object(
      'fulfillment_id', p_fulfillment_id,
      'current_assignee_profile_id', p_assignee_profile_id,
      'status', v_fulfillment.status,
      'idempotency_reused', false
    ),
    trim(p_reason), p_client_request_id
  )
  returning id into audit_log_id;

  fulfillment_id := p_fulfillment_id;
  previous_assignee_profile_id := v_fulfillment.assigned_profile_id;
  current_assignee_profile_id := p_assignee_profile_id;
  idempotency_reused := false;
  return next;
end;
$$;

revoke execute on function public.api_assign_fulfillment(uuid, uuid, uuid, uuid, text, uuid)
  from public, anon;
grant execute on function public.api_assign_fulfillment(uuid, uuid, uuid, uuid, text, uuid)
  to authenticated;

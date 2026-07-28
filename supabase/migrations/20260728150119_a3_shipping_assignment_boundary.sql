-- ADORA Commerce OS (ACOS)
-- Part 2C-C: Shipping assignment boundary
--
-- Owner-approved decisions:
-- - one active organization member/profile owns a shipment;
-- - LABEL_CREATED, READY_FOR_HANDOFF, EXCEPTION, and RTO are blocking;
-- - IN_TRANSIT, DELIVERED, and CANCELLED are non-blocking;
-- - Shipping ownership is independent from fulfillment ownership;
-- - shipping.create is the existing permission boundary;
-- - unassigned open shipping work blocks member suspension.

alter table public.shipments
  add column if not exists assigned_profile_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shipments_assignee_membership_fk'
      and conrelid = 'public.shipments'::regclass
  ) then
    alter table public.shipments
      add constraint shipments_assignee_membership_fk
      foreign key (organization_id, assigned_profile_id)
      references public.organization_memberships (organization_id, profile_id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists shipments_assignee_status_idx
  on public.shipments (organization_id, assigned_profile_id, status, created_at desc);

revoke update on table public.shipments from public, anon, authenticated;

create or replace function public.api_assign_shipment(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_assignee_profile_id uuid,
  p_client_request_id uuid,
  p_reason text,
  p_expected_assignee_profile_id uuid default null
)
returns table (
  shipment_id uuid,
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
  v_shipment record;
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
  if not public.has_org_permission(p_organization_id, 'shipping.create') then
    raise exception 'Missing permission: shipping.create' using errcode = '42501';
  end if;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then
    raise exception 'Active actor profile not found' using errcode = '42501';
  end if;

  select s.id, s.organization_id, s.assigned_profile_id, s.status
  into v_shipment
  from public.shipments s
  where s.id = p_shipment_id and s.organization_id = p_organization_id
  for update;
  if v_shipment.id is null then
    raise exception 'Shipment not found' using errcode = '22023';
  end if;
  if v_shipment.status not in ('LABEL_CREATED', 'READY_FOR_HANDOFF', 'EXCEPTION', 'RTO') then
    raise exception 'Shipment cannot be assigned from status %', v_shipment.status using errcode = '22023';
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
    and al.entity_type = 'shipment'
    and al.entity_id = p_shipment_id
    and al.request_id = p_client_request_id
    and al.action in (
      'admin.shipping.assign',
      'admin.shipping.reassign',
      'admin.shipping.assign.already_assigned',
      'admin.shipping.assignment.duplicate_reused'
    )
  order by al.created_at desc limit 1;

  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'shipment_id' <> p_shipment_id::text
       or v_previous_audit.before_json ->> 'requested_assignee_profile_id' <> p_assignee_profile_id::text
       or v_previous_audit.before_json ->> 'reason' <> trim(p_reason) then
      raise exception 'Idempotency key conflicts with an existing request' using errcode = '22023';
    end if;
    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, v_actor_profile_id, 'USER', 'shipment', p_shipment_id,
      'admin.shipping.assignment.duplicate_reused',
      jsonb_build_object('shipment_id', p_shipment_id,
        'requested_assignee_profile_id', p_assignee_profile_id,
        'original_audit_log_id', v_previous_audit.id, 'reason', trim(p_reason)),
      jsonb_build_object('shipment_id', p_shipment_id,
        'current_assignee_profile_id', v_shipment.assigned_profile_id,
        'idempotency_reused', true),
      trim(p_reason), p_client_request_id
    ) returning id into audit_log_id;
    shipment_id := p_shipment_id;
    previous_assignee_profile_id := nullif(v_previous_audit.after_json ->> 'current_assignee_profile_id', '')::uuid;
    current_assignee_profile_id := v_shipment.assigned_profile_id;
    operation := 'duplicate_reused';
    idempotency_reused := true;
    return next;
    return;
  end if;

  if p_expected_assignee_profile_id is distinct from v_shipment.assigned_profile_id then
    raise exception 'Shipment assignment changed; refresh and retry' using errcode = '40001';
  end if;

  if v_shipment.assigned_profile_id is null then
    v_operation := 'admin.shipping.assign'; operation := 'assign';
  elsif v_shipment.assigned_profile_id = p_assignee_profile_id then
    v_operation := 'admin.shipping.assign.already_assigned'; operation := 'already_assigned';
  else
    v_operation := 'admin.shipping.reassign'; operation := 'reassign';
  end if;

  if v_shipment.assigned_profile_id is distinct from p_assignee_profile_id then
    update public.shipments
    set assigned_profile_id = p_assignee_profile_id
    where id = p_shipment_id and organization_id = p_organization_id;
  end if;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_actor_profile_id, 'USER', 'shipment', p_shipment_id,
    v_operation,
    jsonb_build_object('shipment_id', p_shipment_id,
      'previous_assignee_profile_id', v_shipment.assigned_profile_id,
      'requested_assignee_profile_id', p_assignee_profile_id, 'reason', trim(p_reason)),
    jsonb_build_object('shipment_id', p_shipment_id,
      'current_assignee_profile_id', p_assignee_profile_id,
      'status', v_shipment.status, 'idempotency_reused', false),
    trim(p_reason), p_client_request_id
  ) returning id into audit_log_id;

  shipment_id := p_shipment_id;
  previous_assignee_profile_id := v_shipment.assigned_profile_id;
  current_assignee_profile_id := p_assignee_profile_id;
  idempotency_reused := false;
  return next;
end;
$$;

revoke execute on function public.api_assign_shipment(uuid, uuid, uuid, uuid, text, uuid)
  from public, anon;
grant execute on function public.api_assign_shipment(uuid, uuid, uuid, uuid, text, uuid)
  to authenticated;

create or replace function public.api_deactivate_member(
  p_organization_id uuid,
  p_membership_id uuid,
  p_client_request_id uuid,
  p_reason text
)
returns table (
  membership_id uuid,
  previous_status text,
  current_status text,
  audit_log_id uuid,
  idempotency_reused boolean,
  blocking_work_found boolean,
  blocking_work_domains text[],
  blocking_work_count integer,
  coverage_gaps text[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_profile_id uuid;
  v_membership record;
  v_previous_audit record;
  v_blocking_domains text[] := '{}'::text[];
  v_coverage_gaps text[] := array['returns']::text[];
  v_blocking_count integer := 0;
  v_previous_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_client_request_id is null then raise exception 'Idempotency key is required' using errcode = '22023'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 or length(trim(coalesce(p_reason, ''))) > 500 then
    raise exception 'Reason must be between 10 and 500 characters' using errcode = '22023';
  end if;
  if not public.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'Missing permission: members.manage' using errcode = '42501';
  end if;
  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then raise exception 'Active actor profile not found' using errcode = '42501'; end if;

  select om.id, om.organization_id, om.profile_id, om.status, p.status as profile_status
  into v_membership
  from public.organization_memberships om join public.profiles p on p.id = om.profile_id
  where om.id = p_membership_id and om.organization_id = p_organization_id for update;
  if v_membership.id is null then raise exception 'Membership not found' using errcode = '22023'; end if;
  if v_membership.profile_status <> 'ACTIVE' then raise exception 'Target profile is not active' using errcode = '22023'; end if;
  if v_membership.profile_id = v_actor_profile_id then raise exception 'Self deactivation is not enabled' using errcode = '42501'; end if;
  if exists (
    select 1 from public.membership_roles mr join public.roles r on r.id = mr.role_id
    where mr.membership_id = p_membership_id and r.organization_id = p_organization_id
      and r.status = 'ACTIVE' and lower(r.code) = 'owner'
  ) then raise exception 'Owner or last-authority membership is protected' using errcode = '42501'; end if;

  select al.id, al.before_json, al.after_json into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id and al.entity_type = 'organization_membership'
    and al.entity_id = p_membership_id and al.request_id = p_client_request_id
    and al.action in ('admin.member.deactivate', 'admin.member.deactivate.already_suspended', 'admin.member.deactivate.duplicate_reused')
  order by al.created_at desc limit 1;
  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'membership_id' <> p_membership_id::text
       or v_previous_audit.before_json ->> 'reason' <> trim(p_reason) then
      raise exception 'Idempotency key conflicts with an existing request' using errcode = '22023';
    end if;
    insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, before_json, after_json, reason, request_id)
    values (p_organization_id, v_actor_profile_id, 'USER', 'organization_membership', p_membership_id,
      'admin.member.deactivate.duplicate_reused',
      jsonb_build_object('original_audit_log_id', v_previous_audit.id, 'membership_id', p_membership_id, 'reason', trim(p_reason)),
      jsonb_build_object('membership_id', p_membership_id, 'current_status', v_membership.status, 'idempotency_reused', true),
      trim(p_reason), p_client_request_id) returning id into audit_log_id;
    membership_id := p_membership_id; previous_status := coalesce(v_previous_audit.after_json ->> 'previous_status', v_membership.status);
    current_status := v_membership.status; idempotency_reused := true; blocking_work_found := false;
    blocking_work_domains := '{}'::text[]; blocking_work_count := 0; coverage_gaps := v_coverage_gaps;
    return next; return;
  end if;

  if v_membership.status = 'SUSPENDED' then
    insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, before_json, after_json, reason, request_id)
    values (p_organization_id, v_actor_profile_id, 'USER', 'organization_membership', p_membership_id,
      'admin.member.deactivate.already_suspended',
      jsonb_build_object('membership_id', p_membership_id, 'reason', trim(p_reason)),
      jsonb_build_object('membership_id', p_membership_id, 'previous_status', 'SUSPENDED', 'current_status', 'SUSPENDED'),
      trim(p_reason), p_client_request_id) returning id into audit_log_id;
    membership_id := p_membership_id; previous_status := 'SUSPENDED'; current_status := 'SUSPENDED'; idempotency_reused := false;
    blocking_work_found := false; blocking_work_domains := '{}'::text[]; blocking_work_count := 0; coverage_gaps := v_coverage_gaps;
    return next; return;
  end if;
  if v_membership.status <> 'ACTIVE' then raise exception 'Target membership is not active' using errcode = '22023'; end if;

  select count(*)::integer, coalesce(array_agg(distinct work_domain order by work_domain), '{}'::text[])
  into v_blocking_count, v_blocking_domains
  from (
    select c.id::text work_id, 'conversation'::text work_domain from public.conversations c
    where c.organization_id = p_organization_id and c.assigned_profile_id = v_membership.profile_id and c.status in ('OPEN', 'PENDING', 'WAITING_CUSTOMER')
    union select c.id::text, 'conversation'::text from public.conversation_assignments ca
    join public.conversations c on c.organization_id = ca.organization_id and c.id = ca.conversation_id
    where ca.organization_id = p_organization_id and ca.assigned_profile_id = v_membership.profile_id and ca.unassigned_at is null and c.status in ('OPEN', 'PENDING', 'WAITING_CUSTOMER')
    union select n.id::text, 'notification'::text from public.notifications n
    where n.organization_id = p_organization_id and n.assigned_profile_id = v_membership.profile_id and n.action_required is true and n.status in ('PENDING', 'ACTIVE')
    union select f.id::text, 'fulfillment'::text from public.fulfillments f
    where f.organization_id = p_organization_id and f.assigned_profile_id = v_membership.profile_id and f.status in ('READY_TO_PICK', 'PICKING', 'QC_PENDING', 'QC_PASSED', 'PACKING', 'READY_TO_SHIP')
    union select f.id::text, 'fulfillment'::text from public.fulfillments f
    where f.organization_id = p_organization_id and f.assigned_profile_id is null and f.status in ('READY_TO_PICK', 'PICKING', 'QC_PENDING', 'QC_PASSED', 'PACKING', 'READY_TO_SHIP')
    union select q.id::text, 'qc'::text from public.fulfillment_qc_sessions q
    where q.organization_id = p_organization_id and q.assigned_profile_id = v_membership.profile_id and q.status in ('PENDING', 'IN_PROGRESS', 'FAILED')
    union select q.id::text, 'qc'::text from public.fulfillment_qc_sessions q
    where q.organization_id = p_organization_id and q.assigned_profile_id is null and q.status in ('PENDING', 'IN_PROGRESS', 'FAILED')
    union select s.id::text, 'shipping'::text from public.shipments s
    where s.organization_id = p_organization_id and s.assigned_profile_id = v_membership.profile_id and s.status in ('LABEL_CREATED', 'READY_FOR_HANDOFF', 'EXCEPTION', 'RTO')
    union select s.id::text, 'shipping'::text from public.shipments s
    where s.organization_id = p_organization_id and s.assigned_profile_id is null and s.status in ('LABEL_CREATED', 'READY_FOR_HANDOFF', 'EXCEPTION', 'RTO')
  ) blocking_work;
  if v_blocking_count > 0 then raise exception 'Open assigned or unassigned work blocks deactivation' using errcode = '22023'; end if;
  if cardinality(v_coverage_gaps) > 0 then raise exception 'Open-work coverage is incomplete for deactivation' using errcode = '22023'; end if;

  v_previous_status := v_membership.status;
  update public.organization_memberships set status = 'SUSPENDED'
  where id = p_membership_id and organization_id = p_organization_id and status = 'ACTIVE';
  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, before_json, after_json, reason, request_id)
  values (p_organization_id, v_actor_profile_id, 'USER', 'organization_membership', p_membership_id, 'admin.member.deactivate',
    jsonb_build_object('membership_id', p_membership_id, 'previous_status', v_previous_status, 'reason', trim(p_reason), 'blocking_work_count', v_blocking_count, 'coverage_gaps', v_coverage_gaps),
    jsonb_build_object('membership_id', p_membership_id, 'previous_status', v_previous_status, 'current_status', 'SUSPENDED', 'roles_retained', true),
    trim(p_reason), p_client_request_id) returning id into audit_log_id;
  membership_id := p_membership_id; previous_status := v_previous_status; current_status := 'SUSPENDED'; idempotency_reused := false;
  blocking_work_found := false; blocking_work_domains := v_blocking_domains; blocking_work_count := v_blocking_count; coverage_gaps := v_coverage_gaps;
  return next;
end;
$$;

revoke execute on function public.api_deactivate_member(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.api_deactivate_member(uuid, uuid, uuid, text) to authenticated;

-- ADORA Commerce OS (ACOS)
-- Part 2C-A: Fulfillment assignment boundary
--
-- Approved owner decisions:
-- - one active organization member/profile owns a fulfillment;
-- - warehouse.pick is the existing permission boundary;
-- - READY_TO_PICK through READY_TO_SHIP are blocking fulfillment statuses;
-- - an open fulfillment without an assignee blocks member suspension;
-- - assignment/reassignment is guarded, idempotent, and audited.

alter table public.fulfillments
  add column if not exists assigned_profile_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fulfillments_assignee_membership_fk'
      and conrelid = 'public.fulfillments'::regclass
  ) then
    alter table public.fulfillments
      add constraint fulfillments_assignee_membership_fk
      foreign key (organization_id, assigned_profile_id)
      references public.organization_memberships (organization_id, profile_id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists fulfillments_assignee_status_idx
  on public.fulfillments (organization_id, assigned_profile_id, status, updated_at desc);

-- Fulfillment writes are server/RPC-only. Existing workflow wrappers run as
-- SECURITY DEFINER and continue to update lifecycle fields safely.
revoke update on table public.fulfillments from public, anon, authenticated;

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
    previous_assignee_profile_id := v_previous_audit.after_json ->> 'current_assignee_profile_id';
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

-- Fulfillment is now covered by the approved Part 2C predicate. QC, shipping,
-- and returns remain explicit coverage gaps until their contracts are approved.

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
  v_coverage_gaps text[] := array['qc', 'shipping', 'returns']::text[];
  v_blocking_count integer := 0;
  v_previous_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_reason, ''))) < 10
     or length(trim(coalesce(p_reason, ''))) > 500 then
    raise exception 'Reason must be between 10 and 500 characters' using errcode = '22023';
  end if;

  if not public.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'Missing permission: members.manage' using errcode = '42501';
  end if;

  v_actor_profile_id := public.current_profile_id();

  if v_actor_profile_id is null then
    raise exception 'Active actor profile not found' using errcode = '42501';
  end if;

  select om.id, om.organization_id, om.profile_id, om.status, p.status as profile_status
  into v_membership
  from public.organization_memberships om
  join public.profiles p on p.id = om.profile_id
  where om.id = p_membership_id
    and om.organization_id = p_organization_id
  for update;

  if v_membership.id is null then
    raise exception 'Membership not found' using errcode = '22023';
  end if;

  if v_membership.profile_status <> 'ACTIVE' then
    raise exception 'Target profile is not active' using errcode = '22023';
  end if;

  if v_membership.profile_id = v_actor_profile_id then
    raise exception 'Self deactivation is not enabled' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.membership_roles mr
    join public.roles r on r.id = mr.role_id
    where mr.membership_id = p_membership_id
      and r.organization_id = p_organization_id
      and r.status = 'ACTIVE'
      and lower(r.code) = 'owner'
  ) then
    raise exception 'Owner or last-authority membership is protected' using errcode = '42501';
  end if;

  select al.id, al.before_json, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'organization_membership'
    and al.entity_id = p_membership_id
    and al.request_id = p_client_request_id
    and al.action in (
      'admin.member.deactivate',
      'admin.member.deactivate.already_suspended',
      'admin.member.deactivate.duplicate_reused'
    )
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'membership_id' <> p_membership_id::text
       or v_previous_audit.before_json ->> 'reason' <> trim(p_reason) then
      raise exception 'Idempotency key conflicts with an existing request' using errcode = '22023';
    end if;

    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, v_actor_profile_id, 'USER', 'organization_membership', p_membership_id,
      'admin.member.deactivate.duplicate_reused',
      jsonb_build_object('original_audit_log_id', v_previous_audit.id,
        'membership_id', p_membership_id, 'reason', trim(p_reason)),
      jsonb_build_object('membership_id', p_membership_id,
        'current_status', v_membership.status, 'idempotency_reused', true),
      trim(p_reason), p_client_request_id
    )
    returning id into audit_log_id;

    membership_id := p_membership_id;
    previous_status := coalesce(v_previous_audit.after_json ->> 'previous_status', v_membership.status);
    current_status := v_membership.status;
    idempotency_reused := true;
    blocking_work_found := false;
    blocking_work_domains := '{}'::text[];
    blocking_work_count := 0;
    coverage_gaps := v_coverage_gaps;
    return next;
    return;
  end if;

  if v_membership.status = 'SUSPENDED' then
    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, v_actor_profile_id, 'USER', 'organization_membership', p_membership_id,
      'admin.member.deactivate.already_suspended',
      jsonb_build_object('membership_id', p_membership_id, 'reason', trim(p_reason)),
      jsonb_build_object('membership_id', p_membership_id,
        'previous_status', 'SUSPENDED', 'current_status', 'SUSPENDED'),
      trim(p_reason), p_client_request_id
    )
    returning id into audit_log_id;

    membership_id := p_membership_id;
    previous_status := 'SUSPENDED';
    current_status := 'SUSPENDED';
    idempotency_reused := false;
    blocking_work_found := false;
    blocking_work_domains := '{}'::text[];
    blocking_work_count := 0;
    coverage_gaps := v_coverage_gaps;
    return next;
    return;
  end if;

  if v_membership.status <> 'ACTIVE' then
    raise exception 'Target membership is not active' using errcode = '22023';
  end if;

  select count(*)::integer,
         coalesce(array_agg(distinct work_domain order by work_domain), '{}'::text[])
  into v_blocking_count, v_blocking_domains
  from (
    select c.id::text as work_id, 'conversation'::text as work_domain
    from public.conversations c
    where c.organization_id = p_organization_id
      and c.assigned_profile_id = v_membership.profile_id
      and c.status in ('OPEN', 'PENDING', 'WAITING_CUSTOMER')
    union
    select c.id::text as work_id, 'conversation'::text as work_domain
    from public.conversation_assignments ca
    join public.conversations c on c.organization_id = ca.organization_id and c.id = ca.conversation_id
    where ca.organization_id = p_organization_id
      and ca.assigned_profile_id = v_membership.profile_id
      and ca.unassigned_at is null
      and c.status in ('OPEN', 'PENDING', 'WAITING_CUSTOMER')
    union
    select n.id::text as work_id, 'notification'::text as work_domain
    from public.notifications n
    where n.organization_id = p_organization_id
      and n.assigned_profile_id = v_membership.profile_id
      and n.action_required is true
      and n.status in ('PENDING', 'ACTIVE')
    union
    select f.id::text as work_id, 'fulfillment'::text as work_domain
    from public.fulfillments f
    where f.organization_id = p_organization_id
      and f.assigned_profile_id = v_membership.profile_id
      and f.status in ('READY_TO_PICK', 'PICKING', 'QC_PENDING', 'QC_PASSED', 'PACKING', 'READY_TO_SHIP')
    union
    select f.id::text as work_id, 'fulfillment'::text as work_domain
    from public.fulfillments f
    where f.organization_id = p_organization_id
      and f.assigned_profile_id is null
      and f.status in ('READY_TO_PICK', 'PICKING', 'QC_PENDING', 'QC_PASSED', 'PACKING', 'READY_TO_SHIP')
  ) blocking_work;

  if v_blocking_count > 0 then
    raise exception 'Open assigned or unassigned work blocks deactivation' using errcode = '22023';
  end if;

  if cardinality(v_coverage_gaps) > 0 then
    raise exception 'Open-work coverage is incomplete for deactivation' using errcode = '22023';
  end if;

  v_previous_status := v_membership.status;

  update public.organization_memberships
  set status = 'SUSPENDED'
  where id = p_membership_id
    and organization_id = p_organization_id
    and status = 'ACTIVE';

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_actor_profile_id, 'USER', 'organization_membership', p_membership_id,
    'admin.member.deactivate',
    jsonb_build_object('membership_id', p_membership_id, 'previous_status', v_previous_status,
      'reason', trim(p_reason), 'blocking_work_count', v_blocking_count, 'coverage_gaps', v_coverage_gaps),
    jsonb_build_object('membership_id', p_membership_id, 'previous_status', v_previous_status,
      'current_status', 'SUSPENDED', 'roles_retained', true),
    trim(p_reason), p_client_request_id
  )
  returning id into audit_log_id;

  membership_id := p_membership_id;
  previous_status := v_previous_status;
  current_status := 'SUSPENDED';
  idempotency_reused := false;
  blocking_work_found := false;
  blocking_work_domains := v_blocking_domains;
  blocking_work_count := v_blocking_count;
  coverage_gaps := v_coverage_gaps;
  return next;
end;
$$;

revoke execute on function public.api_deactivate_member(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.api_deactivate_member(uuid, uuid, uuid, text)
  to authenticated;

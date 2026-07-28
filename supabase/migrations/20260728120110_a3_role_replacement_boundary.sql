-- ADORA Commerce OS (ACOS)
-- Part 2A: A3 role replacement guarded database boundary
--
-- Deactivation remains intentionally out of scope for this migration because
-- the frozen schema has no canonical open-work predicate for a member.

create or replace function public.api_replace_member_role(
  p_organization_id uuid,
  p_membership_id uuid,
  p_source_role_id uuid,
  p_replacement_role_id uuid,
  p_client_request_id uuid,
  p_reason text
)
returns table (
  membership_id uuid,
  source_role_id uuid,
  replacement_role_id uuid,
  role_replaced boolean,
  already_replaced boolean,
  audit_log_id uuid,
  idempotency_reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_profile_id uuid;
  v_membership record;
  v_source_role record;
  v_replacement_role record;
  v_source_assigned boolean;
  v_replacement_assigned boolean;
  v_role_count_before integer;
  v_before_roles jsonb;
  v_previous_audit record;
  v_action text;
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

  if p_source_role_id = p_replacement_role_id then
    raise exception 'Source and replacement roles must differ' using errcode = '22023';
  end if;

  if not public.has_org_permission(p_organization_id, 'members.manage') then
    raise exception 'Missing permission: members.manage' using errcode = '42501';
  end if;

  v_actor_profile_id := public.current_profile_id();

  if v_actor_profile_id is null then
    raise exception 'Active actor profile not found' using errcode = '42501';
  end if;

  select
    om.id,
    om.organization_id,
    om.profile_id,
    om.status,
    p.status as profile_status
  into v_membership
  from public.organization_memberships om
  join public.profiles p on p.id = om.profile_id
  where om.id = p_membership_id
    and om.organization_id = p_organization_id
  for update;

  if v_membership.id is null then
    raise exception 'Membership not found' using errcode = '22023';
  end if;

  if v_membership.status <> 'ACTIVE' or v_membership.profile_status <> 'ACTIVE' then
    raise exception 'Target membership is not active' using errcode = '22023';
  end if;

  if v_membership.profile_id = v_actor_profile_id then
    raise exception 'Self role replacement is not enabled' using errcode = '22023';
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

  select r.id, r.organization_id, r.code, r.name, r.status, r.is_system_role
  into v_source_role
  from public.roles r
  where r.id = p_source_role_id
    and r.organization_id = p_organization_id
  for update;

  if v_source_role.id is null then
    raise exception 'Source role not found' using errcode = '22023';
  end if;

  if v_source_role.status <> 'ACTIVE' then
    raise exception 'Source role is not active' using errcode = '22023';
  end if;

  if v_source_role.is_system_role or lower(v_source_role.code) = 'owner' then
    raise exception 'System or owner role replacement is not enabled' using errcode = '42501';
  end if;

  select r.id, r.organization_id, r.code, r.name, r.status, r.is_system_role
  into v_replacement_role
  from public.roles r
  where r.id = p_replacement_role_id
    and r.organization_id = p_organization_id
  for update;

  if v_replacement_role.id is null then
    raise exception 'Replacement role not found' using errcode = '22023';
  end if;

  if v_replacement_role.status <> 'ACTIVE' then
    raise exception 'Replacement role is not active' using errcode = '22023';
  end if;

  if v_replacement_role.is_system_role or lower(v_replacement_role.code) = 'owner' then
    raise exception 'System or owner role assignment is not enabled' using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.membership_roles mr
    where mr.membership_id = p_membership_id
      and mr.role_id = p_source_role_id
  )
  into v_source_assigned;

  select exists (
    select 1
    from public.membership_roles mr
    where mr.membership_id = p_membership_id
      and mr.role_id = p_replacement_role_id
  )
  into v_replacement_assigned;

  select count(*)
  into v_role_count_before
  from public.membership_roles mr
  where mr.membership_id = p_membership_id;

  select coalesce(jsonb_agg(mr.role_id order by mr.role_id), '[]'::jsonb)
  into v_before_roles
  from public.membership_roles mr
  where mr.membership_id = p_membership_id;

  select al.id, al.action, al.before_json, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'organization_membership'
    and al.entity_id = p_membership_id
    and al.request_id = p_client_request_id
    and al.action in ('admin.member.role.replace', 'admin.member.role.replace.duplicate_reused')
  order by al.created_at desc
  limit 1;

  if v_previous_audit.id is not null then
    if v_previous_audit.before_json ->> 'source_role_id' <> p_source_role_id::text
       or v_previous_audit.before_json ->> 'replacement_role_id' <> p_replacement_role_id::text
       or v_previous_audit.before_json ->> 'reason' <> trim(p_reason) then
      raise exception 'Idempotency key conflicts with an existing request' using errcode = '22023';
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
      v_actor_profile_id,
      'USER',
      'organization_membership',
      p_membership_id,
      'admin.member.role.replace.duplicate_reused',
      jsonb_build_object(
        'original_audit_log_id', v_previous_audit.id,
        'source_role_id', p_source_role_id,
        'replacement_role_id', p_replacement_role_id,
        'reason', trim(p_reason)
      ),
      jsonb_build_object(
        'membership_id', p_membership_id,
        'source_role_id', p_source_role_id,
        'replacement_role_id', p_replacement_role_id,
        'idempotency_reused', true
      ),
      trim(p_reason),
      p_client_request_id
    )
    returning id into audit_log_id;

    membership_id := p_membership_id;
    source_role_id := p_source_role_id;
    replacement_role_id := p_replacement_role_id;
    role_replaced := false;
    already_replaced := true;
    idempotency_reused := true;
    return next;
    return;
  end if;

  if not v_source_assigned and v_replacement_assigned then
    v_action := 'admin.member.role.replace.duplicate_reused';
  elsif not v_source_assigned then
    raise exception 'Source role is not assigned to target membership' using errcode = '22023';
  else
    v_action := 'admin.member.role.replace';
    delete from public.membership_roles mr
    where mr.membership_id = p_membership_id
      and mr.role_id = p_source_role_id;

    if not v_replacement_assigned then
      insert into public.membership_roles (membership_id, role_id)
      values (p_membership_id, p_replacement_role_id);
    end if;
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
    v_actor_profile_id,
    'USER',
    'organization_membership',
    p_membership_id,
    v_action,
    jsonb_build_object(
      'membership_id', p_membership_id,
      'source_role_id', p_source_role_id,
      'replacement_role_id', p_replacement_role_id,
      'reason', trim(p_reason),
      'role_ids', v_before_roles,
      'role_count_before', v_role_count_before
    ),
    jsonb_build_object(
      'membership_id', p_membership_id,
      'source_role_id', p_source_role_id,
      'replacement_role_id', p_replacement_role_id,
      'role_replaced', v_action = 'admin.member.role.replace',
      'already_replaced', v_action = 'admin.member.role.replace.duplicate_reused',
      'role_ids', coalesce((
        select jsonb_agg(mr.role_id order by mr.role_id)
        from public.membership_roles mr
        where mr.membership_id = p_membership_id
      ), '[]'::jsonb)
    ),
    trim(p_reason),
    p_client_request_id
  )
  returning id into audit_log_id;

  membership_id := p_membership_id;
  source_role_id := p_source_role_id;
  replacement_role_id := p_replacement_role_id;
  role_replaced := v_action = 'admin.member.role.replace';
  already_replaced := v_action = 'admin.member.role.replace.duplicate_reused';
  idempotency_reused := false;
  return next;
end;
$$;

revoke execute on function public.api_replace_member_role(uuid, uuid, uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.api_replace_member_role(uuid, uuid, uuid, uuid, uuid, text)
  to authenticated;

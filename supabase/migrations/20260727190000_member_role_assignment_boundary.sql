-- ADORA Commerce OS (ACOS)
-- A3 member role assignment guarded action boundary
--
-- Purpose:
-- - Assign one active non-system role to one active organization membership.
-- - Keep mutation behind an authenticated SECURITY DEFINER RPC with members.manage.
-- - Preserve tenant isolation, idempotency, and append-only audit.
-- - Keep role removal, self-assignment, system-role assignment, and role catalog edits out of scope.

create or replace function public.api_assign_member_role(
  p_organization_id uuid,
  p_membership_id uuid,
  p_role_id uuid,
  p_client_request_id uuid default null,
  p_reason text default null
)
returns table (
  membership_id uuid,
  role_id uuid,
  role_assigned boolean,
  already_assigned boolean,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_membership record;
  v_role record;
  v_already_assigned boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
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
    p.display_name,
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
    raise exception 'Self role assignment is not enabled' using errcode = '22023';
  end if;

  select r.id, r.organization_id, r.code, r.name, r.status, r.is_system_role
  into v_role
  from public.roles r
  where r.id = p_role_id
    and r.organization_id = p_organization_id
  limit 1;

  if v_role.id is null then
    raise exception 'Role not found' using errcode = '22023';
  end if;

  if v_role.status <> 'ACTIVE' then
    raise exception 'Role is not active' using errcode = '22023';
  end if;

  if v_role.is_system_role then
    raise exception 'System role assignment is not enabled' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.membership_roles mr
    where mr.membership_id = p_membership_id
      and mr.role_id = p_role_id
  )
  into v_already_assigned;

  if not v_already_assigned then
    insert into public.membership_roles (membership_id, role_id)
    values (p_membership_id, p_role_id);
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
    case
      when v_already_assigned then 'admin.member.role.assign.duplicate_reused'
      else 'admin.member.role.assign'
    end,
    jsonb_build_object(
      'membership_id', p_membership_id,
      'role_id', p_role_id,
      'already_assigned', v_already_assigned
    ),
    jsonb_build_object(
      'membership_id', p_membership_id,
      'profile_id', v_membership.profile_id,
      'role_id', p_role_id,
      'role_code', v_role.code,
      'role_name', v_role.name,
      'role_assigned', not v_already_assigned,
      'already_assigned', v_already_assigned
    ),
    coalesce(nullif(trim(p_reason), ''), 'member_role_assigned'),
    p_client_request_id
  )
  returning id into audit_log_id;

  membership_id := p_membership_id;
  role_id := p_role_id;
  role_assigned := not v_already_assigned;
  already_assigned := v_already_assigned;
  return next;
end;
$$;

revoke execute on function public.api_assign_member_role(uuid, uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.api_assign_member_role(uuid, uuid, uuid, uuid, text)
  to authenticated;

-- Guarded customer-profile link lifecycle.
-- Request is authenticated + permission guarded; activation is server-only.

create or replace function public.api_request_customer_profile_link(
  p_organization_id uuid,
  p_customer_id uuid,
  p_profile_id uuid,
  p_client_request_id uuid,
  p_reason text
)
returns table (
  link_id uuid,
  link_status varchar,
  reused_existing boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_existing_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Link reason is required' using errcode = '22023';
  end if;

  if not public.has_org_permission(p_organization_id, 'customer.edit') then
    raise exception 'Missing permission: customer.edit' using errcode = '42501';
  end if;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.customers c
    where c.organization_id = p_organization_id
      and c.id = p_customer_id
      and c.status = 'ACTIVE'
  ) then
    raise exception 'Active customer not found in organization' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.organization_memberships om
    join public.profiles p on p.id = om.profile_id
    where om.organization_id = p_organization_id
      and om.profile_id = p_profile_id
      and om.status = 'ACTIVE'
      and p.status = 'ACTIVE'
  ) then
    raise exception 'Active target profile membership not found' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_organization_id::text || ':' || p_customer_id::text || ':' || p_profile_id::text));

  select cpl.id
  into v_existing_id
  from public.customer_profile_links cpl
  where cpl.organization_id = p_organization_id
    and cpl.customer_id = p_customer_id
    and cpl.profile_id = p_profile_id
    and cpl.link_status = 'PENDING'
  order by cpl.created_at desc
  limit 1
  for update;

  if v_existing_id is not null then
    insert into public.audit_logs (
      organization_id, actor_profile_id, actor_type, entity_type, entity_id,
      action, before_json, after_json, reason, request_id
    ) values (
      p_organization_id, v_actor_profile_id, 'USER', 'customer_profile_link', v_existing_id,
      'customer.profile_link.request.duplicate_reused',
      jsonb_build_object('link_id', v_existing_id, 'link_status', 'PENDING'),
      jsonb_build_object('link_id', v_existing_id, 'link_status', 'PENDING'),
      left(trim(p_reason), 500), p_client_request_id
    );

    link_id := v_existing_id;
    link_status := 'PENDING';
    reused_existing := true;
    return next;
    return;
  end if;

  insert into public.customer_profile_links (
    organization_id, customer_id, profile_id, link_status, link_source,
    verification_method, created_by
  ) values (
    p_organization_id, p_customer_id, p_profile_id, 'PENDING', 'OWNER',
    'OWNER_REVIEW_PENDING', v_actor_profile_id
  ) returning id, customer_profile_links.link_status
  into link_id, link_status;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_actor_profile_id, 'USER', 'customer_profile_link', link_id,
    'customer.profile_link.request', null,
    jsonb_build_object(
      'organization_id', p_organization_id,
      'customer_id', p_customer_id,
      'profile_id', p_profile_id,
      'link_status', link_status,
      'verification_method', 'OWNER_REVIEW_PENDING'
    ),
    left(trim(p_reason), 500), p_client_request_id
  );

  reused_existing := false;
  return next;
end;
$$;

create or replace function public.api_activate_customer_profile_link(
  p_organization_id uuid,
  p_link_id uuid,
  p_verification_method text,
  p_client_request_id uuid
)
returns table (
  link_id uuid,
  link_status varchar,
  idempotency_reused boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_service_role boolean;
  v_link record;
  v_previous_audit record;
begin
  v_is_service_role := current_setting('request.jwt.claim.role', true) = 'service_role';
  if not v_is_service_role then
    raise exception 'Customer profile link activation requires server service boundary' using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_verification_method, ''))) < 3 then
    raise exception 'Verification method is required' using errcode = '22023';
  end if;

  select al.entity_id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'customer_profile_link'
    and al.request_id = p_client_request_id
    and al.action = 'customer.profile_link.activate'
  order by al.created_at desc
  limit 1;

  if v_previous_audit.entity_id is not null then
    link_id := v_previous_audit.entity_id;
    link_status := coalesce(v_previous_audit.after_json ->> 'link_status', 'ACTIVE');
    idempotency_reused := true;
    return next;
    return;
  end if;

  select cpl.*
  into v_link
  from public.customer_profile_links cpl
  where cpl.organization_id = p_organization_id
    and cpl.id = p_link_id
  for update;

  if v_link.id is null then
    raise exception 'Customer profile link not found' using errcode = '22023';
  end if;

  if v_link.link_status <> 'PENDING' then
    raise exception 'Only pending customer profile links can be activated' using errcode = '22023';
  end if;

  update public.customer_profile_links
  set link_status = 'ACTIVE',
      verification_method = left(trim(p_verification_method), 50),
      verified_at = now(),
      revoked_at = null
  where id = p_link_id;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'customer_profile_link', p_link_id,
    'customer.profile_link.activate',
    jsonb_build_object('link_status', 'PENDING'),
    jsonb_build_object(
      'link_status', 'ACTIVE',
      'customer_id', v_link.customer_id,
      'profile_id', v_link.profile_id,
      'verification_method', left(trim(p_verification_method), 50)
    ),
    'customer_profile_link_verified', p_client_request_id
  );

  link_id := p_link_id;
  link_status := 'ACTIVE';
  idempotency_reused := false;
  return next;
end;
$$;

create or replace function public.api_revoke_customer_profile_link(
  p_organization_id uuid,
  p_link_id uuid,
  p_client_request_id uuid,
  p_reason text
)
returns table (
  link_id uuid,
  link_status varchar,
  idempotency_reused boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid;
  v_link record;
  v_previous_audit record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_client_request_id is null then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Revoke reason is required' using errcode = '22023';
  end if;

  if not public.has_org_permission(p_organization_id, 'customer.edit') then
    raise exception 'Missing permission: customer.edit' using errcode = '42501';
  end if;

  v_actor_profile_id := public.current_profile_id();
  if v_actor_profile_id is null then
    raise exception 'Active profile not found' using errcode = '42501';
  end if;

  select al.entity_id, al.after_json
  into v_previous_audit
  from public.audit_logs al
  where al.organization_id = p_organization_id
    and al.entity_type = 'customer_profile_link'
    and al.request_id = p_client_request_id
    and al.action = 'customer.profile_link.revoke'
  order by al.created_at desc
  limit 1;

  if v_previous_audit.entity_id is not null then
    link_id := v_previous_audit.entity_id;
    link_status := coalesce(v_previous_audit.after_json ->> 'link_status', 'REVOKED');
    idempotency_reused := true;
    return next;
    return;
  end if;

  select cpl.*
  into v_link
  from public.customer_profile_links cpl
  where cpl.organization_id = p_organization_id
    and cpl.id = p_link_id
  for update;

  if v_link.id is null then
    raise exception 'Customer profile link not found' using errcode = '22023';
  end if;

  if v_link.link_status = 'REVOKED' then
    raise exception 'Customer profile link is already revoked' using errcode = '22023';
  end if;

  update public.customer_profile_links
  set link_status = 'REVOKED',
      revoked_at = now()
  where id = p_link_id;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, before_json, after_json, reason, request_id
  ) values (
    p_organization_id, v_actor_profile_id, 'USER', 'customer_profile_link', p_link_id,
    'customer.profile_link.revoke',
    jsonb_build_object('link_status', v_link.link_status),
    jsonb_build_object('link_status', 'REVOKED'),
    left(trim(p_reason), 500), p_client_request_id
  );

  link_id := p_link_id;
  link_status := 'REVOKED';
  idempotency_reused := false;
  return next;
end;
$$;

revoke execute on function public.api_request_customer_profile_link(uuid, uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.api_request_customer_profile_link(uuid, uuid, uuid, uuid, text)
  to authenticated;

revoke execute on function public.api_activate_customer_profile_link(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.api_activate_customer_profile_link(uuid, uuid, text, uuid)
  to service_role;

revoke execute on function public.api_revoke_customer_profile_link(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.api_revoke_customer_profile_link(uuid, uuid, uuid, text)
  to authenticated;

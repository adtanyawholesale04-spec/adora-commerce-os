-- Customer Portal Part 2: guarded CRM contact synchronization boundary.
-- The verified Auth value may fill an empty canonical CRM contact only.

create or replace function public.api_sync_applied_customer_contact_to_crm(
  p_organization_id uuid,
  p_request_id uuid,
  p_client_request_id uuid default null
)
returns table (
  request_id uuid,
  customer_id uuid,
  contact_type text,
  sync_result text,
  reused_existing boolean
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_request record;
  v_customer record;
  v_existing_result text;
  v_current_normalized text;
  v_result text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  if p_organization_id is null or p_request_id is null then
    raise exception 'Organization and request are required' using errcode = '22023';
  end if;

  if p_client_request_id is not null then
    select a.after_json ->> 'sync_result'
    into v_existing_result
    from public.audit_logs a
    where a.organization_id = p_organization_id
      and a.request_id = p_client_request_id
      and a.entity_type = 'CUSTOMER_CONTACT_CHANGE_REQUEST'
      and a.entity_id = p_request_id
      and a.action = 'CUSTOMER_CONTACT_CRM_SYNC'
    order by a.created_at desc
    limit 1;

    if v_existing_result is not null then
      select r.customer_id, r.contact_type
      into v_request
      from public.customer_contact_change_requests r
      where r.organization_id = p_organization_id and r.id = p_request_id;

      return query select p_request_id, v_request.customer_id, v_request.contact_type::text,
        v_existing_result, true;
      return;
    end if;
  end if;

  select r.*
  into v_request
  from public.customer_contact_change_requests r
  where r.organization_id = p_organization_id and r.id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Contact change request not found' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_organization_id::text || ':' || v_request.customer_id::text || ':' || v_request.contact_type, 0
  ));

  if v_request.status <> 'APPLIED' then
    v_result := 'contact_request_not_applied';
  elsif not exists (
    select 1
    from public.customer_profile_links l
    join public.organization_memberships om
      on om.organization_id = l.organization_id
      and om.profile_id = l.profile_id
      and om.status = 'ACTIVE'
    where l.organization_id = p_organization_id
      and l.customer_id = v_request.customer_id
      and l.profile_id = v_request.profile_id
      and l.link_status = 'ACTIVE'
  ) then
    v_result := 'customer_link_not_active';
  else
    select c.*
    into v_customer
    from public.customers c
    where c.organization_id = p_organization_id and c.id = v_request.customer_id
    for update;

    if v_customer.id is null then
      raise exception 'Tenant-scoped customer not found' using errcode = '42501';
    elsif v_customer.status <> 'ACTIVE' then
      v_result := 'customer_not_active';
    elsif exists (
      select 1
      from public.customers duplicate_customer
      where duplicate_customer.organization_id = p_organization_id
        and duplicate_customer.id <> v_request.customer_id
        and (
          (v_request.contact_type = 'EMAIL' and coalesce(
            nullif(duplicate_customer.email_normalized, ''),
            nullif(lower(trim(duplicate_customer.email)), '')
          ) = v_request.normalized_value)
          or
          (v_request.contact_type = 'PHONE' and coalesce(
            nullif(duplicate_customer.phone_normalized, ''),
            nullif(regexp_replace(trim(duplicate_customer.phone), '[^0-9+]', '', 'g'), '')
          ) = v_request.normalized_value)
        )
    ) then
      v_result := 'crm_duplicate_contact_conflict';
    else
      v_current_normalized := case
        when v_request.contact_type = 'EMAIL' then coalesce(
          nullif(v_customer.email_normalized, ''),
          nullif(lower(trim(v_customer.email)), '')
        )
        else coalesce(
          nullif(v_customer.phone_normalized, ''),
          nullif(regexp_replace(trim(v_customer.phone), '[^0-9+]', '', 'g'), '')
        )
      end;

      if v_current_normalized = v_request.normalized_value then
        v_result := 'already_matching';
      elsif v_current_normalized is not null
        or (v_request.contact_type = 'EMAIL' and nullif(trim(v_customer.email), '') is not null)
        or (v_request.contact_type = 'PHONE' and nullif(trim(v_customer.phone), '') is not null)
      then
        v_result := 'crm_contact_conflict';
      else
        if v_request.contact_type = 'EMAIL' then
          update public.customers
          set email = v_request.requested_value,
              email_normalized = v_request.normalized_value,
              updated_at = now()
          where organization_id = p_organization_id and id = v_request.customer_id;
        else
          update public.customers
          set phone = v_request.requested_value,
              phone_normalized = v_request.normalized_value,
              updated_at = now()
          where organization_id = p_organization_id and id = v_request.customer_id;
        end if;
        v_result := 'synced';
      end if;
    end if;
  end if;

  insert into public.audit_logs (
    organization_id, actor_profile_id, actor_type, entity_type, entity_id,
    action, after_json, reason, request_id
  ) values (
    p_organization_id, null, 'SYSTEM', 'CUSTOMER_CONTACT_CHANGE_REQUEST', p_request_id,
    'CUSTOMER_CONTACT_CRM_SYNC',
    jsonb_build_object(
      'customer_id', v_request.customer_id,
      'contact_type', v_request.contact_type,
      'sync_result', v_result
    ),
    'Guarded CRM contact synchronization', p_client_request_id
  );

  return query select p_request_id, v_request.customer_id, v_request.contact_type::text,
    v_result, false;
end;
$$;

revoke all on function public.api_sync_applied_customer_contact_to_crm(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.api_sync_applied_customer_contact_to_crm(uuid, uuid, uuid)
to service_role;

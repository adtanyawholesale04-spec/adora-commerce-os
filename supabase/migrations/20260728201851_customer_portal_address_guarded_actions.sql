-- Customer Portal address mutations.
-- Addresses are customer-owned PII; all writes stay behind authenticated RPCs.

create or replace function public.api_create_customer_portal_address(
  p_organization_id uuid,
  p_label varchar,
  p_recipient_name varchar,
  p_phone varchar,
  p_address_line1 text,
  p_address_line2 text default null,
  p_subdistrict varchar default null,
  p_district varchar default null,
  p_province varchar default null,
  p_postal_code varchar default null,
  p_country_code varchar default 'TH',
  p_is_default boolean default false,
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_address_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_organization_id is null or nullif(trim(p_recipient_name), '') is null
     or nullif(trim(p_phone), '') is null or nullif(trim(p_address_line1), '') is null then
    raise exception 'Recipient, phone, and address are required' using errcode = '22023';
  end if;
  v_profile_id := public.current_profile_id();
  select l.customer_id into v_customer_id
  from public.customer_profile_links l
  join public.organization_memberships om on om.organization_id = l.organization_id and om.profile_id = l.profile_id and om.status = 'ACTIVE'
  where l.organization_id = p_organization_id and l.profile_id = v_profile_id and l.link_status = 'ACTIVE'
  limit 1;
  if v_customer_id is null then raise exception 'Active customer link required' using errcode = '42501'; end if;

  if p_client_request_id is not null and exists (
    select 1 from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_PORTAL_ADDRESS_CREATE'
  ) then
    select entity_id into v_address_id from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_PORTAL_ADDRESS_CREATE' order by created_at desc limit 1;
    return jsonb_build_object('address_id', v_address_id, 'reused_existing', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || v_customer_id::text, 0));
  if p_is_default then
    update public.customer_addresses set is_default = false
    where organization_id = p_organization_id and customer_id = v_customer_id and status = 'ACTIVE';
  end if;
  insert into public.customer_addresses (
    organization_id, customer_id, label, recipient_name, phone, address_line1, address_line2,
    subdistrict, district, province, postal_code, country_code, is_default, status
  ) values (
    p_organization_id, v_customer_id, nullif(trim(p_label), ''), trim(p_recipient_name), trim(p_phone), trim(p_address_line1), p_address_line2,
    p_subdistrict, p_district, p_province, p_postal_code, coalesce(nullif(trim(p_country_code), ''), 'TH'), p_is_default, 'ACTIVE'
  ) returning id into v_address_id;

  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, after_json, reason, request_id)
  values (p_organization_id, v_profile_id, 'USER', 'CUSTOMER_ADDRESS', v_address_id, 'CUSTOMER_PORTAL_ADDRESS_CREATE',
    jsonb_build_object('customer_id', v_customer_id, 'is_default', p_is_default, 'status', 'ACTIVE'), 'Customer Portal address create', p_client_request_id);
  return jsonb_build_object('address_id', v_address_id, 'reused_existing', false);
end;
$$;

create or replace function public.api_update_customer_portal_address(
  p_organization_id uuid,
  p_address_id uuid,
  p_label varchar,
  p_recipient_name varchar,
  p_phone varchar,
  p_address_line1 text,
  p_address_line2 text default null,
  p_subdistrict varchar default null,
  p_district varchar default null,
  p_province varchar default null,
  p_postal_code varchar default null,
  p_country_code varchar default 'TH',
  p_is_default boolean default false,
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_address_customer_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_address_id is null or nullif(trim(p_recipient_name), '') is null or nullif(trim(p_phone), '') is null or nullif(trim(p_address_line1), '') is null then
    raise exception 'Address and recipient fields are required' using errcode = '22023';
  end if;
  v_profile_id := public.current_profile_id();
  select l.customer_id into v_customer_id
  from public.customer_profile_links l
  join public.organization_memberships om on om.organization_id = l.organization_id and om.profile_id = l.profile_id and om.status = 'ACTIVE'
  where l.organization_id = p_organization_id and l.profile_id = v_profile_id and l.link_status = 'ACTIVE'
  limit 1;
  if v_customer_id is null then raise exception 'Active customer link required' using errcode = '42501'; end if;

  if p_client_request_id is not null and exists (
    select 1 from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_PORTAL_ADDRESS_UPDATE'
  ) then
    return jsonb_build_object('address_id', p_address_id, 'reused_existing', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || v_customer_id::text, 0));
  select customer_id into v_address_customer_id from public.customer_addresses
  where organization_id = p_organization_id and id = p_address_id and status = 'ACTIVE';
  if v_address_customer_id is distinct from v_customer_id then raise exception 'Address ownership denied' using errcode = '42501'; end if;
  if p_is_default then
    update public.customer_addresses set is_default = false
    where organization_id = p_organization_id and customer_id = v_customer_id and status = 'ACTIVE' and id <> p_address_id;
  end if;
  update public.customer_addresses set
    label = nullif(trim(p_label), ''), recipient_name = trim(p_recipient_name), phone = trim(p_phone), address_line1 = trim(p_address_line1),
    address_line2 = p_address_line2, subdistrict = p_subdistrict, district = p_district, province = p_province, postal_code = p_postal_code,
    country_code = coalesce(nullif(trim(p_country_code), ''), 'TH'), is_default = p_is_default
  where organization_id = p_organization_id and id = p_address_id and customer_id = v_customer_id and status = 'ACTIVE';

  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, after_json, reason, request_id)
  values (p_organization_id, v_profile_id, 'USER', 'CUSTOMER_ADDRESS', p_address_id, 'CUSTOMER_PORTAL_ADDRESS_UPDATE',
    jsonb_build_object('customer_id', v_customer_id, 'is_default', p_is_default, 'status', 'ACTIVE'), 'Customer Portal address update', p_client_request_id);
  return jsonb_build_object('address_id', p_address_id, 'reused_existing', false);
end;
$$;

create or replace function public.api_archive_customer_portal_address(
  p_organization_id uuid,
  p_address_id uuid,
  p_client_request_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_address_customer_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_profile_id := public.current_profile_id();
  select l.customer_id into v_customer_id
  from public.customer_profile_links l
  join public.organization_memberships om on om.organization_id = l.organization_id and om.profile_id = l.profile_id and om.status = 'ACTIVE'
  where l.organization_id = p_organization_id and l.profile_id = v_profile_id and l.link_status = 'ACTIVE'
  limit 1;
  if v_customer_id is null then raise exception 'Active customer link required' using errcode = '42501'; end if;

  if p_client_request_id is not null and exists (
    select 1 from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_PORTAL_ADDRESS_ARCHIVE'
  ) then
    return jsonb_build_object('address_id', p_address_id, 'reused_existing', true);
  end if;

  select customer_id into v_address_customer_id from public.customer_addresses
  where organization_id = p_organization_id and id = p_address_id and status = 'ACTIVE';
  if v_address_customer_id is distinct from v_customer_id then raise exception 'Address ownership denied' using errcode = '42501'; end if;
  update public.customer_addresses set status = 'ARCHIVED', is_default = false
  where organization_id = p_organization_id and id = p_address_id and customer_id = v_customer_id and status = 'ACTIVE';
  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, before_json, after_json, reason, request_id)
  values (p_organization_id, v_profile_id, 'USER', 'CUSTOMER_ADDRESS', p_address_id, 'CUSTOMER_PORTAL_ADDRESS_ARCHIVE',
    jsonb_build_object('customer_id', v_customer_id, 'status', 'ACTIVE'), jsonb_build_object('customer_id', v_customer_id, 'status', 'ARCHIVED'),
    'Customer Portal address archive', p_client_request_id);
  return jsonb_build_object('address_id', p_address_id, 'reused_existing', false, 'status', 'ARCHIVED');
end;
$$;

revoke all on function public.api_create_customer_portal_address(uuid, varchar, varchar, varchar, text, text, varchar, varchar, varchar, varchar, varchar, boolean, uuid) from public, anon;
revoke all on function public.api_update_customer_portal_address(uuid, uuid, varchar, varchar, varchar, text, text, varchar, varchar, varchar, varchar, varchar, boolean, uuid) from public, anon;
revoke all on function public.api_archive_customer_portal_address(uuid, uuid, uuid) from public, anon;
grant execute on function public.api_create_customer_portal_address(uuid, varchar, varchar, varchar, text, text, varchar, varchar, varchar, varchar, varchar, boolean, uuid) to authenticated;
grant execute on function public.api_update_customer_portal_address(uuid, uuid, varchar, varchar, varchar, text, text, varchar, varchar, varchar, varchar, varchar, boolean, uuid) to authenticated;
grant execute on function public.api_archive_customer_portal_address(uuid, uuid, uuid) to authenticated;

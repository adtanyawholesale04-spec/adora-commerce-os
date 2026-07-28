-- Part 5: verified contact request and explicit Portal notification mapping.
-- Auth Admin application remains a separate service boundary.

create table public.customer_contact_change_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  contact_type varchar(10) not null check (contact_type in ('EMAIL', 'PHONE')),
  requested_value text not null,
  normalized_value text not null,
  status varchar(20) not null default 'PENDING' check (status in ('PENDING', 'VERIFIED', 'APPLIED', 'EXPIRED', 'REJECTED')),
  expires_at timestamptz not null,
  verification_method varchar(50),
  verified_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers(organization_id, id) on delete restrict,
  foreign key (organization_id, profile_id)
    references public.organization_memberships(organization_id, profile_id) on delete restrict
);

create unique index customer_contact_change_requests_active_idx
on public.customer_contact_change_requests (organization_id, customer_id, profile_id, contact_type)
where status in ('PENDING', 'VERIFIED');

create index customer_contact_change_requests_lookup_idx
on public.customer_contact_change_requests (organization_id, profile_id, status, expires_at);

create trigger customer_contact_change_requests_set_updated_at
before update on public.customer_contact_change_requests
for each row execute function public.set_updated_at();

alter table public.customer_contact_change_requests enable row level security;
revoke all on table public.customer_contact_change_requests from public, anon, authenticated;
grant select, insert, update on table public.customer_contact_change_requests to service_role;

create or replace function public.api_request_customer_contact_change(
  p_organization_id uuid,
  p_contact_type text,
  p_requested_value text,
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
  v_request_id uuid;
  v_normalized_value text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_contact_type not in ('EMAIL', 'PHONE') then raise exception 'Unsupported contact type' using errcode = '22023'; end if;
  if nullif(trim(p_requested_value), '') is null then raise exception 'Contact value is required' using errcode = '22023'; end if;
  v_normalized_value := case
    when p_contact_type = 'EMAIL' then lower(trim(p_requested_value))
    else regexp_replace(trim(p_requested_value), '[^0-9+]', '', 'g')
  end;
  if p_contact_type = 'EMAIL' and position('@' in v_normalized_value) < 2 then raise exception 'Valid email is required' using errcode = '22023'; end if;
  if p_contact_type = 'PHONE' and length(regexp_replace(v_normalized_value, '[^0-9]', '', 'g')) < 8 then raise exception 'Valid phone is required' using errcode = '22023'; end if;

  v_profile_id := public.current_profile_id();
  select l.customer_id into v_customer_id
  from public.customer_profile_links l
  join public.organization_memberships om on om.organization_id = l.organization_id and om.profile_id = l.profile_id and om.status = 'ACTIVE'
  where l.organization_id = p_organization_id and l.profile_id = v_profile_id and l.link_status = 'ACTIVE'
  limit 1;
  if v_customer_id is null then raise exception 'Active customer link required' using errcode = '42501'; end if;

  if p_client_request_id is not null and exists (
    select 1 from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_CONTACT_CHANGE_REQUEST'
  ) then
    select entity_id into v_request_id from public.audit_logs where organization_id = p_organization_id and request_id = p_client_request_id and action = 'CUSTOMER_CONTACT_CHANGE_REQUEST' order by created_at desc limit 1;
    return jsonb_build_object('request_id', v_request_id, 'reused_existing', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || v_customer_id::text || ':' || p_contact_type, 0));
  update public.customer_contact_change_requests
  set status = 'EXPIRED'
  where organization_id = p_organization_id and customer_id = v_customer_id and profile_id = v_profile_id and contact_type = p_contact_type and status = 'PENDING';

  insert into public.customer_contact_change_requests (
    organization_id, customer_id, profile_id, contact_type, requested_value, normalized_value, status, expires_at
  ) values (
    p_organization_id, v_customer_id, v_profile_id, p_contact_type, trim(p_requested_value), v_normalized_value, 'PENDING', now() + interval '24 hours'
  ) returning id into v_request_id;

  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, after_json, reason, request_id)
  values (p_organization_id, v_profile_id, 'USER', 'CUSTOMER_CONTACT_CHANGE_REQUEST', v_request_id, 'CUSTOMER_CONTACT_CHANGE_REQUEST',
    jsonb_build_object('customer_id', v_customer_id, 'contact_type', p_contact_type, 'status', 'PENDING', 'expires_at', now() + interval '24 hours'),
    'Customer Portal verified contact request', p_client_request_id);
  return jsonb_build_object('request_id', v_request_id, 'status', 'PENDING', 'expires_in_hours', 24, 'reused_existing', false);
end;
$$;

create or replace function public.api_verify_customer_contact_change_request(
  p_organization_id uuid,
  p_request_id uuid,
  p_verification_method text,
  p_client_request_id uuid default null
)
returns jsonb
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
  if not v_is_service_role then raise exception 'Service role required' using errcode = '42501'; end if;
  if nullif(trim(p_verification_method), '') is null then raise exception 'Verification method is required' using errcode = '22023'; end if;

  select * into v_request from public.customer_contact_change_requests where organization_id = p_organization_id and id = p_request_id for update;
  if v_request.id is null then raise exception 'Contact change request not found' using errcode = '22023'; end if;
  if v_request.status <> 'PENDING' or v_request.expires_at <= now() then raise exception 'Contact change request is not verifiable' using errcode = '22023'; end if;
  update public.customer_contact_change_requests set status = 'VERIFIED', verification_method = trim(p_verification_method), verified_at = now() where id = p_request_id;
  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, before_json, after_json, reason, request_id)
  values (p_organization_id, null, 'SYSTEM', 'CUSTOMER_CONTACT_CHANGE_REQUEST', p_request_id, 'CUSTOMER_CONTACT_CHANGE_VERIFIED',
    jsonb_build_object('status', 'PENDING'), jsonb_build_object('status', 'VERIFIED', 'contact_type', v_request.contact_type), 'Service verification boundary', p_client_request_id);
  return jsonb_build_object('request_id', p_request_id, 'status', 'VERIFIED', 'auth_admin_apply_required', true);
end;
$$;

create or replace function public.api_get_customer_portal_notifications(
  p_organization_id uuid,
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
  v_notifications jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  v_profile_id := public.current_profile_id();
  select l.customer_id into v_customer_id
  from public.customer_profile_links l
  join public.organization_memberships om on om.organization_id = l.organization_id and om.profile_id = l.profile_id and om.status = 'ACTIVE'
  where l.organization_id = p_organization_id and l.profile_id = v_profile_id and l.link_status = 'ACTIVE'
  limit 1;
  if v_customer_id is null then return jsonb_build_object('available', false, 'organization_id', p_organization_id, 'reason', 'CUSTOMER_LINK_NOT_ACTIVE'); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', n.id, 'notification_type', n.notification_type, 'title', n.title, 'body', n.body, 'severity', n.severity,
    'reference_type', n.reference_type, 'reference_id', n.reference_id, 'status', n.status, 'recipient_status', nr.status,
    'created_at', n.created_at
  ) order by n.created_at desc), '[]'::jsonb)
  into v_notifications
  from public.notification_recipients nr
  join public.notifications n on n.organization_id = nr.organization_id and n.id = nr.notification_id
  where nr.organization_id = p_organization_id and nr.profile_id = v_profile_id;

  insert into public.audit_logs (organization_id, actor_profile_id, actor_type, entity_type, entity_id, action, after_json, reason, request_id)
  values (p_organization_id, v_profile_id, 'USER', 'CUSTOMER_NOTIFICATION', v_customer_id, 'CUSTOMER_PORTAL_NOTIFICATION_READ',
    jsonb_build_object('count', jsonb_array_length(v_notifications)), 'Customer Portal notification read', p_client_request_id);
  return jsonb_build_object('available', true, 'organization_id', p_organization_id, 'notifications', v_notifications);
end;
$$;

revoke all on function public.api_request_customer_contact_change(uuid, text, text, uuid) from public, anon;
revoke all on function public.api_verify_customer_contact_change_request(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.api_get_customer_portal_notifications(uuid, uuid) from public, anon;
grant execute on function public.api_request_customer_contact_change(uuid, text, text, uuid) to authenticated;
grant execute on function public.api_verify_customer_contact_change_request(uuid, uuid, text, uuid) to service_role;
grant execute on function public.api_get_customer_portal_notifications(uuid, uuid) to authenticated;

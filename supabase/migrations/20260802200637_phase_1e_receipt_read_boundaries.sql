-- Phase 1E Receipt read boundaries (Layer C).
-- Exposes only tenant-authorized staff reads and active-customer-owned Portal reads.

do $$
declare
  v_missing text[];
  v_existing text[];
begin
  select pg_catalog.array_agg(dependency order by dependency)
  into v_missing
  from pg_catalog.unnest(array[
    'public.organizations',
    'public.profiles',
    'public.organization_memberships',
    'public.permissions',
    'public.role_permissions',
    'public.membership_roles',
    'public.roles',
    'public.customers',
    'public.customer_profile_links',
    'public.payments',
    'public.finance_documents',
    'public.finance_document_lines',
    'public.audit_logs'
  ]) as dependency
  where pg_catalog.to_regclass(dependency) is null;

  if pg_catalog.to_regprocedure('public.current_profile_id()') is null then
    v_missing := pg_catalog.array_append(
      coalesce(v_missing, array[]::text[]),
      'public.current_profile_id()'
    );
  end if;

  if pg_catalog.to_regprocedure('public.has_org_permission(uuid,text)') is null then
    v_missing := pg_catalog.array_append(
      coalesce(v_missing, array[]::text[]),
      'public.has_org_permission(uuid,text)'
    );
  end if;

  if v_missing is not null then
    raise exception 'Receipt Layer C missing dependencies: %', v_missing;
  end if;

  if not exists (
    select 1
    from public.permissions permission
    where permission.code = 'finance.document.view'
  ) then
    raise exception 'Receipt Layer C permission dependency is missing';
  end if;

  select pg_catalog.array_agg(signature order by signature)
  into v_existing
  from pg_catalog.unnest(array[
    'public.api_list_receipt_documents(uuid,text,timestamp with time zone,uuid,integer)',
    'public.api_get_receipt_document(uuid,uuid)',
    'public.api_list_customer_portal_receipts(uuid,timestamp with time zone,uuid,integer)',
    'public.api_get_customer_portal_receipt(uuid,uuid)'
  ]) as signature
  where pg_catalog.to_regprocedure(signature) is not null;

  if v_existing is not null then
    raise exception 'Receipt Layer C reserved functions already exist: %', v_existing;
  end if;
end;
$$;

create function public.api_list_receipt_documents(
  p_organization_id uuid,
  p_status text default null,
  p_before_issued_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 25
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_items jsonb;
  v_has_more boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'ORGANIZATION_REQUIRED' using errcode = '22004';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;

  if (p_before_issued_at is null) <> (p_before_id is null) then
    raise exception 'INVALID_CURSOR' using errcode = '22023';
  end if;

  if p_status is not null and p_status not in ('ISSUED', 'VOID', 'REVERSED') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null
     or not exists (
       select 1
       from public.organization_memberships membership
       join public.organizations organization
         on organization.id = membership.organization_id
        and organization.status = 'ACTIVE'
       where membership.organization_id = p_organization_id
         and membership.profile_id = v_profile_id
         and membership.status = 'ACTIVE'
     )
     or not coalesce(
       public.has_org_permission(p_organization_id, 'finance.document.view'),
       false
     ) then
    raise exception 'RECEIPT_READ_DENIED' using errcode = '42501';
  end if;

  with page as (
    select
      document.id,
      document.issued_at,
      pg_catalog.jsonb_build_object(
        'document_id', document.id,
        'receipt_number', document.document_number,
        'issued_at', document.issued_at,
        'status', document.status,
        'order_number', document.order_number_snapshot,
        'currency_code', document.currency_code,
        'grand_total', document.grand_total_snapshot,
        'amount_settled', document.amount_settled_snapshot,
        'payment_status', payment.status
      ) as payload
    from public.finance_documents document
    join public.payments payment
      on payment.organization_id = document.organization_id
     and payment.id = document.payment_id
    where document.organization_id = p_organization_id
      and (p_status is null or document.status = p_status)
      and (
        p_before_issued_at is null
        or (document.issued_at, document.id) < (p_before_issued_at, p_before_id)
      )
    order by document.issued_at desc, document.id desc
    limit p_limit + 1
  ), numbered as (
    select page.*, pg_catalog.row_number() over (
      order by page.issued_at desc, page.id desc
    ) as row_number
    from page
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(numbered.payload order by numbered.issued_at desc, numbered.id desc)
        filter (where numbered.row_number <= p_limit),
      '[]'::jsonb
    ),
    pg_catalog.count(*) > p_limit
  into v_items, v_has_more
  from numbered;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'items', v_items,
    'next_cursor', case
      when v_has_more then pg_catalog.jsonb_build_object(
        'before_issued_at', v_items -> -1 -> 'issued_at',
        'before_id', v_items -> -1 -> 'document_id'
      )
      else null
    end
  );
end;
$$;

create function public.api_get_receipt_document(
  p_organization_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_receipt jsonb;
begin
  if auth.uid() is null or p_organization_id is null or p_document_id is null then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null
     or not exists (
       select 1
       from public.organization_memberships membership
       join public.organizations organization
         on organization.id = membership.organization_id
        and organization.status = 'ACTIVE'
       where membership.organization_id = p_organization_id
         and membership.profile_id = v_profile_id
         and membership.status = 'ACTIVE'
     )
     or not coalesce(
       public.has_org_permission(p_organization_id, 'finance.document.view'),
       false
     ) then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  select pg_catalog.jsonb_build_object(
    'document_id', document.id,
    'receipt_number', document.document_number,
    'issued_at', document.issued_at,
    'settled_at', document.settled_at,
    'status', document.status,
    'order_number', document.order_number_snapshot,
    'currency_code', document.currency_code,
    'payment_method', document.payment_method_snapshot,
    'payment_status', payment.status,
    'customer_display_name', document.customer_display_name_snapshot,
    'bill_to', pg_catalog.jsonb_build_object(
      'recipient_name', document.bill_to_recipient_name_snapshot,
      'address_line1', document.bill_to_address_line1_snapshot,
      'address_line2', document.bill_to_address_line2_snapshot,
      'subdistrict', document.bill_to_subdistrict_snapshot,
      'district', document.bill_to_district_snapshot,
      'province', document.bill_to_province_snapshot,
      'postal_code', document.bill_to_postal_code_snapshot,
      'country_code', document.bill_to_country_code_snapshot
    ),
    'totals', pg_catalog.jsonb_build_object(
      'subtotal', document.subtotal_snapshot,
      'item_discount_total', document.item_discount_total_snapshot,
      'order_discount_total', document.order_discount_total_snapshot,
      'shipping_charge', document.shipping_charge_snapshot,
      'shipping_discount_total', document.shipping_discount_total_snapshot,
      'grand_total', document.grand_total_snapshot,
      'amount_settled', document.amount_settled_snapshot
    ),
    'items', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'line_number', line.line_number,
          'sku', line.sku_snapshot,
          'sale_code', line.sale_code_snapshot,
          'product_name', line.product_name_snapshot,
          'variant_name', line.variant_name_snapshot,
          'quantity', line.quantity_snapshot,
          'original_unit_price', line.original_unit_price_snapshot,
          'applied_unit_price', line.applied_unit_price_snapshot,
          'line_discount_total', line.line_discount_total_snapshot,
          'line_total', line.line_total_snapshot,
          'is_reward_item', line.is_reward_item_snapshot
        ) order by line.line_number
      )
      from public.finance_document_lines line
      where line.organization_id = document.organization_id
        and line.document_id = document.id
    ), '[]'::jsonb)
  )
  into v_receipt
  from public.finance_documents document
  join public.payments payment
    on payment.organization_id = document.organization_id
   and payment.id = document.payment_id
  where document.organization_id = p_organization_id
    and document.id = p_document_id;

  if v_receipt is null then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    after_json,
    reason
  ) values (
    p_organization_id,
    v_profile_id,
    'USER',
    'finance_document',
    p_document_id,
    'RECEIPT_VIEWED',
    pg_catalog.jsonb_build_object('viewer_scope', 'STAFF'),
    'Staff Receipt detail read'
  );

  return pg_catalog.jsonb_build_object(
    'available', true,
    'receipt', v_receipt
  );
end;
$$;

create function public.api_list_customer_portal_receipts(
  p_organization_id uuid,
  p_before_issued_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_items jsonb;
  v_has_more boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if p_organization_id is null then
    raise exception 'ORGANIZATION_REQUIRED' using errcode = '22004';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'INVALID_LIMIT' using errcode = '22023';
  end if;

  if (p_before_issued_at is null) <> (p_before_id is null) then
    raise exception 'INVALID_CURSOR' using errcode = '22023';
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null
     or not exists (
       select 1
       from public.organization_memberships membership
       join public.organizations organization
         on organization.id = membership.organization_id
        and organization.status = 'ACTIVE'
       where membership.organization_id = p_organization_id
         and membership.profile_id = v_profile_id
         and membership.status = 'ACTIVE'
     ) then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'items', '[]'::jsonb,
      'next_cursor', null
    );
  end if;

  select link.customer_id
  into v_customer_id
  from public.customer_profile_links link
  join public.customers customer
    on customer.organization_id = link.organization_id
   and customer.id = link.customer_id
   and customer.status = 'ACTIVE'
  where link.organization_id = p_organization_id
    and link.profile_id = v_profile_id
    and link.link_status = 'ACTIVE'
  order by link.verified_at desc, link.created_at desc
  limit 1;

  if v_customer_id is null then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'items', '[]'::jsonb,
      'next_cursor', null
    );
  end if;

  with page as (
    select
      document.id,
      document.issued_at,
      pg_catalog.jsonb_build_object(
        'document_id', document.id,
        'receipt_number', document.document_number,
        'issued_at', document.issued_at,
        'status', document.status,
        'order_number', document.order_number_snapshot,
        'currency_code', document.currency_code,
        'grand_total', document.grand_total_snapshot,
        'amount_settled', document.amount_settled_snapshot,
        'payment_status', payment.status
      ) as payload
    from public.finance_documents document
    join public.payments payment
      on payment.organization_id = document.organization_id
     and payment.id = document.payment_id
    where document.organization_id = p_organization_id
      and document.customer_id = v_customer_id
      and (
        p_before_issued_at is null
        or (document.issued_at, document.id) < (p_before_issued_at, p_before_id)
      )
    order by document.issued_at desc, document.id desc
    limit p_limit + 1
  ), numbered as (
    select page.*, pg_catalog.row_number() over (
      order by page.issued_at desc, page.id desc
    ) as row_number
    from page
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(numbered.payload order by numbered.issued_at desc, numbered.id desc)
        filter (where numbered.row_number <= p_limit),
      '[]'::jsonb
    ),
    pg_catalog.count(*) > p_limit
  into v_items, v_has_more
  from numbered;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'items', v_items,
    'next_cursor', case
      when v_has_more then pg_catalog.jsonb_build_object(
        'before_issued_at', v_items -> -1 -> 'issued_at',
        'before_id', v_items -> -1 -> 'document_id'
      )
      else null
    end
  );
end;
$$;

create function public.api_get_customer_portal_receipt(
  p_organization_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
  v_receipt jsonb;
begin
  if auth.uid() is null or p_organization_id is null or p_document_id is null then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  v_profile_id := public.current_profile_id();

  if v_profile_id is null
     or not exists (
       select 1
       from public.organization_memberships membership
       join public.organizations organization
         on organization.id = membership.organization_id
        and organization.status = 'ACTIVE'
       where membership.organization_id = p_organization_id
         and membership.profile_id = v_profile_id
         and membership.status = 'ACTIVE'
     ) then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  select link.customer_id
  into v_customer_id
  from public.customer_profile_links link
  join public.customers customer
    on customer.organization_id = link.organization_id
   and customer.id = link.customer_id
   and customer.status = 'ACTIVE'
  where link.organization_id = p_organization_id
    and link.profile_id = v_profile_id
    and link.link_status = 'ACTIVE'
  order by link.verified_at desc, link.created_at desc
  limit 1;

  if v_customer_id is null then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  select pg_catalog.jsonb_build_object(
    'document_id', document.id,
    'receipt_number', document.document_number,
    'issued_at', document.issued_at,
    'settled_at', document.settled_at,
    'status', document.status,
    'order_number', document.order_number_snapshot,
    'currency_code', document.currency_code,
    'payment_method', document.payment_method_snapshot,
    'payment_status', payment.status,
    'customer_display_name', document.customer_display_name_snapshot,
    'bill_to', pg_catalog.jsonb_build_object(
      'recipient_name', document.bill_to_recipient_name_snapshot,
      'address_line1', document.bill_to_address_line1_snapshot,
      'address_line2', document.bill_to_address_line2_snapshot,
      'subdistrict', document.bill_to_subdistrict_snapshot,
      'district', document.bill_to_district_snapshot,
      'province', document.bill_to_province_snapshot,
      'postal_code', document.bill_to_postal_code_snapshot,
      'country_code', document.bill_to_country_code_snapshot
    ),
    'totals', pg_catalog.jsonb_build_object(
      'subtotal', document.subtotal_snapshot,
      'item_discount_total', document.item_discount_total_snapshot,
      'order_discount_total', document.order_discount_total_snapshot,
      'shipping_charge', document.shipping_charge_snapshot,
      'shipping_discount_total', document.shipping_discount_total_snapshot,
      'grand_total', document.grand_total_snapshot,
      'amount_settled', document.amount_settled_snapshot
    ),
    'items', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'line_number', line.line_number,
          'sku', line.sku_snapshot,
          'sale_code', line.sale_code_snapshot,
          'product_name', line.product_name_snapshot,
          'variant_name', line.variant_name_snapshot,
          'quantity', line.quantity_snapshot,
          'original_unit_price', line.original_unit_price_snapshot,
          'applied_unit_price', line.applied_unit_price_snapshot,
          'line_discount_total', line.line_discount_total_snapshot,
          'line_total', line.line_total_snapshot,
          'is_reward_item', line.is_reward_item_snapshot
        ) order by line.line_number
      )
      from public.finance_document_lines line
      where line.organization_id = document.organization_id
        and line.document_id = document.id
    ), '[]'::jsonb)
  )
  into v_receipt
  from public.finance_documents document
  join public.payments payment
    on payment.organization_id = document.organization_id
   and payment.id = document.payment_id
  where document.organization_id = p_organization_id
    and document.id = p_document_id
    and document.customer_id = v_customer_id;

  if v_receipt is null then
    return pg_catalog.jsonb_build_object(
      'available', false,
      'error_code', 'DOCUMENT_UNAVAILABLE'
    );
  end if;

  insert into public.audit_logs (
    organization_id,
    actor_profile_id,
    actor_type,
    entity_type,
    entity_id,
    action,
    after_json,
    reason
  ) values (
    p_organization_id,
    v_profile_id,
    'USER',
    'finance_document',
    p_document_id,
    'RECEIPT_VIEWED',
    pg_catalog.jsonb_build_object('viewer_scope', 'CUSTOMER_PORTAL'),
    'Customer Portal Receipt detail read'
  );

  return pg_catalog.jsonb_build_object(
    'available', true,
    'receipt', v_receipt
  );
end;
$$;

revoke all on function public.api_list_receipt_documents(
  uuid, text, timestamptz, uuid, integer
) from public, anon, authenticated, service_role;
revoke all on function public.api_get_receipt_document(
  uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.api_list_customer_portal_receipts(
  uuid, timestamptz, uuid, integer
) from public, anon, authenticated, service_role;
revoke all on function public.api_get_customer_portal_receipt(
  uuid, uuid
) from public, anon, authenticated, service_role;

grant execute on function public.api_list_receipt_documents(
  uuid, text, timestamptz, uuid, integer
) to authenticated;
grant execute on function public.api_get_receipt_document(
  uuid, uuid
) to authenticated;
grant execute on function public.api_list_customer_portal_receipts(
  uuid, timestamptz, uuid, integer
) to authenticated;
grant execute on function public.api_get_customer_portal_receipt(
  uuid, uuid
) to authenticated;

comment on function public.api_list_receipt_documents(
  uuid, text, timestamptz, uuid, integer
) is 'Tenant-scoped Receipt index for active staff with finance.document.view.';
comment on function public.api_get_receipt_document(
  uuid, uuid
) is 'Non-enumerating Receipt detail for active staff with finance.document.view.';
comment on function public.api_list_customer_portal_receipts(
  uuid, timestamptz, uuid, integer
) is 'Active-customer-owned Receipt index for the authenticated Customer Portal.';
comment on function public.api_get_customer_portal_receipt(
  uuid, uuid
) is 'Non-enumerating active-customer-owned Receipt detail with sanitized read audit.';

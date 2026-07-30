\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',
    'authenticated',
    'authenticated',
    'storefront-owner@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa72',
    'authenticated',
    'authenticated',
    'storefront-outsider@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'Storefront Org A',
    'storefront-org-a',
    'ACTIVE'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb72',
    'Storefront Org B',
    'storefront-org-b',
    'ACTIVE'
  );

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccc71',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',
    'Storefront Owner',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccc72',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa72',
    'Storefront Outsider',
    'ACTIVE'
  );

insert into public.organization_memberships (
  id,
  organization_id,
  profile_id,
  status,
  is_default,
  joined_at
) values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd71',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'cccccccc-cccc-4ccc-8ccc-cccccccccc71',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd72',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb72',
    'cccccccc-cccc-4ccc-8ccc-cccccccccc72',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (
  id,
  organization_id,
  code,
  name,
  status,
  is_system_role
) values
  (
    '77777777-7777-4777-8777-777777777771',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'storefront_owner',
    'Storefront Owner',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-4777-8777-777777777772',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb72',
    'storefront_viewer',
    'Storefront Viewer',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select
  '77777777-7777-4777-8777-777777777771'::uuid,
  p.id
from public.permissions p
where p.code in (
  'organization.settings.edit',
  'storefront.view',
  'storefront.manage',
  'storefront.publish'
);

insert into public.role_permissions (role_id, permission_id)
select
  '77777777-7777-4777-8777-777777777772'::uuid,
  p.id
from public.permissions p
where p.code = 'storefront.view';

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd71',
    '77777777-7777-4777-8777-777777777771'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd72',
    '77777777-7777-4777-8777-777777777772'
  );

insert into public.products (
  id,
  organization_id,
  product_code,
  name,
  description,
  status
) values
  (
    '11111111-1111-4111-8111-111111111171',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'SF-PROD-A',
    'Public Product A',
    'Safe public description',
    'ACTIVE'
  ),
  (
    '11111111-1111-4111-8111-111111111172',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb72',
    'SF-PROD-B',
    'Private Product B',
    'Must not cross tenant',
    'ACTIVE'
  );

insert into public.product_variants (
  id,
  organization_id,
  product_id,
  stock_code,
  variant_name,
  base_price,
  cost_price,
  status
) values
  (
    '22222222-2222-4222-8222-222222222271',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    '11111111-1111-4111-8111-111111111171',
    'SECRET-SKU-A',
    'Standard',
    199,
    71,
    'ACTIVE'
  ),
  (
    '22222222-2222-4222-8222-222222222272',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb72',
    '11111111-1111-4111-8111-111111111172',
    'SECRET-SKU-B',
    'Private',
    299,
    91,
    'ACTIVE'
  );

insert into public.warehouses (
  id,
  organization_id,
  code,
  name,
  status
) values (
  '88888888-8888-4888-8888-888888888871',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
  'SF-WH-A',
  'Private Warehouse A',
  'ACTIVE'
);

insert into public.inventory_balances (
  organization_id,
  warehouse_id,
  variant_id,
  on_hand,
  reserved,
  allocated,
  available
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
  '88888888-8888-4888-8888-888888888871',
  '22222222-2222-4222-8222-222222222271',
  11,
  2,
  1,
  8
);

do $$
begin
  if (
    select count(*)
    from public.permissions
    where code in (
      'storefront.view',
      'storefront.manage',
      'storefront.publish'
    )
  ) <> 3 then
    raise exception 'Storefront permissions were not seeded';
  end if;

  if not exists (
    select 1
    from public.features
    where code = 'storefront'
      and feature_type = 'BOOLEAN'
      and status = 'ACTIVE'
  ) then
    raise exception 'Storefront feature was not seeded';
  end if;

  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'organization_storefronts',
        'storefront_product_listings',
        'storefront_slug_history'
      )
      and c.relrowsecurity
  ) <> 3 then
    raise exception 'Storefront tables do not all have RLS enabled';
  end if;

  if has_table_privilege(
    'anon',
    'public.organization_storefronts',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.organization_storefronts',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.storefront_product_listings',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.storefront_product_listings',
    'SELECT'
  ) then
    raise exception 'Browser roles received direct Storefront table access';
  end if;

  if has_function_privilege(
    'anon',
    'public.api_get_public_storefront(text)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.api_get_public_storefront(text)',
    'EXECUTE'
  ) then
    raise exception 'Public read RPC escaped the server-only boundary';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.api_get_public_storefront(text)',
    'EXECUTE'
  ) then
    raise exception 'Service role cannot execute Storefront read RPC';
  end if;
end
$$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',
  true
);

do $$
declare
  v_result jsonb;
begin
  v_result := public.api_upsert_storefront_settings(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'A safe public tagline',
    'A safe public Storefront description',
    '90000000-0000-4000-8000-000000000071'
  );

  if v_result ->> 'publication_status' <> 'PRIVATE' then
    raise exception 'New Storefront did not default to PRIVATE';
  end if;

  perform public.api_set_storefront_product_listing(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    '11111111-1111-4111-8111-111111111171',
    'public-product-a',
    'VISIBLE',
    10,
    '90000000-0000-4000-8000-000000000072'
  );

  begin
    perform public.api_set_storefront_product_listing(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
      '11111111-1111-4111-8111-111111111172',
      'cross-tenant-product',
      'VISIBLE',
      20,
      '90000000-0000-4000-8000-000000000073'
    );
    raise exception 'Cross-tenant product listing unexpectedly succeeded';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform public.api_set_storefront_publication(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
      'PUBLISHED',
      '90000000-0000-4000-8000-000000000074'
    );
    raise exception 'Publication without entitlement unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

reset role;

insert into public.organization_entitlements (
  organization_id,
  feature_id,
  source_type,
  enabled,
  valid_from
)
select
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
  f.id,
  'MANUAL_OVERRIDE',
  true,
  now() - interval '1 minute'
from public.features f
where f.code = 'storefront';

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa71',
  true
);

do $$
declare
  v_result jsonb;
begin
  v_result := public.api_set_storefront_publication(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'PUBLISHED',
    '90000000-0000-4000-8000-000000000075'
  );
  if v_result ->> 'publication_status' <> 'PUBLISHED' then
    raise exception 'Entitled Storefront publication failed';
  end if;

  v_result := public.api_set_storefront_publication(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'PUBLISHED',
    '90000000-0000-4000-8000-000000000075'
  );
  if not (v_result ->> 'reused_existing')::boolean then
    raise exception 'Publication idempotency did not reuse existing result';
  end if;

  v_result := public.api_change_storefront_slug(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
    'storefront-org-a-new',
    'Validation slug change',
    '90000000-0000-4000-8000-000000000076'
  );
  if v_result ->> 'new_slug' <> 'storefront-org-a-new' then
    raise exception 'Guarded slug change failed';
  end if;
end
$$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa72',
  true
);

do $$
begin
  begin
    perform public.api_upsert_storefront_settings(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71',
      'Cross tenant',
      'Must fail',
      '90000000-0000-4000-8000-000000000077'
    );
    raise exception 'Cross-tenant Storefront update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

reset role;
set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_storefront jsonb;
  v_products jsonb;
  v_product jsonb;
  v_variants jsonb;
  v_payload text;
begin
  v_storefront := public.api_get_public_storefront('storefront-org-a');
  if not (v_storefront ->> 'available')::boolean
     or not (v_storefront ->> 'redirect_required')::boolean
     or v_storefront ->> 'canonical_slug' <> 'storefront-org-a-new' then
    raise exception 'Historical slug redirect contract failed';
  end if;

  v_products := public.api_list_public_storefront_products(
    'storefront-org-a-new'
  );
  if not (v_products ->> 'available')::boolean
     or jsonb_array_length(v_products -> 'items') <> 1
     or v_products #>> '{items,0,availability}' <> 'IN_STOCK' then
    raise exception 'Public Storefront product list contract failed';
  end if;

  v_product := public.api_get_public_storefront_product(
    'storefront-org-a-new',
    'public-product-a'
  );
  if not (v_product ->> 'available')::boolean then
    raise exception 'Public Storefront product detail contract failed';
  end if;

  v_variants := public.api_list_public_storefront_product_variants(
    'storefront-org-a-new',
    'public-product-a'
  );
  if not (v_variants ->> 'available')::boolean
     or jsonb_array_length(v_variants -> 'items') <> 1
     or v_variants #>> '{items,0,availability}' <> 'IN_STOCK' then
    raise exception 'Public Storefront variant list contract failed';
  end if;

  v_payload := v_products::text || v_product::text || v_variants::text;
  if v_payload like '%cost_price%'
     or v_payload like '%stock_code%'
     or v_payload like '%warehouse_id%'
     or v_payload like '%on_hand%'
     or v_payload like '%reserved%'
     or v_payload like '%allocated%' then
    raise exception 'Private product or inventory fields leaked publicly';
  end if;

  if (public.api_get_public_storefront('storefront-org-b') ->> 'available')::boolean then
    raise exception 'Private Storefront became publicly available';
  end if;
end
$$;

reset role;

do $$
begin
  if (
    select count(*)
    from public.audit_logs
    where organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71'
      and request_id = '90000000-0000-4000-8000-000000000075'
      and action = 'STOREFRONT_PUBLISHED'
  ) <> 1 then
    raise exception 'Publication idempotency created duplicate audit rows';
  end if;

  if (
    select count(*)
    from public.audit_logs
    where organization_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb71'
      and action in (
        'STOREFRONT_SETTINGS_UPDATED',
        'STOREFRONT_PRODUCT_LISTING_UPDATED',
        'STOREFRONT_PUBLISHED',
        'ORGANIZATION_SLUG_UPDATED'
      )
  ) <> 4 then
    raise exception 'Expected Storefront audit evidence was incomplete';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'api_set_storefront_publication'
      and p.prosecdef
      and p.proconfig @> array['search_path=public']
  ) then
    raise exception 'Guarded publication function is not hardened';
  end if;
end
$$;

select 'phase_1c_storefront_boundary' as test_name, 'pass' as result;

rollback;

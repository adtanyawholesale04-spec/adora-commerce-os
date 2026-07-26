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
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa61',
    'authenticated',
    'authenticated',
    'product-cost-viewer@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa62',
    'authenticated',
    'authenticated',
    'product-cost-editor@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.organizations (id, name, slug, status)
values
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    'Product Cost Org A',
    'product-cost-org-a',
    'ACTIVE'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb62',
    'Product Cost Org B',
    'product-cost-org-b',
    'ACTIVE'
  );

insert into public.profiles (id, auth_user_id, display_name, status)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc61',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa61',
    'Product Cost Viewer',
    'ACTIVE'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccc62',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa62',
    'Product Cost Editor',
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
    'dddddddd-dddd-dddd-dddd-dddddddddd61',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    'cccccccc-cccc-cccc-cccc-cccccccccc61',
    'ACTIVE',
    true,
    now()
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd62',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    'cccccccc-cccc-cccc-cccc-cccccccccc62',
    'ACTIVE',
    true,
    now()
  );

insert into public.roles (id, organization_id, code, name, status, is_system_role)
values
  (
    '77777777-7777-7777-7777-777777777761',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    'product_cost_viewer',
    'Product Cost Viewer',
    'ACTIVE',
    false
  ),
  (
    '77777777-7777-7777-7777-777777777762',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    'product_cost_editor',
    'Product Cost Editor',
    'ACTIVE',
    false
  );

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777761'::uuid, id
from public.permissions
where code = 'product.cost.view';

insert into public.role_permissions (role_id, permission_id)
select '77777777-7777-7777-7777-777777777762'::uuid, id
from public.permissions
where code = 'product.cost.edit';

insert into public.membership_roles (membership_id, role_id)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd61',
    '77777777-7777-7777-7777-777777777761'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddd62',
    '77777777-7777-7777-7777-777777777762'
  );

insert into public.products (
  id,
  organization_id,
  product_code,
  name,
  status
) values
  (
    '11111111-1111-1111-1111-111111111161',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    'PC-PROD-A',
    'Product Cost Product A',
    'ACTIVE'
  ),
  (
    '11111111-1111-1111-1111-111111111162',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb62',
    'PC-PROD-B',
    'Product Cost Product B',
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
  minimum_selling_price,
  status
) values
  (
    '22222222-2222-2222-2222-222222222261',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61',
    '11111111-1111-1111-1111-111111111161',
    'PC-SKU-A',
    'Product Cost SKU A',
    100,
    60,
    80,
    'ACTIVE'
  ),
  (
    '22222222-2222-2222-2222-222222222262',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb62',
    '11111111-1111-1111-1111-111111111162',
    'PC-SKU-B',
    'Product Cost SKU B',
    100,
    60,
    80,
    'ACTIVE'
  );

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa61',
  true
);

do $$
declare
  v_cost numeric;
  v_min_price numeric;
begin
  begin
    perform cost_price
    from public.product_variants
    where id = '22222222-2222-2222-2222-222222222261'::uuid;

    raise exception 'viewer direct cost column select unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  select cost_price, minimum_selling_price
  into v_cost, v_min_price
  from public.api_get_product_variant_cost(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61'::uuid,
    '22222222-2222-2222-2222-222222222261'::uuid
  );

  if v_cost <> 60 or v_min_price <> 80 then
    raise exception 'viewer cost RPC expected 60/80, got %/%', v_cost, v_min_price;
  end if;

  begin
    perform *
    from public.api_update_product_variant_cost(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61'::uuid,
      '22222222-2222-2222-2222-222222222261'::uuid,
      65,
      85
    );

    raise exception 'viewer cost update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform *
    from public.api_get_product_variant_cost(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb62'::uuid,
      '22222222-2222-2222-2222-222222222262'::uuid
    );

    raise exception 'viewer cross-tenant cost read unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa62',
  true
);

do $$
declare
  v_cost numeric;
  v_min_price numeric;
begin
  begin
    perform cost_price
    from public.product_variants
    where id = '22222222-2222-2222-2222-222222222261'::uuid;

    raise exception 'editor direct cost column select unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.product_variants
    set cost_price = 65
    where id = '22222222-2222-2222-2222-222222222261'::uuid;

    raise exception 'editor direct cost column update unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  select cost_price, minimum_selling_price
  into v_cost, v_min_price
  from public.api_update_product_variant_cost(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61'::uuid,
    '22222222-2222-2222-2222-222222222261'::uuid,
    66,
    86
  );

  if v_cost <> 66 or v_min_price <> 86 then
    raise exception 'editor cost update RPC expected 66/86, got %/%', v_cost, v_min_price;
  end if;

  begin
    perform *
    from public.api_get_product_variant_cost(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61'::uuid,
      '22222222-2222-2222-2222-222222222261'::uuid
    );

    raise exception 'editor cost read without product.cost.view unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform *
    from public.api_update_product_variant_cost(
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb61'::uuid,
      '22222222-2222-2222-2222-222222222261'::uuid,
      -1,
      86
    );

    raise exception 'negative cost update unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end $$;

reset role;

select 'product_cost_wrappers' as check_name, 'pass' as result;

rollback;

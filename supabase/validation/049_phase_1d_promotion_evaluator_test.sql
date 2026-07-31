\set ON_ERROR_STOP on

begin;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'internal_evaluate_storefront_variant_promotion'
      and not p.prosecdef
      and p.provolatile = 's'
      and p.proconfig @> array['search_path=""']
  ) then
    raise exception 'Promotion evaluator is not a hardened stable invoker function';
  end if;

  if has_function_privilege(
    'anon',
    'public.internal_evaluate_storefront_variant_promotion(uuid,uuid,numeric,timestamp with time zone)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.internal_evaluate_storefront_variant_promotion(uuid,uuid,numeric,timestamp with time zone)',
    'EXECUTE'
  ) or has_function_privilege(
    'service_role',
    'public.internal_evaluate_storefront_variant_promotion(uuid,uuid,numeric,timestamp with time zone)',
    'EXECUTE'
  ) then
    raise exception 'A Data API role can execute the internal promotion evaluator';
  end if;
end;
$$;

insert into public.organizations (id, name, slug, status)
values
  ('a1000000-0000-4000-8000-000000000001', 'Promotion Evaluator A', 'promotion-evaluator-a', 'ACTIVE'),
  ('a1000000-0000-4000-8000-000000000002', 'Promotion Evaluator B', 'promotion-evaluator-b', 'ACTIVE');

insert into public.products (
  id,
  organization_id,
  product_code,
  name,
  status
)
values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'PROMO-A', 'Promotion Product A', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'PROMO-B', 'Promotion Product B', 'ACTIVE');

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
)
values
  ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'PROMO-A-1', 'Promotion Variant A', 100, 20, 50, 'ACTIVE'),
  ('a3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'PROMO-B-1', 'Promotion Variant B', 200, 40, 100, 'ACTIVE');

do $$
declare
  v_result jsonb;
begin
  v_result := public.internal_evaluate_storefront_variant_promotion(
    'a1000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    2,
    '2026-08-01 12:00:00+00'
  );

  if (v_result ->> 'original_unit_price')::numeric <> 100
     or (v_result ->> 'calculated_unit_price')::numeric <> 100
     or (v_result ->> 'line_discount_total')::numeric <> 0
     or (v_result ->> 'line_total')::numeric <> 200
     or jsonb_array_length(v_result #> '{pricing_snapshot,applied_actions}') <> 0 then
    raise exception 'No-promotion base-price path is incorrect: %', v_result;
  end if;

  if exists (
    select 1
    from jsonb_object_keys(v_result) as top_key(key)
    where top_key.key not in (
      'currency_code',
      'original_unit_price',
      'calculated_unit_price',
      'line_discount_total',
      'line_total',
      'pricing_snapshot'
    )
  ) or exists (
    select 1
    from jsonb_object_keys(v_result -> 'pricing_snapshot') as snapshot_key(key)
    where snapshot_key.key not in (
      'schema_version',
      'currency_code',
      'base_unit_price',
      'applied_unit_price',
      'line_benefit_total',
      'applied_actions',
      'calculated_at'
    )
  ) then
    raise exception 'Promotion result exposes a forbidden private field';
  end if;
end;
$$;

insert into public.promotion_campaigns (
  id, organization_id, code, name, status, scope, priority, stackable, currency_code
)
values
  ('a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'PERCENT-10', 'Percent 10', 'ACTIVE', 'CART', 100, true, 'THB'),
  ('a4000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'FIXED-5', 'Fixed 5', 'ACTIVE', 'CART', 90, true, null),
  ('a4000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'FIXED-UNIT-80', 'Fixed Unit 80', 'PAUSED', 'CART', 110, true, 'THB'),
  ('a4000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'EXCLUSIVE-3', 'Exclusive 3', 'PAUSED', 'CART', 80, true, 'THB'),
  ('a4000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'EXCLUSIVE-20', 'Exclusive 20', 'PAUSED', 'CART', 70, true, 'THB');

insert into public.promotion_campaign_versions (
  id, organization_id, campaign_id, version_number, status, effective_from, effective_until
)
values
  ('a5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 1, 'ACTIVE', '2026-07-01', '2026-09-01'),
  ('a5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002', 1, 'ACTIVE', null, null),
  ('a5000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000003', 1, 'ACTIVE', null, null),
  ('a5000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000004', 1, 'ACTIVE', null, null),
  ('a5000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000005', 1, 'ACTIVE', null, null);

insert into public.promotion_rules (
  id, organization_id, campaign_version_id, rule_type, scope_type,
  min_quantity, max_quantity, repeatable, priority
)
values
  ('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'MIN_QUANTITY', 'VARIANT', 2, 5, false, 10),
  ('a6000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000002', 'MIN_QUANTITY', 'VARIANT', 1, null, false, 10),
  ('a6000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000003', 'MIN_QUANTITY', 'VARIANT', 1, null, false, 10),
  ('a6000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000004', 'MIN_QUANTITY', 'VARIANT', 1, null, false, 10),
  ('a6000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000005', 'MIN_QUANTITY', 'VARIANT', 1, null, false, 10);

insert into public.promotion_actions (
  id, organization_id, campaign_version_id, rule_id, action_type,
  priority, stackable, exclusive_group, value_json
)
values
  ('a7000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'PERCENT_DISCOUNT', 10, true, null, '{"percent":10}'),
  ('a7000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000002', 'FIXED_DISCOUNT', 10, true, null, '{"amount":5}'),
  ('a7000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000003', 'a6000000-0000-4000-8000-000000000003', 'FIXED_UNIT_PRICE', 10, true, null, null),
  ('a7000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000004', 'a6000000-0000-4000-8000-000000000004', 'FIXED_DISCOUNT', 10, true, 'exclusive-a', '{"amount":3}'),
  ('a7000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000005', 'a6000000-0000-4000-8000-000000000005', 'FIXED_DISCOUNT', 10, true, 'exclusive-a', '{"amount":20}');

insert into public.promotion_target_scopes (
  id, organization_id, campaign_version_id, action_id, scope_type, reference_id, include
)
values
  ('a8000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', null, 'VARIANT', 'a3000000-0000-4000-8000-000000000001', true),
  ('a8000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000002', 'VARIANT', 'a3000000-0000-4000-8000-000000000001', true),
  ('a8000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000003', null, 'VARIANT', 'a3000000-0000-4000-8000-000000000001', true),
  ('a8000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000004', null, 'VARIANT', 'a3000000-0000-4000-8000-000000000001', true),
  ('a8000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000005', null, 'VARIANT', 'a3000000-0000-4000-8000-000000000001', true);

insert into public.promotion_price_mappings (
  id, organization_id, action_id, mapping_type, reference_id, fixed_unit_price, currency_code
)
values (
  'a9000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'a7000000-0000-4000-8000-000000000003',
  'VARIANT',
  'a3000000-0000-4000-8000-000000000001',
  80,
  'THB'
);

do $$
declare
  v_result jsonb;
begin
  v_result := public.internal_evaluate_storefront_variant_promotion(
    'a1000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    2,
    '2026-08-01 12:00:00+00'
  );

  if (v_result ->> 'line_total')::numeric <> 175
     or (v_result ->> 'line_discount_total')::numeric <> 25
     or jsonb_array_length(v_result #> '{pricing_snapshot,applied_actions}') <> 2
     or v_result #>> '{pricing_snapshot,applied_actions,0,action_type}' <> 'PERCENT_DISCOUNT'
     or v_result #>> '{pricing_snapshot,applied_actions,1,action_type}' <> 'FIXED_DISCOUNT' then
    raise exception 'Sequential percent/fixed evaluation is incorrect: %', v_result;
  end if;

  update public.promotion_campaigns
  set status = 'ACTIVE'
  where id in (
    'a4000000-0000-4000-8000-000000000003',
    'a4000000-0000-4000-8000-000000000004',
    'a4000000-0000-4000-8000-000000000005'
  );

  v_result := public.internal_evaluate_storefront_variant_promotion(
    'a1000000-0000-4000-8000-000000000001',
    'a3000000-0000-4000-8000-000000000001',
    2,
    '2026-08-01 12:00:00+00'
  );

  if (v_result ->> 'line_total')::numeric <> 136
     or (v_result ->> 'line_discount_total')::numeric <> 64
     or jsonb_array_length(v_result #> '{pricing_snapshot,applied_actions}') <> 4
     or v_result #>> '{pricing_snapshot,applied_actions,0,action_type}' <> 'FIXED_UNIT_PRICE'
     or v_result #>> '{pricing_snapshot,applied_actions,3,action_id}' <> 'a7000000-0000-4000-8000-000000000004' then
    raise exception 'Fixed-unit, priority or exclusivity evaluation is incorrect: %', v_result;
  end if;
end;
$$;

do $$
begin
  update public.product_variants
  set minimum_selling_price = 95
  where id = 'a3000000-0000-4000-8000-000000000001';

  begin
    perform public.internal_evaluate_storefront_variant_promotion(
      'a1000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      2,
      '2026-08-01 12:00:00+00'
    );
    raise exception 'Price-floor violation unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'PROMOTION_PRICE_FLOOR_VIOLATION' then
        raise;
      end if;
  end;

  update public.product_variants
  set minimum_selling_price = 50
  where id = 'a3000000-0000-4000-8000-000000000001';
end;
$$;

do $$
begin
  insert into public.promotion_campaign_versions (
    id, organization_id, campaign_id, version_number, status
  ) values (
    'a5000000-0000-4000-8000-000000000011',
    'a1000000-0000-4000-8000-000000000001',
    'a4000000-0000-4000-8000-000000000001',
    2,
    'ACTIVE'
  );

  begin
    perform public.internal_evaluate_storefront_variant_promotion(
      'a1000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      2,
      '2026-08-01 12:00:00+00'
    );
    raise exception 'Ambiguous active versions unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'PROMOTION_CONFIGURATION_UNSUPPORTED' then
        raise;
      end if;
  end;

  delete from public.promotion_campaign_versions
  where id = 'a5000000-0000-4000-8000-000000000011';
end;
$$;

do $$
begin
  update public.promotion_target_scopes
  set reference_id = 'a3000000-0000-4000-8000-000000000002'
  where id = 'a8000000-0000-4000-8000-000000000001';

  begin
    perform public.internal_evaluate_storefront_variant_promotion(
      'a1000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      2,
      '2026-08-01 12:00:00+00'
    );
    raise exception 'Cross-tenant target unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'PROMOTION_CONFIGURATION_UNSUPPORTED' then
        raise;
      end if;
  end;

  update public.promotion_target_scopes
  set reference_id = 'a3000000-0000-4000-8000-000000000001'
  where id = 'a8000000-0000-4000-8000-000000000001';
end;
$$;

do $$
begin
  update public.promotion_actions
  set value_json = '{"percent":"invalid"}'::jsonb
  where id = 'a7000000-0000-4000-8000-000000000001';

  begin
    perform public.internal_evaluate_storefront_variant_promotion(
      'a1000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      2,
      '2026-08-01 12:00:00+00'
    );
    raise exception 'Wrong action JSON type unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'PROMOTION_CONFIGURATION_UNSUPPORTED' then
        raise;
      end if;
  end;

  update public.promotion_actions
  set value_json = '{"percent":10,"unexpected":true}'::jsonb
  where id = 'a7000000-0000-4000-8000-000000000001';

  begin
    perform public.internal_evaluate_storefront_variant_promotion(
      'a1000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000001',
      2,
      '2026-08-01 12:00:00+00'
    );
    raise exception 'Extra action JSON key unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'PROMOTION_CONFIGURATION_UNSUPPORTED' then
        raise;
      end if;
  end;
end;
$$;

select 'phase_1d_promotion_evaluator|pass';

rollback;

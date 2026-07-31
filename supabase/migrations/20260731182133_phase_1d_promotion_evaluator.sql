-- Phase 1D Part 3C Layer 2 promotion evaluator.
-- Internal, read-only and fail-closed. Guarded cart mutation RPCs are not part
-- of this migration and no Data API role may invoke this function directly.

do $$
declare
  v_missing text;
begin
  select string_agg(required_object, ', ' order by required_object)
  into v_missing
  from unnest(array[
    'public.product_variants',
    'public.promotion_campaigns',
    'public.promotion_campaign_versions',
    'public.promotion_condition_groups',
    'public.promotion_conditions',
    'public.promotion_rules',
    'public.promotion_actions',
    'public.promotion_target_scopes',
    'public.promotion_price_mappings',
    'public.promotion_tiers',
    'public.promotion_bundles',
    'public.promotion_bundle_components',
    'public.promotion_reward_rules'
  ]) as required_objects(required_object)
  where to_regclass(required_object) is null;

  if v_missing is not null then
    raise exception 'Phase 1D promotion evaluator missing dependencies: %', v_missing;
  end if;

  if to_regprocedure(
    'public.internal_evaluate_storefront_variant_promotion(uuid,uuid,numeric,timestamp with time zone)'
  ) is not null then
    raise exception 'Phase 1D promotion evaluator already exists';
  end if;
end;
$$;

create function public.internal_evaluate_storefront_variant_promotion(
  p_organization_id uuid,
  p_variant_id uuid,
  p_quantity numeric,
  p_evaluated_at timestamptz default statement_timestamp()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_variant record;
  v_campaign record;
  v_candidate record;
  v_version_id uuid;
  v_version_count integer;
  v_original_line numeric(14,2);
  v_remaining numeric(14,2);
  v_benefit numeric(14,2);
  v_value numeric;
  v_mapped_unit numeric(14,2);
  v_mapped_line numeric(14,2);
  v_effective_group text;
  v_applied_groups text[] := array[]::text[];
  v_applied_actions jsonb := '[]'::jsonb;
begin
  if p_organization_id is null
     or p_variant_id is null
     or p_evaluated_at is null
     or p_quantity is null
     or p_quantity <= 0
     or p_quantity > 999.000
     or p_quantity <> round(p_quantity, 3) then
    raise exception 'INVALID_PROMOTION_EVALUATION_INPUT' using errcode = '22023';
  end if;

  select
    pv.id,
    pv.base_price,
    pv.minimum_selling_price
  into v_variant
  from public.product_variants pv
  where pv.organization_id = p_organization_id
    and pv.id = p_variant_id
    and pv.status = 'ACTIVE';

  if not found then
    raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  v_original_line := round(p_quantity * v_variant.base_price, 2);
  v_remaining := v_original_line;

  for v_campaign in
    select c.*
    from public.promotion_campaigns c
    where c.organization_id = p_organization_id
      and c.status = 'ACTIVE'
      and c.scope = 'CART'
      and (c.currency_code is null or c.currency_code = 'THB')
    order by c.priority desc, c.id asc
  loop
    select count(*), (array_agg(v.id order by v.id))[1]
    into v_version_count, v_version_id
    from public.promotion_campaign_versions v
    where v.organization_id = p_organization_id
      and v.campaign_id = v_campaign.id
      and v.status = 'ACTIVE'
      and (v.effective_from is null or v.effective_from <= p_evaluated_at)
      and (v.effective_until is null or v.effective_until > p_evaluated_at);

    if v_version_count > 1 then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'AMBIGUOUS_ACTIVE_VERSION';
    end if;

    if v_version_count = 0 then
      continue;
    end if;

    if v_campaign.usage_limit is not null
       or v_campaign.usage_limit_per_customer is not null
       or (
         v_campaign.exclusive_group is not null
         and trim(v_campaign.exclusive_group) = ''
       ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_CAMPAIGN_CONFIGURATION';
    end if;

    if exists (
      select 1
      from public.promotion_condition_groups cg
      where cg.organization_id = p_organization_id
        and cg.campaign_version_id = v_version_id
    ) or exists (
      select 1
      from public.promotion_bundles b
      where b.organization_id = p_organization_id
        and b.campaign_version_id = v_version_id
    ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_VERSION_CHILD';
    end if;

    if not exists (
      select 1
      from public.promotion_target_scopes ts
      where ts.organization_id = p_organization_id
        and ts.campaign_version_id = v_version_id
    ) or exists (
      select 1
      from public.promotion_target_scopes ts
      where ts.organization_id = p_organization_id
        and ts.campaign_version_id = v_version_id
        and (
          ts.scope_type <> 'VARIANT'
          or not ts.include
          or ts.reference_id is null
          or not exists (
            select 1
            from public.product_variants target_variant
            where target_variant.organization_id = p_organization_id
              and target_variant.id = ts.reference_id
          )
          or (
            ts.action_id is not null
            and not exists (
              select 1
              from public.promotion_actions target_action
              where target_action.organization_id = p_organization_id
                and target_action.campaign_version_id = v_version_id
                and target_action.id = ts.action_id
            )
          )
        )
    ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_TARGET_CONFIGURATION';
    end if;

    if not exists (
      select 1
      from public.promotion_rules r
      where r.organization_id = p_organization_id
        and r.campaign_version_id = v_version_id
    ) or exists (
      select 1
      from public.promotion_rules r
      where r.organization_id = p_organization_id
        and r.campaign_version_id = v_version_id
        and (
          r.rule_type <> 'MIN_QUANTITY'
          or r.scope_type <> 'VARIANT'
          or r.min_quantity is null
          or r.min_quantity <= 0
          or (r.max_quantity is not null and r.max_quantity < r.min_quantity)
          or r.repeatable
          or r.max_repeat_count is not null
          or r.min_spend is not null
          or r.max_spend is not null
          or (r.value_json is not null and r.value_json <> '{}'::jsonb)
          or (
            select count(*)
            from public.promotion_actions a
            where a.organization_id = p_organization_id
              and a.campaign_version_id = v_version_id
              and a.rule_id = r.id
          ) <> 1
        )
    ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_RULE_CONFIGURATION';
    end if;

    if exists (
      select 1
      from public.promotion_actions a
      where a.organization_id = p_organization_id
        and a.campaign_version_id = v_version_id
        and (
          a.rule_id is null
          or a.action_type not in (
            'PERCENT_DISCOUNT',
            'FIXED_DISCOUNT',
            'FIXED_UNIT_PRICE'
          )
          or a.max_discount_amount is not null
          or (a.exclusive_group is not null and trim(a.exclusive_group) = '')
          or (
            a.exclusive_group is not null
            and v_campaign.exclusive_group is not null
            and trim(a.exclusive_group) <> trim(v_campaign.exclusive_group)
          )
          or (
            a.action_type = 'PERCENT_DISCOUNT'
            and not case
              when jsonb_typeof(a.value_json) = 'object'
                and jsonb_typeof(a.value_json -> 'percent') = 'number'
                and (select count(*) from jsonb_object_keys(a.value_json)) = 1
              then (a.value_json ->> 'percent')::numeric > 0
                and (a.value_json ->> 'percent')::numeric <= 100
                and (a.value_json ->> 'percent')::numeric =
                  round((a.value_json ->> 'percent')::numeric, 4)
              else false
            end
          )
          or (
            a.action_type = 'FIXED_DISCOUNT'
            and not case
              when jsonb_typeof(a.value_json) = 'object'
                and jsonb_typeof(a.value_json -> 'amount') = 'number'
                and (select count(*) from jsonb_object_keys(a.value_json)) = 1
              then (a.value_json ->> 'amount')::numeric > 0
                and (a.value_json ->> 'amount')::numeric =
                  round((a.value_json ->> 'amount')::numeric, 2)
              else false
            end
          )
          or (
            a.action_type = 'FIXED_UNIT_PRICE'
            and a.value_json is not null
            and a.value_json <> '{}'::jsonb
          )
        )
    ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_ACTION_CONFIGURATION';
    end if;

    if exists (
      select 1
      from public.promotion_actions a
      where a.organization_id = p_organization_id
        and a.campaign_version_id = v_version_id
        and (
          exists (
            select 1
            from public.promotion_tiers t
            where t.organization_id = p_organization_id
              and t.action_id = a.id
          )
          or exists (
            select 1
            from public.promotion_reward_rules rr
            where rr.organization_id = p_organization_id
              and rr.action_id = a.id
          )
        )
    ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_ACTION_CHILD';
    end if;

    if exists (
      select 1
      from public.promotion_actions a
      where a.organization_id = p_organization_id
        and a.campaign_version_id = v_version_id
        and (
          (
            a.action_type <> 'FIXED_UNIT_PRICE'
            and exists (
              select 1
              from public.promotion_price_mappings pm
              where pm.organization_id = p_organization_id
                and pm.action_id = a.id
            )
          )
          or (
            a.action_type = 'FIXED_UNIT_PRICE'
            and (
              exists (
                select 1
                from public.promotion_price_mappings pm
                where pm.organization_id = p_organization_id
                  and pm.action_id = a.id
                  and (
                    pm.mapping_type <> 'VARIANT'
                    or pm.currency_code <> 'THB'
                    or not exists (
                      select 1
                      from public.promotion_target_scopes ts
                      where ts.organization_id = p_organization_id
                        and ts.campaign_version_id = v_version_id
                        and ts.scope_type = 'VARIANT'
                        and ts.include
                        and ts.reference_id = pm.reference_id
                        and (ts.action_id is null or ts.action_id = a.id)
                    )
                  )
              )
              or exists (
                select 1
                from public.promotion_target_scopes ts
                where ts.organization_id = p_organization_id
                  and ts.campaign_version_id = v_version_id
                  and ts.scope_type = 'VARIANT'
                  and ts.include
                  and (ts.action_id is null or ts.action_id = a.id)
                  and (
                    select count(*)
                    from public.promotion_price_mappings pm
                    where pm.organization_id = p_organization_id
                      and pm.action_id = a.id
                      and pm.mapping_type = 'VARIANT'
                      and pm.currency_code = 'THB'
                      and pm.reference_id = ts.reference_id
                  ) <> 1
              )
            )
          )
        )
    ) then
      raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
        using errcode = 'P0001', detail = 'UNSUPPORTED_PRICE_MAPPING';
    end if;
  end loop;

  for v_candidate in
    select distinct
      c.id as campaign_id,
      c.priority as campaign_priority,
      c.stackable as campaign_stackable,
      c.exclusive_group as campaign_exclusive_group,
      v.id as campaign_version_id,
      r.id as rule_id,
      r.priority as rule_priority,
      a.id as action_id,
      a.action_type,
      a.priority as action_priority,
      a.stackable as action_stackable,
      a.exclusive_group as action_exclusive_group,
      a.value_json
    from public.promotion_campaigns c
    join public.promotion_campaign_versions v
      on v.organization_id = c.organization_id
     and v.campaign_id = c.id
    join public.promotion_rules r
      on r.organization_id = v.organization_id
     and r.campaign_version_id = v.id
    join public.promotion_actions a
      on a.organization_id = r.organization_id
     and a.campaign_version_id = v.id
     and a.rule_id = r.id
    join public.promotion_target_scopes ts
      on ts.organization_id = v.organization_id
     and ts.campaign_version_id = v.id
     and (ts.action_id is null or ts.action_id = a.id)
    where c.organization_id = p_organization_id
      and c.status = 'ACTIVE'
      and c.scope = 'CART'
      and (c.currency_code is null or c.currency_code = 'THB')
      and v.status = 'ACTIVE'
      and (v.effective_from is null or v.effective_from <= p_evaluated_at)
      and (v.effective_until is null or v.effective_until > p_evaluated_at)
      and r.rule_type = 'MIN_QUANTITY'
      and r.scope_type = 'VARIANT'
      and p_quantity >= r.min_quantity
      and (r.max_quantity is null or p_quantity <= r.max_quantity)
      and ts.scope_type = 'VARIANT'
      and ts.include
      and ts.reference_id = p_variant_id
    order by
      campaign_priority desc,
      rule_priority desc,
      action_priority desc,
      campaign_id asc,
      campaign_version_id asc,
      rule_id asc,
      action_id asc
  loop
    v_effective_group := coalesce(
      trim(v_candidate.action_exclusive_group),
      trim(v_candidate.campaign_exclusive_group)
    );

    if v_effective_group is not null
       and v_effective_group = any(v_applied_groups) then
      continue;
    end if;

    if v_candidate.action_type = 'PERCENT_DISCOUNT' then
      v_value := (v_candidate.value_json ->> 'percent')::numeric;
      v_benefit := least(v_remaining, round(v_remaining * v_value / 100, 2));
    elsif v_candidate.action_type = 'FIXED_DISCOUNT' then
      v_value := (v_candidate.value_json ->> 'amount')::numeric;
      v_benefit := least(v_remaining, v_value);
    else
      select pm.fixed_unit_price
      into strict v_mapped_unit
      from public.promotion_price_mappings pm
      where pm.organization_id = p_organization_id
        and pm.action_id = v_candidate.action_id
        and pm.mapping_type = 'VARIANT'
        and pm.currency_code = 'THB'
        and pm.reference_id = p_variant_id;

      v_mapped_line := round(p_quantity * v_mapped_unit, 2);
      if v_mapped_line > v_remaining then
        raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
          using errcode = 'P0001', detail = 'FIXED_UNIT_PRICE_INCREASES_PRICE';
      end if;
      v_benefit := v_remaining - v_mapped_line;
    end if;

    v_benefit := round(v_benefit, 2);
    v_remaining := round(v_remaining - v_benefit, 2);

    if v_remaining < 0
       or v_remaining > v_original_line
       or (
         v_variant.minimum_selling_price is not null
         and v_remaining < round(p_quantity * v_variant.minimum_selling_price, 2)
       ) then
      raise exception 'PROMOTION_PRICE_FLOOR_VIOLATION' using errcode = 'P0001';
    end if;

    if v_effective_group is not null then
      v_applied_groups := array_append(v_applied_groups, v_effective_group);
    end if;

    v_applied_actions := v_applied_actions || jsonb_build_array(
      jsonb_build_object(
        'campaign_id', v_candidate.campaign_id,
        'promotion_version_id', v_candidate.campaign_version_id,
        'rule_id', v_candidate.rule_id,
        'action_id', v_candidate.action_id,
        'action_type', v_candidate.action_type
      )
    );

    if not v_candidate.campaign_stackable
       or not v_candidate.action_stackable then
      exit;
    end if;
  end loop;

  return jsonb_build_object(
    'currency_code', 'THB',
    'original_unit_price', round(v_variant.base_price, 2),
    'calculated_unit_price', round(v_remaining / p_quantity, 2),
    'line_discount_total', round(v_original_line - v_remaining, 2),
    'line_total', v_remaining,
    'pricing_snapshot', jsonb_build_object(
      'schema_version', 1,
      'currency_code', 'THB',
      'base_unit_price', to_char(round(v_variant.base_price, 2), 'FM9999999999990.00'),
      'applied_unit_price', to_char(round(v_remaining / p_quantity, 2), 'FM9999999999990.00'),
      'line_benefit_total', to_char(round(v_original_line - v_remaining, 2), 'FM9999999999990.00'),
      'applied_actions', v_applied_actions,
      'calculated_at', p_evaluated_at
    )
  );
exception
  when no_data_found or too_many_rows then
    raise exception 'PROMOTION_CONFIGURATION_UNSUPPORTED'
      using errcode = 'P0001', detail = 'AMBIGUOUS_PRICE_MAPPING';
end;
$$;

revoke all on function public.internal_evaluate_storefront_variant_promotion(
  uuid,
  uuid,
  numeric,
  timestamptz
) from public, anon, authenticated, service_role;

comment on function public.internal_evaluate_storefront_variant_promotion(
  uuid,
  uuid,
  numeric,
  timestamptz
) is 'Internal PE01-PE24 automatic item promotion evaluator; no direct Data API execution.';

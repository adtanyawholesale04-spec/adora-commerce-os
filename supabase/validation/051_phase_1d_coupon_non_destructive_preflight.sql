begin transaction read only;

with preflight_checks as (
  select
    'normalized_code_duplicates'::text as check_name,
    count(*)::bigint as blocking_count
  from (
    select c.organization_id, upper(btrim(c.code)) as normalized_code
    from public.coupons c
    group by c.organization_id, upper(btrim(c.code))
    having count(*) > 1
  ) duplicates

  union all

  select
    'unsafe_active_codes',
    count(*)
  from public.coupons c
  where c.status = 'ACTIVE'
    and (
      btrim(c.code) = ''
      or c.code ~ '[[:cntrl:]]'
    )

  union all

  select
    'automatic_coupon_version_overlap',
    count(distinct v.id)
  from public.coupons cp
  join public.promotion_campaign_versions v
    on v.organization_id = cp.organization_id
   and v.id = cp.campaign_version_id
  join public.promotion_campaigns c
    on c.organization_id = v.organization_id
   and c.id = v.campaign_id
  where c.status = 'ACTIVE'
    and c.scope = 'CART'
    and (c.currency_code is null or c.currency_code = 'THB')
    and v.status = 'ACTIVE'
    and (v.effective_from is null or v.effective_from <= statement_timestamp())
    and (v.effective_until is null or v.effective_until > statement_timestamp())

  union all

  select
    'active_redemption_cart_duplicates',
    count(*)
  from (
    select r.organization_id, r.cart_id
    from public.coupon_redemptions r
    where r.cart_id is not null
      and r.status in ('RESERVED', 'CONSUMED')
    group by r.organization_id, r.cart_id
    having count(*) > 1
  ) duplicates

  union all

  select
    'active_redemption_order_duplicates',
    count(*)
  from (
    select r.organization_id, r.order_id
    from public.coupon_redemptions r
    where r.order_id is not null
      and r.status in ('RESERVED', 'CONSUMED')
    group by r.organization_id, r.order_id
    having count(*) > 1
  ) duplicates

  union all

  select
    'invalid_active_coupon_campaign_links',
    count(*)
  from public.coupons cp
  left join public.promotion_campaign_versions v
    on v.organization_id = cp.organization_id
   and v.id = cp.campaign_version_id
  left join public.promotion_campaigns c
    on c.organization_id = v.organization_id
   and c.id = v.campaign_id
  where cp.status = 'ACTIVE'
    and (
      cp.campaign_version_id is null
      or v.id is null
      or c.id is null
      or c.scope <> 'ORDER'
      or (c.currency_code is not null and c.currency_code <> 'THB')
    )

  union all

  select
    'invalid_usage_limits',
    (
      select count(*)
      from public.coupons cp
      where (cp.usage_limit is not null and cp.usage_limit <= 0)
         or (
           cp.usage_limit_per_customer is not null
           and cp.usage_limit_per_customer <= 0
         )
    ) + (
      select count(*)
      from public.promotion_campaigns c
      where (c.usage_limit is not null and c.usage_limit <= 0)
         or (
           c.usage_limit_per_customer is not null
           and c.usage_limit_per_customer <= 0
         )
    )

  union all

  select
    'redemption_tenant_or_lifecycle_violations',
    count(*)
  from public.coupon_redemptions r
  left join public.coupons cp on cp.id = r.coupon_id
  where cp.id is null
     or cp.organization_id <> r.organization_id
     or r.cart_id is null
     or r.order_id is null
     or r.reserved_at is null
     or (
       r.status = 'RESERVED'
       and (r.consumed_at is not null or r.released_at is not null)
     )
     or (
       r.status = 'CONSUMED'
       and (r.consumed_at is null or r.released_at is not null)
     )
     or (
       r.status = 'RELEASED'
       and (r.consumed_at is not null or r.released_at is null)
     )
     or (
       r.status = 'REVERSED'
       and r.consumed_at is null
     )
),
ordered_results as (
  select check_name, blocking_count
  from preflight_checks

  union all

  select 'coupon_preflight', 0
  where not exists (
    select 1
    from preflight_checks
    where blocking_count <> 0
  )
)
select concat_ws(
  '|',
  check_name,
  case
    when check_name = 'coupon_preflight' then 'pass'
    else blocking_count::text
  end
)
from ordered_results
order by check_name;

rollback;

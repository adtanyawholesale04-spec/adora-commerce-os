with
pending_orders as (
  select o.*
  from public.orders o
  where o.source = 'STOREFRONT'
    and o.order_status = 'PENDING_CONFIRMATION'
    and o.payment_status = 'UNPAID'
),
payment_counts as (
  select po.organization_id, po.id as order_id, count(p.id) as payment_count
  from pending_orders po
  left join public.payments p
    on p.organization_id = po.organization_id
   and p.order_id = po.id
  group by po.organization_id, po.id
),
reservation_summary as (
  select
    po.organization_id,
    po.id as order_id,
    count(ir.id) filter (where ir.status = 'ACTIVE') as active_count,
    count(distinct ir.expires_at) filter (where ir.status = 'ACTIVE') as expiry_count,
    count(ir.id) filter (
      where ir.status = 'ACTIVE'
        and (ir.expires_at is null or ir.expires_at < po.payment_due_at)
    ) as uncovered_count
  from pending_orders po
  left join public.inventory_reservations ir
    on ir.organization_id = po.organization_id
   and ir.order_id = po.id
  group by po.organization_id, po.id, po.payment_due_at
),
active_reservation_totals as (
  select
    ir.organization_id,
    ir.warehouse_id,
    ir.variant_id,
    sum(ir.quantity) as reservation_quantity
  from public.inventory_reservations ir
  where ir.status = 'ACTIVE'
  group by ir.organization_id, ir.warehouse_id, ir.variant_id
),
checks as (
  select
    'PF01_CHECKOUT_SETTING_DEADLINE_ORDER'::text as check_id,
    'BLOCKER'::text as severity,
    count(*)::bigint as finding_count
  from public.organization_checkout_settings s
  where s.payment_due_minutes > s.reservation_minutes

  union all
  select 'PF02_PENDING_ORDER_DEADLINE_REQUIRED', 'BLOCKER', count(*)::bigint
  from pending_orders po
  where po.payment_due_at is null

  union all
  select 'PF03_ONE_PAYMENT_PER_PENDING_ORDER', 'BLOCKER', count(*)::bigint
  from payment_counts pc
  where pc.payment_count <> 1

  union all
  select 'PF04_PENDING_PAYMENT_AGGREGATE_MATCH', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.payments p
    on p.organization_id = po.organization_id
   and p.order_id = po.id
  where p.status <> 'UNPAID'
     or p.currency_code <> 'THB'
     or po.currency_code <> 'THB'
     or p.amount_expected <> po.grand_total
     or p.amount_expected <> po.amount_due
     or p.amount_received <> 0
     or po.amount_paid <> 0

  union all
  select 'PF05_ACTIVE_HOLD_REQUIRED', 'BLOCKER', count(*)::bigint
  from reservation_summary rs
  where rs.active_count = 0

  union all
  select 'PF06_HOLD_COVERS_PAYMENT_DEADLINE', 'BLOCKER', count(*)::bigint
  from reservation_summary rs
  where rs.uncovered_count > 0

  union all
  select 'PF07_ONE_HOLD_DEADLINE_PER_ORDER', 'BLOCKER', count(*)::bigint
  from reservation_summary rs
  where rs.expiry_count > 1

  union all
  select 'PF08_RESERVATION_ORDER_ITEM_LINEAGE', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.inventory_reservations ir
    on ir.organization_id = po.organization_id
   and ir.order_id = po.id
   and ir.status = 'ACTIVE'
  left join public.order_items oi
    on oi.organization_id = ir.organization_id
   and oi.id = ir.order_item_id
  where ir.order_item_id is null
     or oi.id is null
     or oi.order_id <> po.id
     or oi.variant_id is distinct from ir.variant_id

  union all
  select 'PF09_BALANCE_RESERVED_COVERS_ACTIVE_HOLDS', 'BLOCKER', count(*)::bigint
  from active_reservation_totals art
  left join public.inventory_balances ib
    on ib.organization_id = art.organization_id
   and ib.warehouse_id = art.warehouse_id
   and ib.variant_id = art.variant_id
  where ib.id is null
     or ib.reserved < art.reservation_quantity

  union all
  select 'PF10_NO_PRESETTLEMENT_ALLOCATION', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.inventory_allocations ia
    on ia.organization_id = po.organization_id
   and ia.order_id = po.id
   and ia.status in ('ACTIVE', 'FULFILLED')

  union all
  select 'PF11_ONE_PENDING_TRANSACTION_PER_PAYMENT', 'BLOCKER', count(*)::bigint
  from (
    select pt.organization_id, pt.payment_id
    from public.payment_transactions pt
    where pt.status = 'PENDING'
    group by pt.organization_id, pt.payment_id
    having count(*) > 1
  ) duplicate_pending

  union all
  select 'PF12_PENDING_MANUAL_TRANSACTION_SHAPE', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.payments p
    on p.organization_id = po.organization_id
   and p.order_id = po.id
  join public.payment_transactions pt
    on pt.organization_id = p.organization_id
   and pt.payment_id = p.id
   and pt.status = 'PENDING'
  where pt.transaction_type <> 'PAYMENT'
     or pt.payment_method <> 'BANK_TRANSFER'
     or pt.currency_code <> 'THB'
     or pt.amount <> p.amount_expected
     or pt.external_reference is null
     or btrim(pt.external_reference) = ''

  union all
  select 'PF13_ONE_PROOF_PER_PENDING_TRANSACTION', 'BLOCKER', count(*)::bigint
  from (
    select pt.organization_id, pt.id
    from pending_orders po
    join public.payments p
      on p.organization_id = po.organization_id
     and p.order_id = po.id
    join public.payment_transactions pt
      on pt.organization_id = p.organization_id
     and pt.payment_id = p.id
     and pt.status = 'PENDING'
    left join public.payment_proofs pp
      on pp.organization_id = pt.organization_id
     and pp.payment_transaction_id = pt.id
    group by pt.organization_id, pt.id
    having count(pp.id) <> 1
  ) proof_count_mismatch

  union all
  select 'PF14_PENDING_PROOF_STATE', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.payments p
    on p.organization_id = po.organization_id
   and p.order_id = po.id
  join public.payment_transactions pt
    on pt.organization_id = p.organization_id
   and pt.payment_id = p.id
   and pt.status = 'PENDING'
  join public.payment_proofs pp
    on pp.organization_id = pt.organization_id
   and pp.payment_transaction_id = pt.id
  where pp.verification_status <> 'PENDING'

  union all
  select 'PF15_NORMALIZED_ACTIVE_REFERENCE_UNIQUE', 'BLOCKER', count(*)::bigint
  from (
    select
      pt.organization_id,
      upper(btrim(pt.external_reference)) as normalized_reference
    from public.payment_transactions pt
    where pt.payment_method = 'BANK_TRANSFER'
      and pt.status in ('PENDING', 'SUCCEEDED')
      and pt.external_reference is not null
    group by pt.organization_id, upper(btrim(pt.external_reference))
    having count(*) > 1
  ) duplicate_reference

  union all
  select 'PF16_PENDING_ORDER_COUPON_CARDINALITY', 'BLOCKER', count(*)::bigint
  from (
    select po.organization_id, po.id
    from pending_orders po
    join public.coupon_redemptions cr
      on cr.organization_id = po.organization_id
     and cr.order_id = po.id
    group by po.organization_id, po.id
    having count(*) > 1
  ) duplicate_coupon

  union all
  select 'PF17_PENDING_ORDER_COUPON_STATE', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.coupon_redemptions cr
    on cr.organization_id = po.organization_id
   and cr.order_id = po.id
  where cr.status <> 'RESERVED'

  union all
  select 'PF18_NO_SUCCESS_EVIDENCE_ON_UNPAID_ORDER', 'BLOCKER', count(*)::bigint
  from pending_orders po
  join public.payments p
    on p.organization_id = po.organization_id
   and p.order_id = po.id
  join public.payment_transactions pt
    on pt.organization_id = p.organization_id
   and pt.payment_id = p.id
   and pt.status = 'SUCCEEDED'

  union all
  select 'PF19_REFERENCE_ONLY_SCHEMA_GAP', 'EXPECTED_GAP', count(*)::bigint
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'payment_proofs'
    and c.column_name = 'storage_path'
    and c.is_nullable = 'NO'

  union all
  select 'PF20_ALLOCATION_LINEAGE_SCHEMA_GAP', 'EXPECTED_GAP',
    case when exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'inventory_allocations'
        and c.column_name = 'source_reservation_id'
    ) then 0 else 1 end::bigint
)
select check_id, severity, finding_count
from checks
order by check_id;

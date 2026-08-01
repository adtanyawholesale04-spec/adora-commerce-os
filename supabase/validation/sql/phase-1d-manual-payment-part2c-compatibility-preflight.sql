with checks(check_id, severity, finding_count) as (
  select 'CF01_PAYMENT_WITHIN_HOLD', 'BLOCKER', count(*)::bigint
  from public.organization_checkout_settings ocs
  where ocs.payment_due_minutes > ocs.reservation_minutes

  union all
  select 'CF02_BINARY_PROOF_PATH_SHAPE', 'BLOCKER', count(*)::bigint
  from public.payment_proofs pp
  where char_length(btrim(pp.storage_path)) not between 1 and 1024

  union all
  select 'CF03_ONE_PENDING_PROOF', 'BLOCKER', count(*)::bigint
  from (
    select 1
    from public.payment_proofs pp
    where pp.verification_status = 'PENDING'
    group by pp.organization_id, pp.payment_transaction_id
    having count(*) > 1
  ) duplicates

  union all
  select 'CF04_ONE_PENDING_BANK_ATTEMPT', 'BLOCKER', count(*)::bigint
  from (
    select 1
    from public.payment_transactions pt
    where pt.transaction_type = 'PAYMENT'
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status = 'PENDING'
    group by pt.organization_id, pt.payment_id
    having count(*) > 1
  ) duplicates

  union all
  select 'CF05_NORMALIZED_ACTIVE_BANK_REFERENCE', 'BLOCKER', count(*)::bigint
  from (
    select 1
    from public.payment_transactions pt
    where pt.external_reference is not null
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status in ('PENDING', 'SUCCEEDED')
    group by pt.organization_id, upper(btrim(pt.external_reference))
    having count(*) > 1
  ) duplicates

  union all
  select 'CF06_RESERVATION_TENANT_IDENTITY', 'BLOCKER', count(*)::bigint
  from (
    select 1
    from public.inventory_reservations ir
    group by ir.organization_id, ir.id
    having count(*) > 1
  ) duplicates

  union all
  select 'CF07_ADDITIVE_OBJECT_COLLISION', 'BLOCKER', count(*)::bigint
  from (
    select c.column_name as object_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'inventory_allocations'
      and c.column_name = 'source_reservation_id'

    union all

    select pc.conname
    from pg_constraint pc
    join pg_namespace pn on pn.oid = pc.connamespace
    where pn.nspname = 'public'
      and pc.conname in (
        'organization_checkout_settings_payment_within_hold_check',
        'payment_proofs_evidence_shape_check',
        'inventory_reservations_organization_id_id_key',
        'inventory_allocations_source_reservation_tenant_fk'
      )

    union all

    select ci.relname
    from pg_class ci
    join pg_namespace ni on ni.oid = ci.relnamespace
    where ni.nspname = 'public'
      and ci.relkind = 'i'
      and ci.relname in (
        'payment_proofs_one_pending_per_transaction_uidx',
        'payment_transactions_one_pending_bank_transfer_uidx',
        'payment_transactions_normalized_active_bank_reference_uidx',
        'inventory_allocations_source_reservation_uidx'
      )
  ) conflicts
)
select check_id, severity, finding_count
from checks
order by check_id;

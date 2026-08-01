-- ADORA Commerce OS (ACOS)
-- Phase 1D Manual Payment Part 2C additive schema boundary.

set lock_timeout = '5s';
set statement_timeout = '30s';

do $$
declare
  v_conflicting_objects text[];
begin
  select array_agg(object_name order by object_name)
  into v_conflicting_objects
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
  ) conflicts(object_name);

  if v_conflicting_objects is not null then
    raise exception
      'Phase 1D manual payment additive objects already exist: %',
      array_to_string(v_conflicting_objects, ', ');
  end if;

  if exists (
    select 1
    from public.organization_checkout_settings ocs
    where ocs.payment_due_minutes > ocs.reservation_minutes
  ) then
    raise exception
      'Unsafe checkout settings: payment deadline exceeds reservation duration';
  end if;

  if exists (
    select 1
    from public.payment_proofs pp
    where char_length(btrim(pp.storage_path)) not between 1 and 1024
  ) then
    raise exception 'Unsafe payment proof storage path shape';
  end if;

  if exists (
    select 1
    from public.payment_proofs pp
    where pp.verification_status = 'PENDING'
    group by pp.organization_id, pp.payment_transaction_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate pending payment proofs exist';
  end if;

  if exists (
    select 1
    from public.payment_transactions pt
    where pt.transaction_type = 'PAYMENT'
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status = 'PENDING'
    group by pt.organization_id, pt.payment_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate pending bank-transfer attempts exist';
  end if;

  if exists (
    select 1
    from public.payment_transactions pt
    where pt.external_reference is not null
      and pt.payment_method = 'BANK_TRANSFER'
      and pt.status in ('PENDING', 'SUCCEEDED')
    group by pt.organization_id, upper(btrim(pt.external_reference))
    having count(*) > 1
  ) then
    raise exception 'Duplicate normalized active bank-transfer references exist';
  end if;

  if exists (
    select 1
    from public.inventory_reservations ir
    group by ir.organization_id, ir.id
    having count(*) > 1
  ) then
    raise exception 'Duplicate same-tenant inventory reservation identity exists';
  end if;
end
$$;

alter table public.organization_checkout_settings
  alter column payment_due_minutes set default 15;

alter table public.organization_checkout_settings
  add constraint organization_checkout_settings_payment_within_hold_check
  check (payment_due_minutes <= reservation_minutes) not valid;

alter table public.payment_proofs
  alter column storage_path drop not null;

alter table public.payment_proofs
  add constraint payment_proofs_evidence_shape_check
  check (
    (
      storage_path is not null
      and char_length(btrim(storage_path)) between 1 and 1024
    )
    or (
      storage_path is null
      and mime_type is null
      and submitted_by_type = 'CUSTOMER'
      and metadata_json =
        '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'::jsonb
    )
  ) not valid;

create unique index payment_proofs_one_pending_per_transaction_uidx
on public.payment_proofs (organization_id, payment_transaction_id)
where verification_status = 'PENDING';

create unique index payment_transactions_one_pending_bank_transfer_uidx
on public.payment_transactions (organization_id, payment_id)
where transaction_type = 'PAYMENT'
  and payment_method = 'BANK_TRANSFER'
  and status = 'PENDING';

create unique index payment_transactions_normalized_active_bank_reference_uidx
on public.payment_transactions (
  organization_id,
  upper(btrim(external_reference))
)
where external_reference is not null
  and payment_method = 'BANK_TRANSFER'
  and status in ('PENDING', 'SUCCEEDED');

alter table public.inventory_reservations
  add constraint inventory_reservations_organization_id_id_key
  unique (organization_id, id);

alter table public.inventory_allocations
  add column source_reservation_id uuid;

alter table public.inventory_allocations
  add constraint inventory_allocations_source_reservation_tenant_fk
  foreign key (organization_id, source_reservation_id)
  references public.inventory_reservations(organization_id, id)
  on delete restrict
  not valid;

create unique index inventory_allocations_source_reservation_uidx
on public.inventory_allocations (organization_id, source_reservation_id)
where source_reservation_id is not null;

alter table public.organization_checkout_settings
  validate constraint organization_checkout_settings_payment_within_hold_check;

alter table public.payment_proofs
  validate constraint payment_proofs_evidence_shape_check;

alter table public.inventory_allocations
  validate constraint inventory_allocations_source_reservation_tenant_fk;

comment on column public.payment_proofs.storage_path is
  'Private binary proof path; null only for exact CUSTOMER REFERENCE_ONLY evidence.';

comment on column public.inventory_allocations.source_reservation_id is
  'Same-tenant reservation converted exactly once by a guarded settlement boundary.';

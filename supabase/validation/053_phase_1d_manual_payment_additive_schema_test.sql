\set ON_ERROR_STOP on

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'payment_proofs'
      and c.column_name = 'storage_path'
      and c.is_nullable = 'YES'
  ) then
    raise exception 'payment_proofs.storage_path is not nullable';
  end if;

  if not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'inventory_allocations'
      and c.column_name = 'source_reservation_id'
      and c.is_nullable = 'YES'
      and c.data_type = 'uuid'
  ) then
    raise exception 'inventory allocation source lineage column is missing';
  end if;

  if (
    select count(*)
    from pg_constraint pc
    join pg_namespace pn on pn.oid = pc.connamespace
    where pn.nspname = 'public'
      and pc.conname in (
        'organization_checkout_settings_payment_within_hold_check',
        'payment_proofs_evidence_shape_check',
        'inventory_reservations_organization_id_id_key',
        'inventory_allocations_source_reservation_tenant_fk'
      )
      and pc.convalidated
  ) <> 4 then
    raise exception 'manual payment constraints are missing or unvalidated';
  end if;

  if (
    select count(*)
    from pg_class ci
    join pg_namespace ni on ni.oid = ci.relnamespace
    where ni.nspname = 'public'
      and ci.relkind = 'i'
      and ci.relname in (
        'payment_proofs_one_pending_per_transaction_uidx',
        'payment_transactions_one_pending_bank_transfer_uidx',
        'payment_transactions_normalized_active_bank_reference_uidx',
        'payment_transactions_active_manual_reference_uidx',
        'inventory_allocations_source_reservation_uidx'
      )
  ) <> 5 then
    raise exception 'manual payment uniqueness indexes are incomplete';
  end if;

  if (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in (
        'organization_checkout_settings',
        'payment_transactions',
        'payment_proofs',
        'inventory_reservations',
        'inventory_allocations'
      )
      and c.relrowsecurity
  ) <> 5 then
    raise exception 'existing tenant RLS posture was not preserved';
  end if;
end
$$;

insert into public.organizations (id, name, slug, status)
values
  ('a1000000-0000-4000-8000-000000000001', 'Manual Payment Org A', 'manual-payment-org-a', 'ACTIVE'),
  ('a1000000-0000-4000-8000-000000000002', 'Manual Payment Org B', 'manual-payment-org-b', 'ACTIVE');

insert into public.organization_checkout_settings (organization_id, status)
values ('a1000000-0000-4000-8000-000000000001', 'ACTIVE');

do $$
declare
  v_reservation_minutes integer;
  v_payment_due_minutes integer;
begin
  select reservation_minutes, payment_due_minutes
  into v_reservation_minutes, v_payment_due_minutes
  from public.organization_checkout_settings
  where organization_id = 'a1000000-0000-4000-8000-000000000001';

  if v_reservation_minutes <> 15 or v_payment_due_minutes <> 15 then
    raise exception 'manual payment deadline defaults are not aligned';
  end if;

  begin
    insert into public.organization_checkout_settings (
      organization_id,
      status,
      reservation_minutes,
      payment_due_minutes
    ) values (
      'a1000000-0000-4000-8000-000000000002',
      'ACTIVE',
      15,
      16
    );
    raise exception 'payment deadline beyond stock hold unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end
$$;

insert into public.customers (
  id,
  organization_id,
  customer_code,
  display_name,
  status
)
values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'MP-CUSTOMER-A', 'Manual Customer A', 'ACTIVE'),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'MP-CUSTOMER-B', 'Manual Customer B', 'ACTIVE');

insert into public.products (id, organization_id, product_code, name, status)
values
  ('a3000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'MP-PRODUCT-A', 'Manual Product A', 'ACTIVE'),
  ('a3000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'MP-PRODUCT-B', 'Manual Product B', 'ACTIVE');

insert into public.product_variants (
  id,
  organization_id,
  product_id,
  stock_code,
  variant_name,
  base_price,
  cost_price,
  status
)
values
  ('a4000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'MP-SKU-A', 'Manual Variant A', 100, 50, 'ACTIVE'),
  ('a4000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000002', 'MP-SKU-B', 'Manual Variant B', 100, 50, 'ACTIVE');

insert into public.warehouses (id, organization_id, code, name, status)
values
  ('a5000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'MP-WH-A', 'Manual Warehouse A', 'ACTIVE'),
  ('a5000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'MP-WH-B', 'Manual Warehouse B', 'ACTIVE');

insert into public.orders (
  id,
  organization_id,
  customer_id,
  order_number,
  source,
  order_status,
  payment_status,
  fulfillment_status,
  subtotal,
  grand_total,
  amount_due,
  payment_due_at
)
values
  ('a6000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'MP-ORDER-A1', 'STOREFRONT', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 100, now() + interval '15 minutes'),
  ('a6000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'MP-ORDER-A2', 'STOREFRONT', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 100, now() + interval '15 minutes'),
  ('a6000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', 'MP-ORDER-B1', 'STOREFRONT', 'PENDING_CONFIRMATION', 'UNPAID', 'UNFULFILLED', 100, 100, 100, now() + interval '15 minutes');

insert into public.order_items (
  id,
  organization_id,
  order_id,
  variant_id,
  sku_snapshot,
  product_name_snapshot,
  variant_name_snapshot,
  quantity,
  original_unit_price,
  applied_unit_price,
  line_total
)
values
  ('a7000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'MP-SKU-A', 'Manual Product A', 'Manual Variant A', 1, 100, 100, 100),
  ('a7000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000001', 'MP-SKU-A', 'Manual Product A', 'Manual Variant A', 1, 100, 100, 100),
  ('a7000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000003', 'a4000000-0000-4000-8000-000000000002', 'MP-SKU-B', 'Manual Product B', 'Manual Variant B', 1, 100, 100, 100);

insert into public.payments (
  id,
  organization_id,
  order_id,
  status,
  amount_expected,
  amount_received,
  currency_code
)
values
  ('a8000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'UNPAID', 100, 0, 'THB'),
  ('a8000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000002', 'UNPAID', 100, 0, 'THB');

insert into public.payment_transactions (
  id,
  organization_id,
  payment_id,
  transaction_type,
  payment_method,
  amount,
  currency_code,
  external_reference,
  status
)
values
  ('a9000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-000000000001', 'PAYMENT', 'BANK_TRANSFER', 100, 'THB', 'BANK-REF-001', 'PENDING'),
  ('a9000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a8000000-0000-4000-8000-000000000002', 'PAYMENT', 'BANK_TRANSFER', 100, 'THB', 'BANK-REF-002', 'PENDING');

do $$
begin
  begin
    insert into public.payment_transactions (
      organization_id,
      payment_id,
      transaction_type,
      payment_method,
      amount,
      currency_code,
      external_reference,
      status
    ) values (
      'a1000000-0000-4000-8000-000000000001',
      'a8000000-0000-4000-8000-000000000001',
      'PAYMENT',
      'BANK_TRANSFER',
      100,
      'THB',
      'BANK-REF-003',
      'PENDING'
    );
    raise exception 'second pending payment attempt unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;

  begin
    update public.payment_transactions
    set external_reference = ' bank-ref-001 '
    where id = 'a9000000-0000-4000-8000-000000000002';
    raise exception 'normalized duplicate active reference unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end
$$;

insert into public.payment_proofs (
  id,
  organization_id,
  payment_transaction_id,
  storage_path,
  mime_type,
  submitted_by_type,
  verification_status,
  metadata_json
)
values
  ('aa000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000001', null, null, 'CUSTOMER', 'PENDING', '{"schema_version":1,"evidence_type":"REFERENCE_ONLY"}'::jsonb),
  ('aa000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000002', 'private/manual-proof-a2.png', 'image/png', 'CUSTOMER', 'PENDING', null);

do $$
begin
  begin
    insert into public.payment_proofs (
      organization_id,
      payment_transaction_id,
      storage_path,
      mime_type,
      submitted_by_type,
      verification_status,
      metadata_json
    ) values (
      'a1000000-0000-4000-8000-000000000001',
      'a9000000-0000-4000-8000-000000000001',
      'private/duplicate.png',
      'image/png',
      'CUSTOMER',
      'PENDING',
      null
    );
    raise exception 'second pending proof unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.payment_proofs (
      organization_id,
      payment_transaction_id,
      storage_path,
      mime_type,
      submitted_by_type,
      verification_status,
      metadata_json
    ) values (
      'a1000000-0000-4000-8000-000000000001',
      'a9000000-0000-4000-8000-000000000002',
      null,
      null,
      'CUSTOMER',
      'REJECTED',
      '{"schema_version":1,"evidence_type":"REFERENCE_ONLY","extra":true}'::jsonb
    );
    raise exception 'non-exact reference-only metadata unexpectedly succeeded';
  exception
    when check_violation then null;
  end;
end
$$;

insert into public.inventory_reservations (
  id,
  organization_id,
  warehouse_id,
  variant_id,
  order_id,
  order_item_id,
  quantity,
  status,
  expires_at
)
values
  ('ab000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 1, 'ACTIVE', now() + interval '15 minutes'),
  ('ab000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'a5000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000002', 'a6000000-0000-4000-8000-000000000003', 'a7000000-0000-4000-8000-000000000003', 1, 'ACTIVE', now() + interval '15 minutes');

insert into public.inventory_allocations (
  id,
  organization_id,
  warehouse_id,
  variant_id,
  order_id,
  order_item_id,
  source_reservation_id,
  quantity,
  status
)
values (
  'ac000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000001',
  'a4000000-0000-4000-8000-000000000001',
  'a6000000-0000-4000-8000-000000000001',
  'a7000000-0000-4000-8000-000000000001',
  'ab000000-0000-4000-8000-000000000001',
  1,
  'ACTIVE'
);

do $$
begin
  begin
    insert into public.inventory_allocations (
      organization_id,
      warehouse_id,
      variant_id,
      order_id,
      order_item_id,
      source_reservation_id,
      quantity,
      status
    ) values (
      'a1000000-0000-4000-8000-000000000001',
      'a5000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000001',
      'a6000000-0000-4000-8000-000000000001',
      'a7000000-0000-4000-8000-000000000001',
      'ab000000-0000-4000-8000-000000000001',
      1,
      'ACTIVE'
    );
    raise exception 'reservation converted twice unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.inventory_allocations (
      organization_id,
      warehouse_id,
      variant_id,
      order_id,
      order_item_id,
      source_reservation_id,
      quantity,
      status
    ) values (
      'a1000000-0000-4000-8000-000000000002',
      'a5000000-0000-4000-8000-000000000002',
      'a4000000-0000-4000-8000-000000000002',
      'a6000000-0000-4000-8000-000000000003',
      'a7000000-0000-4000-8000-000000000003',
      'ab000000-0000-4000-8000-000000000001',
      1,
      'ACTIVE'
    );
    raise exception 'cross-tenant reservation lineage unexpectedly succeeded';
  exception
    when foreign_key_violation then null;
  end;
end
$$;

insert into public.inventory_allocations (
  id,
  organization_id,
  warehouse_id,
  variant_id,
  order_id,
  order_item_id,
  source_reservation_id,
  quantity,
  status
)
values (
  'ac000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000002',
  'a4000000-0000-4000-8000-000000000002',
  'a6000000-0000-4000-8000-000000000003',
  'a7000000-0000-4000-8000-000000000003',
  null,
  1,
  'ACTIVE'
);

select 'phase_1d_manual_payment_additive_schema|pass';

rollback;

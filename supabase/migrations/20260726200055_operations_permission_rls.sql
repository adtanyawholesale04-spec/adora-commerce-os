-- ADORA Commerce OS (ACOS)
-- 041_operations_permission_rls.sql
--
-- Purpose:
-- - Extend permission-aware RLS to conversations, payments, returns,
--   fulfillment, QC, and shipping operations.
-- - Keep delete unavailable to browser/API roles.
-- - Keep high-risk workflows eligible for future guarded wrappers.

grant select, insert, update on table
  public.conversations,
  public.messages,
  public.conversation_assignments,
  public.conversation_notes,
  public.payments,
  public.payment_transactions,
  public.payment_proofs,
  public.refunds,
  public.refund_transactions,
  public.returns,
  public.return_items,
  public.return_status_history,
  public.return_inventory_dispositions,
  public.exchange_replacements,
  public.fulfillments,
  public.fulfillment_items,
  public.fulfillment_events,
  public.fulfillment_qc_sessions,
  public.fulfillment_qc_scans,
  public.fulfillment_qc_item_totals,
  public.shipments,
  public.shipment_packages,
  public.shipment_package_items,
  public.tracking_events
to authenticated;

grant select on table
  public.live_sessions,
  public.live_events,
  public.shipping_providers
to authenticated;

do $$
declare
  r record;
begin
  for r in
    select *
    from (
      values
        ('conversations', 'conversation.view', 'conversation.reply', 'conversation.assign'),
        ('messages', 'conversation.view', 'conversation.reply', null),
        ('conversation_assignments', 'conversation.view', 'conversation.assign', 'conversation.assign'),
        ('conversation_notes', 'conversation.view', 'conversation.reply', 'conversation.reply'),
        ('live_sessions', 'conversation.view', null, null),
        ('live_events', 'conversation.view', null, null),
        ('payments', 'payment.view', null, 'payment.verify'),
        ('payment_transactions', 'payment.view', 'payment.verify', 'payment.verify'),
        ('payment_proofs', 'payment.view', 'payment.verify', 'payment.verify'),
        ('refunds', 'payment.view', 'payment.refund', 'payment.refund'),
        ('refund_transactions', 'payment.view', 'payment.refund', 'payment.refund'),
        ('returns', 'return.view', 'return.manage', 'return.manage'),
        ('return_items', 'return.view', 'return.manage', 'return.manage'),
        ('return_status_history', 'return.view', 'return.manage', null),
        ('return_inventory_dispositions', 'return.view', 'return.inspect', 'return.inspect'),
        ('exchange_replacements', 'return.view', 'return.manage', 'return.manage'),
        ('fulfillments', 'warehouse.pick', 'warehouse.pick', 'warehouse.pick'),
        ('fulfillment_items', 'warehouse.pick', 'warehouse.pick', 'warehouse.pick'),
        ('fulfillment_events', 'warehouse.pick', 'warehouse.pick', null),
        ('fulfillment_qc_sessions', 'warehouse.qc', 'warehouse.qc', 'warehouse.qc'),
        ('fulfillment_qc_scans', 'warehouse.qc', 'warehouse.qc', null),
        ('fulfillment_qc_item_totals', 'warehouse.qc', null, 'warehouse.qc'),
        ('shipments', 'shipping.create', 'shipping.create', 'shipping.create'),
        ('shipment_packages', 'shipping.create', 'shipping.create', 'shipping.create'),
        ('shipment_package_items', 'shipping.create', 'shipping.create', 'shipping.create'),
        ('tracking_events', 'shipping.create', 'shipping.create', null),
        ('shipping_providers', 'shipping.create', null, null)
    ) as policy_map(table_name, select_permission, insert_permission, update_permission)
  loop
    execute format('drop policy if exists %I on public.%I', r.table_name || '_permission_select', r.table_name);
    execute format(
      'create policy %I on public.%I as restrictive for select to authenticated using (public.has_org_permission(organization_id, %L))',
      r.table_name || '_permission_select',
      r.table_name,
      r.select_permission
    );

    if r.insert_permission is not null then
      execute format('drop policy if exists %I on public.%I', r.table_name || '_permission_insert', r.table_name);
      execute format(
        'create policy %I on public.%I as restrictive for insert to authenticated with check (public.has_org_permission(organization_id, %L))',
        r.table_name || '_permission_insert',
        r.table_name,
        r.insert_permission
      );
    end if;

    if r.update_permission is not null then
      execute format('drop policy if exists %I on public.%I', r.table_name || '_permission_update', r.table_name);
      execute format(
        'create policy %I on public.%I as restrictive for update to authenticated using (public.has_org_permission(organization_id, %L)) with check (public.has_org_permission(organization_id, %L))',
        r.table_name || '_permission_update',
        r.table_name,
        r.update_permission,
        r.update_permission
      );
    end if;
  end loop;
end;
$$;

drop policy if exists fulfillments_permission_update on public.fulfillments;
create policy fulfillments_permission_update
on public.fulfillments
as restrictive
for update
to authenticated
using (
  public.has_org_permission(organization_id, 'warehouse.pick')
  or public.has_org_permission(organization_id, 'warehouse.pack')
)
with check (
  public.has_org_permission(organization_id, 'warehouse.pick')
  or public.has_org_permission(organization_id, 'warehouse.pack')
);

drop policy if exists fulfillment_events_permission_insert on public.fulfillment_events;
create policy fulfillment_events_permission_insert
on public.fulfillment_events
as restrictive
for insert
to authenticated
with check (
  public.has_org_permission(organization_id, 'warehouse.pick')
  or public.has_org_permission(organization_id, 'warehouse.pack')
);

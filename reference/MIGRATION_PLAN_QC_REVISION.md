# MIGRATION_PLAN_QC_REVISION.md

Project: ADORA Commerce OS (ACOS)

Warehouse QC introduces a dependency on `fulfillments` and `fulfillment_items`.

Therefore the safer migration ordering is:

```text
023_fulfillment_base.sql
024_warehouse_qc.sql
025_shipping.sql
026_returns.sql
027_notifications.sql
028_audit.sql
029_transaction_functions.sql
030_append_only_triggers.sql
031_updated_at_triggers.sql
032_rls_helpers.sql
033_rls_policies.sql
034_seed_data.sql
```

Reason:
`fulfillment_qc_sessions.fulfillment_id` and `fulfillment_qc_scans.fulfillment_item_id`
must reference fulfillment tables that already exist.

The previous 023–032 numbering is superseded by this ordering.

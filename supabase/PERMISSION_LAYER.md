# Permission Layer

Date: 2026-07-27

## Model

ADORA Commerce OS uses three access layers for browser/API roles:

1. Postgres grants decide whether `authenticated` can reach a table through the Data API.
2. Tenant RLS policies require active organization membership through `public.is_org_member(organization_id)`.
3. Permission-aware restrictive RLS policies require action permissions through `public.has_org_permission(organization_id, permission_code)`.

`anon` is not granted access to tenant domain tables.

## Permission-Aware Domain Coverage

Migration `20260726192643_permission_aware_domain_rls.sql` applies the first permission-aware layer to:

| Table | Select | Insert | Update |
|---|---|---|---|
| `public.customers` | `customer.view` | `customer.edit` | `customer.edit` |
| `public.purchase_sessions` | `order.view` | `order.create` | `order.edit` |
| `public.orders` | `order.view` | `order.create` | `order.edit` |
| `public.warehouses` | `inventory.view` | `inventory.adjust` | `inventory.adjust` |

Migration `20260726193333_product_inventory_permission_rls.sql` extends the same model to:

| Table | Select | Insert | Update |
|---|---|---|---|
| `public.products` | `product.view` | `product.create` | `product.edit` |
| `public.product_variants` | `product.view` | `product.create` | `product.edit` |
| `public.inventory_balances` | `inventory.view` | Not granted | Not granted |
| `public.inventory_movements` | `inventory.view` | `inventory.adjust` | Not granted |

Delete is not granted permanently in this pass. Deletions should stay server-side or receive separate explicit permissions after lifecycle rules are defined.

`public.product_variants.cost_price` and `public.product_variants.minimum_selling_price` are not granted to `authenticated` in this pass. Cost access should use a cost-safe view or server-side wrapper that checks `product.cost.view` and `product.cost.edit`.

Inventory balances are read-only to browser/API roles. Balance mutations should happen through transaction functions or server-side wrappers so stock changes stay auditable through `inventory_movements`.

Migration `20260726194356_inventory_transaction_wrappers.sql` exposes guarded inventory transaction wrappers:

| Wrapper | Low-level function | Required permission |
|---|---|---|
| `public.api_reserve_inventory` | `public.reserve_inventory` | `inventory.adjust` |
| `public.api_release_inventory_reservation` | `public.release_inventory_reservation` | `inventory.adjust` |
| `public.api_convert_reservation_to_allocation` | `public.convert_reservation_to_allocation` | `inventory.adjust` + `order.edit` |
| `public.api_post_inventory_movement` | `public.post_inventory_movement` | `inventory.adjust` |

The low-level functions remain unavailable to `authenticated`. The wrappers validate authentication, permissions, and object ownership before calling the privileged functions.

Migration `20260726195240_product_cost_wrappers.sql` exposes guarded product cost RPC functions:

| Wrapper | Purpose | Required permission |
|---|---|---|
| `public.api_get_product_variant_cost` | Read `cost_price` and `minimum_selling_price` | `product.cost.view` |
| `public.api_update_product_variant_cost` | Update `cost_price` and `minimum_selling_price` | `product.cost.edit` |

Direct column access to variant cost fields remains unavailable to `authenticated`. Cost access is separated from general `product.view` and `product.edit`.

Migration `20260726200055_operations_permission_rls.sql` extends permission-aware RLS to operations tables:

| Domain | Tables | Key permissions |
|---|---|---|
| Conversations | `conversations`, `messages`, `conversation_assignments`, `conversation_notes`, live read models | `conversation.view`, `conversation.reply`, `conversation.assign` |
| Payments | `payments`, `payment_transactions`, `payment_proofs`, `refunds`, `refund_transactions` | `payment.view`, `payment.verify`, `payment.refund` |
| Returns | `returns`, `return_items`, `return_status_history`, `return_inventory_dispositions`, `exchange_replacements` | `return.view`, `return.manage`, `return.inspect` |
| Fulfillment and shipping | `fulfillments`, `fulfillment_items`, fulfillment events, QC tables, shipments, packages, tracking events | `warehouse.pick`, `warehouse.pack`, `warehouse.qc`, `shipping.create` |

Refund processing, QC override, label creation, and external carrier calls should still move through guarded wrappers when business-state transitions are implemented.

Migration `20260726201809_guarded_operations_wrappers.sql` exposes guarded operations RPC functions for high-risk workflow transitions:

| Wrapper | Purpose | Required permission |
|---|---|---|
| `public.api_process_refund` | Create a refund and refund transaction after checking refundable amount | `payment.refund` |
| `public.api_override_qc_session` | Mark a failed or in-progress QC session as passed with an audit event | `warehouse.qc.override` |
| `public.api_create_shipment_label` | Attach carrier label/tracking data and move shipment to `LABEL_CREATED` | `shipping.print_label` |

Direct `authenticated` insert/update access is revoked from `refunds` and `refund_transactions`. Direct updates are revoked from `fulfillment_qc_sessions` and `shipments`. These actions now require the wrapper layer so the database can enforce ownership, permission, state, amount, and audit rules consistently.

Migration `20260726202729_shipping_workflow_wrappers.sql` completes the post-label shipping workflow:

| Wrapper | Purpose | Required permission |
|---|---|---|
| `public.api_complete_qc_session` | Complete a normal QC session based on item totals | `warehouse.qc` |
| `public.api_mark_shipment_ready_for_handoff` | Move a labeled shipment to `READY_FOR_HANDOFF` | `shipping.create` |
| `public.api_record_carrier_tracking_event` | Record carrier tracking events and update shipment/fulfillment status | `shipping.create` |

Direct `authenticated` inserts into `tracking_events` are revoked. Tracking events now move through the wrapper so carrier status transitions can validate terminal states and keep fulfillment audit events aligned.

Migration `20260726203930_carrier_webhook_boundary.sql` adds the database boundary for carrier webhooks:

| Object | Purpose |
|---|---|
| `public.carrier_webhook_events` | Stores idempotency keys, payload hashes, raw payloads, processing state, and linked tracking events |
| `public.api_record_carrier_tracking_event` service-role path | Allows the verified Edge Function to route carrier events into the same tracking workflow without a user session |

The `carrier-webhook` Edge Function is configured with `verify_jwt = false` because external carriers do not send Supabase JWTs. The function must verify the carrier HMAC signature before using the service role key. Configure one of:

```text
CARRIER_WEBHOOK_SECRETS={"flash":"...","kerry":"...","jandt":"...","thailand_post":"..."}
CARRIER_WEBHOOK_SECRET_<PROVIDER_CODE>=...
CARRIER_WEBHOOK_SECRET=...
```

Expected request headers:

```text
x-carrier-provider: flash
x-carrier-signature: sha256=<hmac_sha256_hex_body>
idempotency-key: <provider_event_id>
x-organization-id: <organization_id>    # optional if payload includes organization_id
```

Provider adapter fixtures live in `supabase/functions/carrier-webhook/fixtures`:

| Provider | Fixture | Canonical status |
|---|---|---|
| Flash | `flash-picked-up.json` | `IN_TRANSIT` |
| Kerry | `kerry-delivered.json` | `DELIVERED` |
| J&T | `jandt-exception.json` | `EXCEPTION` |
| Thailand Post | `thailand-post-returned.json` | `RTO` |

These fixtures are intentionally isolated from the database. They validate request shape and mapping behavior; replace or extend them with exact production payload contracts when each carrier account is connected.

## Policy Shape

The existing migration `033_rls_policies.sql` creates permissive tenant policies for every `organization_id` table. The permission layer adds restrictive policies, so access is effectively:

```text
active org membership AND required action permission
```

This keeps tenant isolation and action authorization independent and reviewable.

## Validation

- `005_auth_membership_rls_test.sql` validates Auth -> Profile -> Membership -> RLS.
- `006_domain_rls_crud_test.sql` validates tenant-scoped CRUD for permissioned users and cross-tenant denial.
- `007_permission_layer_test.sql` validates that active members without the required permission cannot perform or see unauthorized actions.
- `008_product_inventory_permission_rls_test.sql` validates product/variant and inventory balance/movement permission-aware RLS.
- `009_inventory_transaction_wrappers_test.sql` validates guarded inventory transaction wrappers and low-level function denial.
- `010_product_cost_wrappers_test.sql` validates guarded product cost read/update wrappers and direct cost column denial.
- `011_operations_permission_rls_test.sql` validates operations RLS across conversations, payments, returns, fulfillment, QC, and shipping.
- `012_role_matrix_validation.sql` validates owner, manager, warehouse, and support role behavior across representative domains.
- `013_guarded_operations_wrappers_test.sql` validates guarded refund processing, QC override, and shipment label wrappers.
- `014_shipping_workflow_wrappers_test.sql` validates normal QC completion, shipment handoff, and carrier tracking updates.
- `015_carrier_webhook_boundary_test.sql` validates carrier webhook idempotency storage and service-role routing into tracking updates.

## Next Expansion

Apply the same pattern to the remaining domains after confirming the intended permission code per action:

- Inventory transfer workflow: `inventory.transfer`.
- Reservation and allocation lifecycle policy for order fulfillment roles.
- Credit, loyalty, reports, notifications, and audit.
- Provider-specific payload adapters once real carrier contracts are available.
- Persisted seed roles for owner, manager, warehouse, and support after the final role matrix is approved.

Transaction-critical SECURITY DEFINER functions should remain unavailable to browser roles until wrapped by permission-checking server-side functions.

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

## Next Expansion

Apply the same pattern to the remaining domains after confirming the intended permission code per action:

- Product cost access: `product.cost.view`, `product.cost.edit`.
- Inventory transfer workflow: `inventory.transfer`.
- Conversations: `conversation.view`, `conversation.reply`, `conversation.assign`.
- Payments, credit, loyalty, returns, fulfillment, shipping, and audit.

Transaction-critical SECURITY DEFINER functions should remain unavailable to browser roles until wrapped by permission-checking server-side functions.

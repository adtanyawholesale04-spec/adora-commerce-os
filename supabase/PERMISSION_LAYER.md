# Permission Layer

Date: 2026-07-27

## Model

ADORA Commerce OS uses three access layers for browser/API roles:

1. Postgres grants decide whether `authenticated` can reach a table through the Data API.
2. Tenant RLS policies require active organization membership through `public.is_org_member(organization_id)`.
3. Permission-aware restrictive RLS policies require action permissions through `public.has_org_permission(organization_id, permission_code)`.

`anon` is not granted access to tenant domain tables.

## First-Pass Domain Coverage

Migration `20260726192643_permission_aware_domain_rls.sql` applies the first permission-aware layer to:

| Table | Select | Insert | Update |
|---|---|---|---|
| `public.customers` | `customer.view` | `customer.edit` | `customer.edit` |
| `public.purchase_sessions` | `order.view` | `order.create` | `order.edit` |
| `public.orders` | `order.view` | `order.create` | `order.edit` |
| `public.warehouses` | `inventory.view` | `inventory.adjust` | `inventory.adjust` |

Delete is not granted permanently in this pass. Deletions should stay server-side or receive separate explicit permissions after lifecycle rules are defined.

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

## Next Expansion

Apply the same pattern to the remaining domains after confirming the intended permission code per action:

- Products and variants: `product.view`, `product.create`, `product.edit`, cost-specific permissions.
- Inventory movements and balances: `inventory.view`, `inventory.adjust`, `inventory.transfer`.
- Conversations: `conversation.view`, `conversation.reply`, `conversation.assign`.
- Payments, credit, loyalty, returns, fulfillment, shipping, and audit.

Transaction-critical SECURITY DEFINER functions should remain unavailable to browser roles until wrapped by permission-checking server-side functions.

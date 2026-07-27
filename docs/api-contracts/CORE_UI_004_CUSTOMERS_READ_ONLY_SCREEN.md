# CORE-UI-004 Customers Read-Only Screen

**Project:** ADORA Commerce OS (ACOS)  
**Track:** A - Commerce Core  
**Phase:** A3 - Commerce Admin MVP  
**Task ID:** CORE-UI-004  
**Status:** IMPLEMENTED  
**Date:** 2026-07-27

---

## 1. Purpose

Add a read-only Admin Customers screen for tenant-scoped customer master inspection.

This task does not add schema, migrations, permissions, roles, or customer write behavior. Customer master remains the canonical `customers` table.

---

## 2. Source Documents

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `reference/BUSINESS_RULES_V13.md`
- `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md`
- `reference/SUPABASE_MIGRATION_V1_STATUS.md`
- `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md`

---

## 3. Read Contract

Primary read:

```text
customers
```

Selected fields:

```text
id
customer_code
first_name
last_name
display_name
phone
email
status
merged_into_customer_id
created_at
updated_at
```

Optional read, only when the active membership has `order.view`:

```text
orders
```

Selected order signal fields:

```text
id
customer_id
order_number
order_status
grand_total
created_at
```

The screen does not read `customer_commerce_metrics` yet because this task did not confirm a dedicated permission-aware read contract for that projection.

---

## 4. Authorization Boundary

Required for customer master read:

```text
Authentication
Active organization membership
customer.view
RLS tenant boundary by organization_id
```

Optional order signals require:

```text
order.view
```

The page derives organization context from the server-side Admin shell context and does not trust a browser-supplied `organization_id`.

---

## 5. UI States

The screen handles:

```text
missing_env
anonymous
missing_membership
permission_denied
query_error
ready empty
ready with rows
```

The UI supports the shared Admin visual system:

```text
light/dark theme
Thai/English copy
responsive desktop/mobile layout
```

---

## 6. Forbidden In This Screen

No direct UI action exists for:

```text
customer create/edit
profile/contact edit
customer merge
anonymize/delete
tag edits
address edits
order creation/editing
```

These require future server service contracts, audit behavior, and owner-approved privacy/merge workflows where applicable.

---

## 7. Snapshot Limits

```text
customers: 75 latest by updated_at
orders: 250 latest by created_at when order.view is granted
```

Related read contracts deferred:

```text
customer_identities
customer_addresses
customer_tags
customer_tag_links
customer_commerce_metrics
```

---

## 8. Validation

Expected validation:

```text
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
GET /admin/customers returns 200
```

Supabase-backed data reads require local/project Supabase env and authenticated membership. Without env, the page must render the missing environment state without querying the database.

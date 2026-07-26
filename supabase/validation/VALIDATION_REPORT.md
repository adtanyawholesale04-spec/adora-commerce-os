# Supabase Validation Report

Date: 2026-07-27

## Result

`npx.cmd supabase db reset` completed successfully against the local Supabase stack.

All migrations replayed:

```text
001_extensions_helpers.sql
...
034_seed_data.sql
```

## Baseline Checks

| Check | Result |
|---|---:|
| Public table count | 121 |
| Migration count | 34 |
| Permissions seeded | 44 |
| Features seeded | 14 |
| Plans seeded | 4 |
| Tenant tables without RLS | 0 |
| Append-only triggers | 4 |
| Public SECURITY DEFINER functions | 8 |

## Supabase Advisory

Supabase reported a critical RLS advisory:

```text
6 table(s) have Row Level Security disabled:
public.conversation_orders
public.membership_roles
public.organizations
public.plan_features
public.purchase_session_orders
public.role_permissions
```

Do not blindly enable RLS without policies; that can block required reads/writes. Review `003_proposed_rls_remediation.sql` before applying.

## Security Definer Functions

These public functions currently use default execute privileges:

```text
convert_reservation_to_allocation
current_profile_id
has_org_permission
is_org_member
next_document_number
post_inventory_movement
release_inventory_reservation
reserve_inventory
```

Recommended next step: restrict execute privileges for transaction/RPC functions and keep helper access limited to the roles that actually need them.

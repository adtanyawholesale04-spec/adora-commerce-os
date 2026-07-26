# Supabase Validation Report

Date: 2026-07-27

## Result

`npx.cmd supabase db reset` completed successfully against the local Supabase stack.

All migrations replayed:

```text
001_extensions_helpers.sql
...
034_seed_data.sql
20260726185117_035_security_rls_hardening.sql
20260726190748_authenticated_rls_table_grants.sql
```

## Baseline Checks

| Check | Result |
|---|---:|
| Public table count | 121 |
| Migration count | 36 |
| Permissions seeded | 44 |
| Features seeded | 14 |
| Plans seeded | 4 |
| Tenant tables without RLS | 0 |
| Public tables without RLS | 0 |
| Append-only triggers | 4 |
| Public SECURITY DEFINER functions | 8 |

## Supabase Advisory

The prior critical RLS advisory has been remediated by:

```text
20260726185117_035_security_rls_hardening.sql
```

Current validation shows `public_tables_without_rls = 0`.

## Security Definer Functions

These public functions are still SECURITY DEFINER by design:

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

Current privilege posture after migration `035`:

```text
current_profile_id                      postgres + authenticated
is_org_member                           postgres + authenticated
has_org_permission                      postgres + authenticated
next_document_number                    postgres only
reserve_inventory                       postgres only
release_inventory_reservation           postgres only
convert_reservation_to_allocation       postgres only
post_inventory_movement                 postgres only
```

The transaction-critical functions are intentionally unavailable to browser roles until server-side wrappers or internal permission checks are implemented.

## Security Definer Exposure Check

| Check | Result |
|---|---:|
| SECURITY DEFINER functions total | 8 |
| SECURITY DEFINER functions executable by public | 0 |
| SECURITY DEFINER functions executable by anon | 0 |
| Transaction functions executable by authenticated | 0 |
| Helper functions executable by authenticated | 3 |

The helper functions remain executable by `authenticated` because they are used by RLS policies and membership/permission resolution. Transaction-critical functions remain restricted to `postgres`.

## Auth Profile Membership RLS Test

`supabase/validation/005_auth_membership_rls_test.sql` passes against the local Supabase stack.

The test creates two temporary authenticated users, profiles, organizations, and memberships inside a transaction, then switches the JWT subject claim between the two users. It verifies:

- `current_profile_id()` resolves the active user's profile.
- `is_org_member()` returns true only for the user's own organization.
- `profiles`, `organization_memberships`, and `organizations` expose only the current user's tenant rows through RLS.

The test ends with `ROLLBACK`, so no fixture data is persisted.

Migration `20260726190748_authenticated_rls_table_grants.sql` grants `SELECT` on the three tested identity/membership tables to `authenticated` and keeps `anon` without those grants. Row visibility remains constrained by existing RLS policies.

## Domain RLS CRUD Test

`supabase/validation/006_domain_rls_crud_test.sql` passes against the local Supabase stack.

The test uses temporary transaction-scoped grants for `authenticated` on `customers`, `purchase_sessions`, `orders`, and `warehouses`, then rolls them back with the fixture data. It verifies:

- Tenant-scoped reads expose only the current user's organization rows.
- Same-tenant inserts are allowed by the generic tenant `WITH CHECK` policies.
- Cross-tenant inserts are rejected by RLS.
- Same-tenant updates/deletes can affect visible rows.
- Cross-tenant updates/deletes affect zero rows because the target rows are not visible through RLS.

These grants are intentionally validation-only. Permanent CRUD grants for domain tables should be added only after the application permission layer is narrowed beyond basic organization membership.

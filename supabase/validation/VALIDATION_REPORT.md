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
```

## Baseline Checks

| Check | Result |
|---|---:|
| Public table count | 121 |
| Migration count | 35 |
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

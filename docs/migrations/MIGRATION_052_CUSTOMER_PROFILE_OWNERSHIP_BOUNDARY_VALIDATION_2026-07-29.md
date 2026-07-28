# Migration 052 — Customer Profile Ownership Boundary Validation

**Migration:** `20260728193307_customer_profile_ownership_boundary.sql`  
**Task:** `PORTAL-P1-IDENTITY-OWNERSHIP-001`  
**Status:** VALIDATED / PORTAL READS STILL GATED

## Scope

Adds the tenant-scoped `customer_profile_links` association boundary. It does not create a customer master, does not change `customers`, and does not enable Customer Portal reads or link creation RPCs.

## Guardrails

- Composite customer and organization-membership foreign keys prevent cross-tenant association.
- One active link is allowed per customer and per profile within an organization.
- RLS is enabled.
- `anon` and `authenticated` receive no direct table access.
- Merge, link creation, revocation, and Portal reads remain separate guarded service contracts.

## Validation

`supabase/validation/036_customer_profile_ownership_boundary_test.sql` verifies:

- same-tenant active link insertion;
- cross-tenant profile rejection;
- duplicate active link rejection;
- authenticated direct read denial;
- authenticated direct insert denial.

Validation result: fresh local replay, focused ownership suite, security/RLS suite, full workflow suite, and Commerce integration regression all passed on 2026-07-29. Portal reads and link mutation remain gated by separate service contracts.

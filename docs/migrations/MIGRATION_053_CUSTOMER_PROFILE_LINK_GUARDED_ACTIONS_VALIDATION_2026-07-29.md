# Migration 053 — Customer Profile Link Guarded Actions Validation

**Migration:** `20260728193910_customer_profile_link_guarded_actions.sql`  
**Task:** `PORTAL-P1-IDENTITY-OWNERSHIP-002`  
**Status:** VALIDATION IMPLEMENTED / PORTAL READS STILL GATED

## Scope

Adds guarded request, server-only activation, and permission-guarded revoke functions for the validated `customer_profile_links` table. It does not enable Customer Portal reads, create a UI, or perform identity matching.

## Guardrails

- browser/authenticated callers can request `PENDING` and revoke with `customer.edit`;
- only `service_role` can activate after an external verification boundary;
- all paths require idempotency keys and append-only audit records;
- cross-tenant and inactive-customer/profile contexts are rejected;
- direct table writes remain denied.

## Validation

`supabase/validation/037_customer_profile_link_guarded_actions_test.sql` covers the lifecycle and denial paths. Fresh replay, security, workflow, and Commerce regression gates are required before marking this migration validated.

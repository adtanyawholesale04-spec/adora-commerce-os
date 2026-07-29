# Migration 059 Customer Portal CRM Contact Sync Validation

**Status:** VALIDATED
**Migration File:** `supabase/migrations/20260729123502_customer_portal_crm_contact_sync_boundary.sql`
**Date:** 2026-07-29

## Evidence

- Supabase local database fresh replay passed from migration `001` through the
  CRM contact sync migration.
- Focused suite:
  `supabase/validation/customer-portal-crm-contact-sync-boundary-suite.mjs`
- SQL fixture:
  `supabase/validation/043_customer_portal_crm_contact_sync_boundary_test.sql`

## Validated Cases

- empty email field fills raw and normalized values atomically;
- same normalized value returns idempotent success;
- repeated client request id reuses the audited result;
- existing different CRM value is not overwritten;
- duplicate value on another same-tenant customer is denied;
- `ARCHIVED`, `BLOCKED`, and `MERGED` customers are denied;
- non-`APPLIED` requests and inactive links are denied;
- cross-tenant lookup is denied;
- `anon` and `authenticated` execution is denied;
- `service_role` execute grant exists;
- audit JSON contains no raw email or phone;
- consent, suppression, and customer identity fixtures remain unchanged.

No historical migration was edited.

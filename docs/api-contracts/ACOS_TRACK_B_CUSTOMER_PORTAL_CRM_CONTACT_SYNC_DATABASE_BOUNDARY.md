# Track B Customer Portal CRM Contact Sync Database Boundary

**Task ID:** `PORTAL-P1-PART5-CRM-CONTACT-SYNC-PART2`
**Status:** IMPLEMENTED / VALIDATED
**Migration:** `20260729123502_customer_portal_crm_contact_sync_boundary.sql`

## Boundary

`api_sync_applied_customer_contact_to_crm` is the single atomic database
boundary authorized by the frozen Owner decision table. It is callable only by
`service_role`.

The function:

1. locks the tenant-scoped contact request;
2. requires request status `APPLIED`;
3. rechecks the active same-tenant profile/customer link and membership;
4. locks the canonical customer row;
5. permits only an `ACTIVE` customer;
6. blocks duplicate, conflicting and inactive customer cases;
7. fills only an empty raw/normalized contact pair;
8. returns idempotent success for a matching normalized value or repeated
   client request id;
9. appends sanitized audit evidence without raw contact values.

Controlled results:

```text
synced
already_matching
contact_request_not_applied
customer_link_not_active
customer_not_active
crm_contact_conflict
crm_duplicate_contact_conflict
```

## Security

- `PUBLIC`, `anon`, and `authenticated` execution is revoked.
- Organization and request identifiers are matched inside the function.
- Browser and staff direct writes are not introduced.
- Consent, suppression and customer identity records are not changed.
- The existing contact request lifecycle is not extended.
- No provider, message, order, payment or entitlement action occurs.

## Part 3 Gate

Part 3 may connect the existing server-only Auth Admin apply flow to this RPC.
It must preserve retryability, sanitize all errors, and never expose service
credentials to a browser.

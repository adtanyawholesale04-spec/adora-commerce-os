# Track B Customer Profile Link Guarded Actions

**Task:** `PORTAL-P1-IDENTITY-OWNERSHIP-002`  
**Status:** IMPLEMENTED / VALIDATION PENDING  
**Boundary:** server-only lifecycle for `customer_profile_links`

## Lifecycle

```text
authenticated owner with customer.edit
  -> api_request_customer_profile_link
  -> PENDING + audit
server-only verification boundary
  -> api_activate_customer_profile_link
  -> ACTIVE + audit
authenticated owner with customer.edit
  -> api_revoke_customer_profile_link
  -> REVOKED + audit
```

## Guards

- Request and revoke require authenticated `customer.edit` membership in the same organization.
- Request requires active customer and active target profile membership in that organization.
- Request creates only `PENDING`; it never activates a link from a browser request.
- Activation is callable only by `service_role` and requires a verification method plus idempotency key.
- Revoke is tenant-scoped and append-only audited; it does not delete history.
- All functions use controlled errors and no direct table writes are exposed to `anon` or `authenticated`.
- Portal reads remain disabled until a separate read-model implementation gate passes.

## Validation

Focused validation covers request, duplicate reuse, cross-tenant rejection, server-only activation, activation idempotency, authenticated activation denial, revoke, and audit-compatible state transitions.

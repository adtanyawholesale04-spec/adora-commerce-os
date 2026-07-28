# Track B Customer Portal Consent Guarded Action

**Status:** IMPLEMENTED / VALIDATED
**Migration:** `20260728203316_customer_portal_consent_guarded_action.sql`

## Contract

`api_update_customer_portal_consent` updates one customer-owned consent key for the current authenticated profile's active customer link. The client cannot submit a customer id as authority.

The boundary normalizes email/phone destinations, validates the frozen channel/purpose/status allowlists, locks the consent key for race safety, updates current state, appends an immutable consent event, and records an audit event. Retry with the same request id is idempotent.

The function never sends a message, creates a delivery job, consumes a usage meter, or bypasses provider dispatch checks. Dispatch must recheck consent and suppression and apply entitlement/cost rules separately.

Profile email/phone edits remain disabled in the first release until re-authentication and verified destination handling are separately approved and implemented.

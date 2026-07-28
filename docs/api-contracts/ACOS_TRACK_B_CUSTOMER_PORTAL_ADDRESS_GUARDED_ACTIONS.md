# Track B Customer Portal Address Guarded Actions

**Status:** IMPLEMENTED / VALIDATED
**Migration:** `20260728201851_customer_portal_address_guarded_actions.sql`

## Contract

The Portal may create, update, or archive only addresses belonging to the customer resolved from the current authenticated profile's active ownership link. The client cannot submit a customer id as authority.

Implemented RPCs:

- `api_create_customer_portal_address`
- `api_update_customer_portal_address`
- `api_archive_customer_portal_address`

All three require authenticated execution, active tenant membership, active customer link, tenant/address ownership, and optional idempotency request id. They record append-only audit events. Address archive is a status transition; no hard delete is exposed. Default-address changes use a transaction advisory lock so only one active default remains per customer/tenant. Historical order snapshots are not modified.

Profile contact, consent, coupon, loyalty, notification, payment, and fulfillment mutations are outside this contract.

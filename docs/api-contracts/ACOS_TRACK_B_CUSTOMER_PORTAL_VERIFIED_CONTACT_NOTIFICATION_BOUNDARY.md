# Track B Customer Portal Verified Contact and Notification Boundary

**Status:** IMPLEMENTED / VALIDATED / AUTH APPLY DEFERRED
**Migration:** `20260728204359_customer_portal_verified_contact_and_notification_mapping.sql`

## Verified Contact

`api_request_customer_contact_change` creates a 24-hour, tenant-scoped request from the current authenticated profile's active customer link. It normalizes email/phone, supports idempotent retry, allows only one active request per contact type, and stores the sensitive requested value in a service-role-only table.

`api_verify_customer_contact_change_request` is service-role-only. It moves a valid request to `VERIFIED`, records the verification method and audit event, and returns `auth_admin_apply_required=true`. It does not update `auth.users` or `customers` directly. The Auth Admin apply step remains a separate server boundary.

## Notification Mapping

`api_get_customer_portal_notifications` reuses the existing `notifications` and `notification_recipients` source tables, resolving the recipient through the active customer/profile ownership link. No duplicate notification source is created. The RPC is read-only and does not mark notifications read.

## Controls

All functions enforce authentication, active membership, active customer link, tenant scope, RLS/direct-table denial, and controlled grants. Notification reads and contact changes are audited. Provider dispatch, consent checks, suppression checks, and usage entitlement remain separate downstream controls.

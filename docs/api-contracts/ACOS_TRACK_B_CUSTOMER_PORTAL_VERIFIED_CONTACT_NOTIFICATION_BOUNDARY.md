# Track B Customer Portal Verified Contact and Notification Boundary

**Status:** IMPLEMENTED / VALIDATED / AUTH APPLY BOUNDARY IMPLEMENTED
**Migration:** `20260728204359_customer_portal_verified_contact_and_notification_mapping.sql`

## Verified Contact

`api_request_customer_contact_change` creates a 24-hour, tenant-scoped request from the current authenticated profile's active customer link. It normalizes email/phone, supports idempotent retry, allows only one active request per contact type, and stores the sensitive requested value in a service-role-only table.

`api_verify_customer_contact_change_request` is service-role-only. It moves a valid request to `VERIFIED`, records the verification method and audit event, and returns `auth_admin_apply_required=true`. It does not update `auth.users` or `customers` directly. The separate server-only Auth Admin boundary now applies the verified value to the linked `auth.users` record and closes the request as `APPLIED`.

`applyVerifiedCustomerContactChange` reads the service-role-only request, confirms the linked `profiles.auth_user_id`, calls `auth.admin.updateUserById` with the verified contact and confirmation flag, then calls `api_apply_customer_contact_change`. If Auth Admin fails, the boundary records a sanitized failure audit and leaves the request retryable. If Auth Admin already has the verified value, it skips the provider update and only completes the database transition.

## Notification Mapping

`api_get_customer_portal_notifications` reuses the existing `notifications` and `notification_recipients` source tables, resolving the recipient through the active customer/profile ownership link. No duplicate notification source is created. The RPC is read-only and does not mark notifications read.

## Controls

All functions enforce authentication, active membership, active customer link, tenant scope, RLS/direct-table denial, and controlled grants. Notification reads and contact changes are audited. Provider dispatch, CRM/customer master synchronization, consent checks, suppression checks, and usage entitlement remain separate downstream controls. The Auth Admin apply boundary does not update `customers` and does not send notification messages.

# Track B Customer Portal Notification Inbox UI

**Status:** IMPLEMENTED / VALIDATED
**Task:** `PORTAL-005`

## Scope

The authenticated `/portal` page displays an ownership-scoped notification
inbox from `api_get_customer_portal_notifications`. The read adapter executes
on the server with the active organization context and fetches the Portal
snapshot and notification payload concurrently.

The UI supports Thai and English copy, light and dark themes, unread indicators,
notification type, body, localized timestamp, empty state and an isolated error
state. A notification read failure does not hide the rest of the Portal.

## Guardrails

- Reuses canonical `notifications` and `notification_recipients`.
- No browser-side Supabase query.
- No client-supplied customer, profile or organization authority.
- No service-role key in the Portal read path.
- No mark-as-read mutation.
- No message dispatch, consent mutation, entitlement consumption or provider call.
- Existing active membership, ownership link, tenant scope and audit behavior
  remain authoritative.

Mark-as-read requires a separately approved guarded write contract with
idempotency and audit validation.

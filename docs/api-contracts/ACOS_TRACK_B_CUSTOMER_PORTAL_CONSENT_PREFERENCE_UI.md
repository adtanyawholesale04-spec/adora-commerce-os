# Track B Customer Portal Consent Preference UI

**Status:** IMPLEMENTED / VALIDATED
**Task:** `CONSENT-006`

## Scope

The authenticated `/portal` page renders ownership-scoped consent records from
the existing Customer Portal snapshot. A customer can grant or revoke an
existing channel/purpose/destination key through a bilingual switch control.

The client submits only to `updatePortalConsentAction`. The server action
validates the frozen channel, purpose and status allowlists, resolves the active
organization from the authenticated server context, and calls the validated
`api_update_customer_portal_consent` RPC with a server-generated request id.

## Guardrails

- No browser-side Supabase write.
- No client-supplied customer or organization authority.
- No new customer, consent, notification or messaging source.
- No message dispatch or usage reservation.
- Existing ownership, tenant, append-only consent event and audit boundaries
  remain authoritative.
- Email and phone destinations are required and masked in the UI.
- RPC failures return controlled UI feedback without exposing database details.

Notification inbox integration remains a separate Portal task.

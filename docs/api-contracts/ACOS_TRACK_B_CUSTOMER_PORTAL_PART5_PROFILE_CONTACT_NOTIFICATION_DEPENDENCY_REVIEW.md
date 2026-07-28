# Track B Customer Portal Part 5 Profile Contact and Notification Dependency Review

**Part:** `PORTAL-P1-PART5`
**Status:** BOUNDARY IMPLEMENTED / AUTH APPLY DEFERRED
**Primary scope:** verified profile contact change policy and customer notification recipient dependency

## Current Source Finding

The frozen schema has two different contact surfaces:

- `auth.users.email` and `auth.users.phone` are authentication identity fields;
- `public.customers.email` and `public.customers.phone` are tenant customer-master fields;
- `public.profiles` stores `auth_user_id` and `display_name`, but no email or phone;
- `customer_profile_links` is the approved ownership association.

These fields cannot be updated together by inference. The Part 5 boundary now records and service-verifies a contact-change request, but the final Auth Admin apply and CRM synchronization remain separate decisions.

## Safest Part 5 Policy

1. Do not expose direct email/phone edit in the Portal.
2. Do not call Auth Admin from the browser or from a customer RPC.
3. Do not update `customers.email/phone` merely because an Auth email/phone changed.
4. Require re-authentication and verified destination proof before any contact change.
5. Persist a contact-change request only after Owner approves the request source, status lifecycle, expiry, and audit payload.
6. Recheck consent and suppression before any future message uses the new destination.

## Decision Required Before Implementation

| Decision | Recommended safe value | Status |
|---|---|---|
| Login email authority | `auth.users.email` | Recommended, not yet implemented |
| Login phone authority | `auth.users.phone` only when Auth phone verification is enabled | Recommended, not yet implemented |
| CRM customer contact | `customers.email/phone` remains tenant master and is not auto-synced | Recommended, not yet implemented |
| Change flow | Server-only request, re-authentication, destination verification, Owner/support resolution | Decision required |
| Request expiry | 24 hours | Decision required |
| Pending request behavior | One active request per profile/contact type; newest request replaces only after audit | Decision required |
| Notification recipient mapping | Add an explicit customer recipient relation or a verified customer-to-profile resolution; do not infer from notification text/reference_id | Decision required |

## Notification Dependency

The current `notifications` model targets `notification_recipients.profile_id`, while the Customer Portal is scoped by customer ownership. Part 5 now resolves this read path only through an active customer/profile ownership link. A profile recipient is not treated as a customer recipient without that link. Mark-read mutation remains separate.

## Phase Mapping and Priority

- Phase 1 Customer Portal MVP: contact settings and notification preference UI remain gated.
- Phase 1B Platform-Led Signup Readiness: verified Auth destination flow is the natural dependency.
- Phase 10 Advanced Notification & Automation: provider dispatch and message preference effects remain downstream.
- Current priority: P1 contract decision, then guarded implementation; no migration starts before the decision table is frozen.

## Validation Required After Approval

- re-authentication and verified email/phone proof;
- no cross-tenant customer update;
- no Auth Admin exposure to browser;
- idempotent request/retry and expiry;
- append-only audit and request history;
- notification recipient isolation;
- consent/suppression recheck before dispatch;
- no rewrite of order/payment/fulfillment history.

The request/verification boundary and notification read mapping are implemented in Migration 057. No Auth Admin apply call, CRM contact synchronization, notification mark-read mutation, or provider dispatch is created by this review.

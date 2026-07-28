# Track B Customer Portal Part 1 Owner Decision Table

**Part:** `PORTAL-P1-PART1`
**Status:** READY FOR OWNER DECISION
**Scope:** Profile contact, delivery address, and consent policy only

This part defines policy decisions. It does not create migrations, RPCs, UI write controls, or provider calls.

## Recommended Safe Defaults

| Decision | Recommended value | Why | Required control |
|---|---|---|---|
| Profile email edit | Disabled in first release; support/verified-auth flow only | Prevents account takeover and identity ambiguity | Re-authentication, verified destination, append-only audit |
| Profile phone edit | Disabled in first release; support/verified-auth flow only | Phone can be a messaging destination and identity signal | Re-authentication, OTP/provider verification, consent recheck |
| Address create | Allow adding a new active address | Lowers fulfillment friction without rewriting history | Active customer link, tenant scope, audit, idempotency |
| Address update | Allow update of current active address only | Keeps ownership simple | Customer ownership, default uniqueness, audit |
| Address delete | Archive only; no hard delete | Preserves operational traceability | Audit, no effect on historical order snapshots |
| Default address | At most one active default per customer/tenant | Prevents ambiguous fulfillment destination | Transaction-safe uniqueness and validation |
| Consent update | Allow explicit per channel and purpose | Matches frozen consent model | Append-only consent event, timestamps, suppression handling |
| Consent status | `GRANTED`, `REVOKED`, or `UNKNOWN`; no implicit grant | Protects privacy and messaging compliance | Purpose/channel allowlist, idempotency, audit |
| Consent dispatch effect | No direct send from consent mutation; dispatch rechecks consent/suppression | Prevents accidental SMS/LINE/email cost | Provider boundary and entitlement check remain separate |
| Customer identity | Never merge or re-identify automatically | Preserves approved conservative identity policy | Active ownership link only; manual same-org merge contract |

## Explicit Non-Approval

The following remain out of Part 1:

- payment, refund, wallet, payout, or loyalty mutations;
- coupon redemption;
- notification mark-read until customer recipient mapping exists;
- direct edits to order, payment, fulfillment, or historical consent events;
- automatic identity merge or cross-organization matching;
- provider calls from the Portal.

## Owner Response Format

Approve all recommended values, or identify a row to change by decision name. Implementation starts only after the table is frozen and recorded in `ACOS_IMPLEMENTATION_STATUS.md`.

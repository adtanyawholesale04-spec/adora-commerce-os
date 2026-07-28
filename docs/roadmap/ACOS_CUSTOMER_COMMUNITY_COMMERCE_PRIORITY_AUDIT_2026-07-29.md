# Customer Community Commerce Priority Audit

**Date:** 2026-07-29  
**Source of truth:** `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`  
**Scope:** Customer Community Commerce / Track B execution ordering

## Decision Summary

Track A gates A1 and A2 are validated. Track B schema and forward migrations through the current messaging delivery-attempt boundary are locally validated, but feature implementation must remain controlled because the status document contains an unresolved B1 gate conflict:

- the overall status says Business Rules V1 is frozen;
- the B1 gate still says `IN_REVIEW` and `BLOCKED UNTIL APPROVED`.

Under the ACOS execution rules, this is a blocker until the Project Owner reconciles the status. No Content, Portal, Feed, Review, Attribution, Commission, Payout, Ads, or real provider runtime is started by this audit.

## Priority Map

### P0 — Foundation / Blocker

| Work | Phase | Why P0 | Dependencies | Likely files/modules | Migration | Controls | Validation |
|---|---|---|---|---|---|---|---|
| Reconcile Track B business-rule gate | Phase 0 | B1 is internally inconsistent; downstream implementation cannot safely rely on an approved rule set | Owner confirmation of B1 status and scope; no inferred approval | `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`, `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`, `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md` | No | Audit required; consent, entitlement, moderation, and event implications must be confirmed | Document conflict, owner decision, then status reconciliation; no SQL change |
| Complete Phase 0 foundation decision record | Phase 0 | Source-of-truth, public/private boundary, event catalog, entitlement, moderation, media provider, and identity-merge direction gate all later phases | B1 reconciliation; media provider and commercial decisions remain open | Track B contract docs, status, business rules, ER, existing `src/lib/messaging/*` | No for decision record | Audit required; consent and entitlement required as decisions; ledger required only for value movement | Checklist review, contradiction scan, tenant/RLS threat review |
| Preserve provider-safe messaging boundary | Phase 0 / Phase 10 prerequisite | Reservation and delivery-attempt persistence exist, but real provider execution can create SMS/LINE/Email cost and private-data exposure | Selected provider, server-only secrets, queue runtime, retry/dead-letter policy, spend guardrail | `src/lib/messaging/*`, migration 050/051, provider adapter contracts, Edge/server boundary | No additional migration proposed in this audit | Consent, suppression, usage meter, entitlement, audit required; no refund of attempted spend | Fixture worker tests, idempotency, failure classification, secret-boundary review |

### P1 — Next after P0 is reconciled

| Work | Phase | Why P1 | Dependencies | Likely files/modules | Migration | Controls | Validation |
|---|---|---|---|---|---|---|---|
| Customer Portal MVP contract and read-only slice | Phase 1 | First customer-facing value and establishes private identity boundary before community | Auth/customer identity contract, customer read contract, store membership mapping, consent center, private/public separation | Customer auth/profile services, portal routes, existing Commerce Core customer/order read modules | Maybe; only after contract review, forward-only | Tenant/RLS/permission and audit required; consent required for preferences; entitlement recommended | Auth ownership, multi-store isolation, no-membership isolation, private-data leakage, read-model correctness |
| Storefront MVP contract | Phase 1C | Conversion center required before verified review and attribution | Product/service visibility contract, tenant/public storefront policy, entitlement, media strategy | Storefront routes/read model, product/variant reads, promotion visibility | Maybe; stop for protected core/payment-impacting migration | Tenant boundary, entitlement, audit/events; consent only for marketing actions | Public visibility, tenant isolation, unavailable CTA behavior, source-of-truth reuse |
| Content Foundation and consent-safe authoring | Phase 0/Phase 3 prerequisite | Enables later feed/review work, but current status marks Content tasks BLOCKED | Reconciled B1, approved lifecycle/visibility rules, RLS review, media decision | `src` content services/routes, content contracts, migration 035/038 boundaries | Maybe; do not modify frozen migrations | Audit, moderation, public/private separation, entitlement; consent for marketing reuse | Draft lifecycle, tenant isolation, public visibility, moderation/report path |

### P2 — After core and trust layer

| Work | Phase | Why P2 | Dependencies | Migration | Controls | Validation |
|---|---|---|---|---|---|---|
| Follow/Interest and Customer Feed MVP | Phases 3 and 4 prerequisite | Useful engagement surface, but depends on content, identity, visibility, and ranking rules | B1 reconciliation, Content, customer identity, feed rules, rate limits | Likely forward-only if contract gaps remain | RLS, public/private separation, moderation, event tracking, entitlement | Cursor pagination, visibility, tenant isolation, rate limit, event correctness |
| Verified Review MVP | Phase 2 | Trust layer before attribution/commission | Portal, storefront/order read contract, verified purchase/booking rules, moderation | Likely forward-only | Verified source evidence, audit, moderation, public/private separation, entitlement | Only real purchase/booking earns badge; target status and CTA tests; fraud/self-review checks |
| Buy From Review and Attribution V1 | Phase 4 | Connects content to conversion but must not create financial side effects yet | Storefront/checkout, event contract, attribution window decision, order/payment read contract | Maybe; no order/payment history rewrite | Attribution events, audit, tenant boundary, privacy; ledger not yet for commission | Idempotency, window behavior, self-purchase guard, no private customer exposure |
| Retention/Audience/Campaign read and preparation surfaces | Phases 0/7/10 | Existing persistence boundaries are validated, but operational workflows remain gated | Approved rules, service read models, consent and quota policies | Only contract-approved forward migration | Consent, entitlement, usage meter, audit/event | Snapshot immutability, audience isolation, quota and cost estimation |

### P3 — Defer until trust and commercial controls are ready

| Work | Phase | Why deferred | Hard dependencies / stop conditions |
|---|---|---|---|
| Commission Ledger + Wallet Hold | Phase 5 | Financial value movement requires a complete trust and reversal model | Verified conversion, fraud rules, refund/cancel reversal, ledger contract, owner approval |
| Payout and creator controls | Phase 6 | Real-money payout and private financial data | Tax/KYC/payout provider policy, fraud review, ledger, owner approval; stop before implementation |
| Store campaign marketplace and growth rewards | Phases 7-8 | Creates incentive and cost exposure | Consent, usage/quota, fraud, reward grant/expiry/redemption/reversal ledger |
| Promoted content / internal ads | Phase 9 | Paid monetization and ranking/policy risk | Ads policy, billing/cost model, moderation, spend guardrails, owner approval; stop before implementation |
| Real LINE/SMS/Email provider runtime and advanced automation | Phase 10 | Provider cost and private message delivery | Selected provider, server-only secret boundary, consent/suppression, quota/meter, retry/dead-letter, kill switch, monitoring; owner confirmation required |
| Network intelligence / cross-tenant analytics | Phase 11 | Highest privacy and aggregation risk | Anonymization/aggregation policy, tenant-safe analytics, privacy review, owner approval |

## Current Readiness

**Ready to start now:**

- this non-destructive priority/dependency audit;
- status contradiction report and owner decision request;
- contract/checklist refinement that does not alter schema, protected core, provider execution, payment, payout, ads, or private customer data;
- validation-only work against existing boundaries.

**Not ready / blocked:**

- Content implementation, because B1 is still `IN_REVIEW` in the authoritative status table;
- Customer Portal, because the customer identity/read contract and private-data boundary are not marked implemented;
- Feed, Review, Attribution, Commission, and Payout, because their upstream phases are not reconciled or complete;
- real provider runtime, because provider selection, secrets, cost/spend guardrails, and production worker operation are not approved;
- media upload production path, because the storage provider remains `IN_REVIEW`;
- commercial quota/plan work, because the commercial model remains unresolved.

## Uncommitted Work Observed

At audit time, the repo is on `main`, aligned with `origin/main` at `bfd8e94`, with uncommitted messaging validation/provider-boundary changes and the two Customer Community Commerce instruction documents untracked. This audit does not stage, commit, push, or alter those unrelated pending changes.

## Next Gate

Project Owner should reconcile the B1 contradiction first. After that, the next implementation candidate should be selected from the approved Phase 0/P1 contract work. Any choice involving payment, payout, ads, real provider cost, or private customer data requires a separate explicit approval before implementation.

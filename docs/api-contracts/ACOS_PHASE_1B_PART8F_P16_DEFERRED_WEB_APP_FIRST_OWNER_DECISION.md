# Phase 1B Part 8F P16 Deferred Web-App-First Owner Decision

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P16-DEFER`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / P16 PRODUCTION BLOCKER DEFERRED / WEB APP FIRST
**Runtime:** Production signup disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Owner Decision

The Owner approves continuing Web app, UI/UX and read-only workflow development
before purchasing a managed backup plan or completing the remaining P16
Auth/Storage restore proof.

This is an execution-order decision. It does not close, waive or weaken P16.

## Approved Development Scope

Development may continue with:

1. Phase 1C Storefront visibility and read-model contract review;
2. a read-only Storefront MVP using the canonical organization, product,
   variant, inventory and promotion sources;
3. responsive Thai/English and light/dark UI/UX;
4. local and controlled preview validation;
5. synthetic or explicitly approved non-private test data;
6. accessibility, navigation, loading, empty, error and permission-aware states;
7. automated lint, typecheck, test, build and browser QA.

No duplicate customer, product, order or payment source may be created.
Tenant, RLS, permission, consent, entitlement and audit boundaries remain
mandatory.

## Boundaries That Remain Closed

```text
public platform signup: DISABLED
production signup email: DISABLED
P15 smoke-test email: BLOCKED
real customer onboarding: NOT AUTHORIZED
real checkout/payment: NOT AUTHORIZED
real private customer data in preview/local: FORBIDDEN
production restore: NOT AUTHORIZED
P16 full recovery claim: FORBIDDEN
```

`ACOS_PLATFORM_SIGNUP_ENABLED` must remain false and
`ACOS_PLATFORM_SIGNUP_KILL_SWITCH` must remain true in Production.

## P16 Return Gate

P16 must resume before any public launch, real customer onboarding, production
email, real order/payment capture or other workflow that creates material
production data.

The return gate requires:

1. an approved managed backup plan or equivalent recurring encrypted backup;
2. a compatible managed Auth recovery proof;
3. a Storage metadata and object recovery proof;
4. an approved recovery-point and recovery-time objective;
5. a successful non-production restore drill with cleanup evidence; and
6. final P15 rollout approval after every recovery blocker closes.

## Next Ordered Work

```text
NEXT PHASE: PHASE 1C STOREFRONT MVP
NEXT SUBSTEP: STOREFRONT VISIBILITY / READ MODEL CONTRACT REVIEW
IMPLEMENTATION MODE: LOCAL AND CONTROLLED PREVIEW
MUTATION POSTURE: READ ONLY
```

The first Storefront step must inspect the existing canonical sources and
freeze visibility rules before UI implementation or migration design.

## Decision

`OWNER APPROVED / P16 PRODUCTION BLOCKER DEFERRED / WEB APP FIRST`

Web app development may continue. Production activation remains fail-closed
until P16 is resumed and completed.


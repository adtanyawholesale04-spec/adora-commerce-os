# Phase 1C Storefront Part 2 Owner Freeze

**Task ID:** `PHASE-1C-STOREFRONT-PART2-OWNER-FREEZE`
**Approval Date:** 2026-07-31
**Status:** OWNER APPROVED / BUSINESS RULES AND ER FROZEN
**Migration:** Not authorized
**Runtime:** Not authorized
**Approved Provider Spend:** USD 0

## Owner Approval

The Owner approves in full:

1. `BUSINESS_RULES_PHASE_1C_STOREFRONT_MVP.md`;
2. rules SF-BR-001 through SF-BR-036;
3. `ER_ADDENDUM_PHASE_1C_STOREFRONT_MVP.md`; and
4. the additive migration direction described by those documents.

This approval completes Phase 1C Part 2 and makes Part 3 migration and guarded
read-boundary design ready to begin. It does not itself authorize migration
generation, local database application, production migration or public
runtime activation.

## Frozen Contract

The following values are frozen:

| Boundary | Frozen value |
|---|---|
| MVP scope | Product-only and read-only |
| Canonical store identity | `organizations.slug` |
| Canonical routes | `/store/[organizationSlug]` and `/store/[organizationSlug]/products/[productHandle]` |
| Storefront lifecycle | `PRIVATE`, `PUBLISHED`; default `PRIVATE` |
| Product visibility | Explicit listing row; `HIDDEN`, `VISIBLE`; no row means hidden |
| Availability | Derived `IN_STOCK` or `SOLD_OUT` only |
| Product page bound | 24 products maximum |
| Variant page bound | 50 variants maximum |
| Feature | `storefront`, `BOOLEAN`, default deny |
| Permissions | `storefront.view`, `storefront.manage`, `storefront.publish` |
| Public read | Server application service to service-role-only `SECURITY INVOKER` RPC |
| Browser database access | No direct Core-table or Storefront-table access |
| Public product media | Controlled placeholder only |
| Visual baseline | Current blue tokens, Noto Sans Thai, Thai/English and light/dark |
| Production | Remains blocked by P16 |

## Frozen Additive Entities

```text
organization_storefronts
storefront_product_listings
storefront_slug_history
```

No frozen Core table is replaced. No customer, product, order, payment,
service or booking master is added.

## Frozen Audit Actions

```text
STOREFRONT_SETTINGS_UPDATED
STOREFRONT_PRODUCT_LISTING_UPDATED
STOREFRONT_PUBLISHED
STOREFRONT_UNPUBLISHED
ORGANIZATION_SLUG_UPDATED
```

The existing append-only `audit_logs` source remains authoritative. No new
ledger or duplicate event source is approved.

## Part 3 Authorization Boundary

Part 3 is ready to design and generate one or more forward-only additive
migrations for the frozen contract. Before applying any migration, Part 3
must:

1. inspect the latest migration history and allocate filenames through the
   Supabase CLI;
2. preserve every frozen migration;
3. implement tenant-safe composite foreign keys and constraints;
4. enable RLS and deny direct roles;
5. seed the frozen feature and permissions without plan or pricing changes;
6. implement guarded, permission-aware and audited mutations;
7. implement service-role-only field-bounded read RPCs;
8. prove slug, publication, entitlement and product visibility fail closed;
9. prove protected fields cannot leak; and
10. pass fresh local replay, focused security tests and repository gates.

Production application remains separately gated and is not authorized by this
freeze.

## Boundaries That Remain Closed

```text
migration generation/application: REQUIRES EXPLICIT PART 3 INSTRUCTION
public Storefront runtime: NOT AUTHORIZED
production migration: NOT AUTHORIZED
public platform signup: DISABLED
join/follow mutation: NOT AUTHORIZED
checkout/payment: NOT AUTHORIZED
production activation: BLOCKED BY P16
```

`ACOS_PLATFORM_SIGNUP_ENABLED` remains false and
`ACOS_PLATFORM_SIGNUP_KILL_SWITCH` remains true in Production.

## Decision

`OWNER APPROVED / PART 2 COMPLETE / PART 3 READY`

# Phase 1D Part 3D Coupon Evaluation Subcontract Review

**Task ID:** `PHASE-1D-CHECKOUT-PART3D-COUPON`
**Review Date:** 2026-08-01
**Status:** OWNER FROZEN / CP01-CP30 APPROVED / LOCAL PREFLIGHT VALIDATED / MIGRATION AUTHORIZATION REQUIRED
**Depends On:** Owner-frozen CO-BR-001 to CO-BR-044, PE01-PE24 and AC01-AC30
**Migration:** Not created
**Local Apply:** Not authorized
**Production Apply:** Not authorized / blocked by P16
**Provider Spend:** USD 0

## Objective

Freeze the one-coupon MVP semantics required by AC12-AC14 and AC19-AC21
before generating protected checkout SQL. The subcontract reuses `coupons`,
`coupon_redemptions`, `promotion_campaign_versions`, the canonical promotion
graph and immutable order benefit evidence. It creates no coupon, campaign,
cart, order or payment master.

This review creates no function, migration, index, constraint, redemption,
order, payment, provider configuration or Production change.

## Repository Findings

1. `coupons.code` is unique only by case-sensitive `(organization_id, code)`;
   normalized duplicates are possible and must be preflighted before DDL.
2. `coupons.campaign_version_id` is nullable. Checkout cannot calculate a
   benefit safely unless a coupon resolves one exact executable version.
3. A coupon-linked version can currently also be selected by the automatic
   `CART` evaluator. That permits a coupon benefit without a submitted code
   unless Layer 2 explicitly excludes every coupon-linked version.
4. `coupon_redemptions` already carries `RESERVED`, `CONSUMED`, `RELEASED` and
   `REVERSED`; no new redemption ledger or lifecycle status is needed.
5. Coupon and campaign global/per-customer limits exist, but reserved uses must
   count against both limits under a deterministic row lock to prevent races.
6. `promotion_applied_benefits.order_item_id` is nullable and can preserve one
   immutable order-level coupon benefit without adding a snapshot table.
7. `orders.order_discount_total` is the canonical coupon aggregate. Shipping
   discount, reward, bundle, tax and provider behavior are not required by the
   frozen first MVP.

## Owner Decision Freeze

On 2026-08-01, the Project Owner approved the recommended values for CP01-CP30
in full. These values are frozen as the Phase 1D coupon evaluation subcontract.
This approval authorizes the non-destructive coupon preflight as the next step
only. It does not authorize migration generation, local/Production apply,
protected checkout SQL, payment/provider work or public activation.

## Frozen Owner Decision Table

| ID | Contract item | Recommended safe value |
|---|---|---|
| CP01 | MVP scope | Accept zero or one coupon per checkout; coupon benefit is order-level only; item-specific coupon, shipping discount, reward, bundle, loyalty and provider coupons are deferred |
| CP02 | Input normalization | Normalize browser input with `upper(btrim(p_coupon_code))`; null/blank means no coupon; reject values over 100 characters or containing control characters; never persist input text outside the canonical coupon row |
| CP03 | Lookup identity | Resolve exactly one same-tenant coupon by normalized code; zero matches returns `COUPON_INVALID`; multiple normalized matches are unsafe data and return `COUPON_CONFIGURATION_UNSUPPORTED` |
| CP04 | Coupon eligibility | Require `status = ACTIVE`, `starts_at` null/past and `ends_at` null/future at the one captured checkout timestamp |
| CP05 | Customer restriction | Accept `coupons.customer_id` only when null or equal to the resolved active canonical customer; mismatch returns the same non-disclosing unavailable result |
| CP06 | Campaign link | Require non-null `campaign_version_id` and an exact same-tenant campaign/version graph; standalone code-only coupons are unsupported for checkout |
| CP07 | Campaign eligibility | Require campaign `status = ACTIVE`, `scope = ORDER`, currency null or `THB`, and non-empty normalized exclusivity values when present |
| CP08 | Version eligibility | Require the referenced version itself to be `ACTIVE` and effective at the captured timestamp; checkout never searches for or substitutes another version |
| CP09 | Automatic/coupon separation | Any campaign version referenced by any coupon is coupon-triggered and must be excluded by the Layer 2 automatic evaluator regardless of coupon status; one version cannot execute through both paths |
| CP10 | Condition/child allowlist | Require no condition groups/conditions, target scopes, price mappings, tiers, bundles, bundle components or reward rules on the coupon version |
| CP11 | Rule allowlist | Require exactly one rule with `rule_type = MIN_SPEND`, `scope_type = ORDER`, null quantity/repeat fields, null/empty JSON, optional non-negative two-decimal `min_spend`, and optional `max_spend >= min_spend` |
| CP12 | Action allowlist | Require exactly one same-version action linked to the rule; support only `PERCENT_DISCOUNT` and `FIXED_DISCOUNT`; disallow action children and `max_discount_amount` in the first MVP |
| CP13 | Percent schema | `PERCENT_DISCOUNT.value_json` contains exactly `{"percent": number}` greater than 0 and at most 100 with at most four decimal places |
| CP14 | Fixed schema | `FIXED_DISCOUNT.value_json` contains exactly `{"amount": number}` greater than 0 with at most two decimal places |
| CP15 | Eligible base | Use the sum of recomputed cart-item `line_total` values after PE01-PE24 automatic item benefits and before shipping, tax or coupon; evaluate inclusive minimum/maximum spend against this rounded THB base |
| CP16 | Arithmetic | Percent benefit is the eligible base times percent divided by 100 rounded half-up to two decimals; fixed benefit is the lesser of configured amount and eligible base; benefit must be positive and cannot exceed the base |
| CP17 | Minimum selling price | Compute aggregate remaining floor headroom from canonical variant minimum selling prices; a coupon benefit above headroom returns `PROMOTION_PRICE_FLOOR_VIOLATION` rather than silently changing the advertised benefit |
| CP18 | Automatic stacking | Allow stacking after automatic benefits only when the coupon campaign and action are stackable and their effective exclusive group does not conflict with any applied automatic action group; otherwise return `COUPON_UNAVAILABLE` |
| CP19 | Usage configuration | Coupon and campaign usage limits are independent; each non-null global/per-customer limit must be a positive integer; malformed limits return `COUPON_CONFIGURATION_UNSUPPORTED` |
| CP20 | Usage counting | Count `RESERVED` and `CONSUMED` redemptions against coupon limits; count the same statuses across all coupons linked to the campaign against campaign limits; exclude `RELEASED` and `REVERSED` |
| CP21 | Lock order | Under the AC01-AC30 checkout transaction, lock campaign, referenced version, coupon and matching active redemption rows in stable UUID order after promotion source locks and before creating the redemption |
| CP22 | Reservation | On success create exactly one `coupon_redemptions` row in `RESERVED`, linked to organization, coupon, customer, cart and order with `reserved_at` set to the captured timestamp |
| CP23 | Active-use constraints | After a clean preflight, add forward-only normalized coupon uniqueness plus at-most-one `RESERVED`/`CONSUMED` redemption per cart and per order; retain all terminal history |
| CP24 | Benefit evidence | Create one order-level `promotion_applied_benefits` row with null `order_item_id`, canonical campaign/version/rule/action IDs, benefit type and bounded snapshot; never include coupon code or customer/contact data |
| CP25 | Totals | Set `orders.order_discount_total` to the coupon benefit; set cart `discount_total` to item plus coupon benefits for converted evidence; recompute `grand_total` and `amount_due` using CO-BR-013/014 with zero shipping discount and tax |
| CP26 | Consume transition | Payment/manual confirmation changes the matching redemption `RESERVED -> CONSUMED` and sets `consumed_at` in the same transaction as order confirmation and inventory allocation |
| CP27 | Release/reversal | Checkout expiry or approved compensation changes `RESERVED -> RELEASED` once and sets `released_at`; post-consumption correction may use `CONSUMED -> REVERSED` only through a separately approved financial reversal boundary |
| CP28 | Idempotency | Matching checkout retry reuses the existing reservation/order/benefit; conflicting code/address/cart intent fails through `commerce_idempotency_keys`; no retry creates a second redemption or benefit |
| CP29 | Failure/privacy posture | Use only `COUPON_INVALID`, `COUPON_UNAVAILABLE`, `COUPON_CONFIGURATION_UNSUPPORTED`, `PROMOTION_PRICE_FLOOR_VIOLATION` and existing idempotency failures; never reveal foreign code existence, limits, customer restriction or raw configuration |
| CP30 | Delivery gate | Owner-freeze CP01-CP30, pass non-destructive duplicate/active-use preflight, then separately authorize one CLI-named migration that hardens Layer 2 separation and implements coupon constraints/evaluation within Layer 3; pass fresh replay, race and rollback gates before Production |

## Exact Evaluation Pipeline

```text
normalize optional code
  -> resolve same-tenant coupon without existence leakage
  -> validate coupon status, dates and customer restriction
  -> resolve exact ORDER campaign and referenced ACTIVE version
  -> validate narrow rule/action catalog
  -> verify automatic/coupon channel separation
  -> recompute PE01-PE24 item results at the checkout timestamp
  -> calculate post-item eligible base and floor headroom
  -> validate automatic/coupon stackability and exclusive groups
  -> lock campaign/version/coupon and active usage evidence
  -> recheck coupon and campaign global/per-customer limits
  -> calculate one bounded THB order benefit
  -> reserve one redemption inside the atomic checkout transaction
```

Any unsupported or ambiguous applicable configuration fails before checkout
writes. No-coupon checkout does not lock or mutate coupon sources.

## Calculation Contract

Let:

```text
E = round_half_up(sum(recomputed cart_item.line_total), 2)
F = round_half_up(sum(max(line_total - quantity * minimum_selling_price, 0)), 2)
```

For variants with no minimum selling price, their full recomputed line total
contributes to `F`.

```text
PERCENT_DISCOUNT:
  benefit = round_half_up(E * percent / 100, 2)

FIXED_DISCOUNT:
  benefit = min(configured amount, E)

require 0 < benefit <= E
require benefit <= F
order_discount_total = benefit
```

Shipping and tax are outside the eligible base. A coupon does not rewrite item
prices or item promotion snapshots.

## Usage And Concurrency Contract

- `RESERVED` consumes capacity immediately; releasing it restores capacity.
- Coupon limits count rows for one `coupon_id`.
- Campaign limits count active rows across every coupon whose referenced
  version belongs to that campaign.
- Per-customer limits apply the same counts filtered by canonical customer.
- The current idempotent redemption is reused, not counted as a new attempt.
- Campaign and coupon rows are locked before the count-and-insert decision so
  concurrent checkouts cannot both consume the final slot.

## Evidence And Privacy Contract

The coupon benefit snapshot may contain only:

```text
schema_version
currency_code
campaign_id
promotion_version_id
rule_id
action_id
action_type
eligible_base
benefit_amount
calculated_at
```

Monetary values are two-decimal strings. Coupon code, customer identity,
contact/address, limit values, raw JSON, cost, margin, provider payload and
internal lock/count detail are excluded from response, event and audit data.
Checkout does not grant or modify marketing consent.

## Non-Destructive Preflight

Before any coupon migration, prove all of the following without repairing data:

1. no duplicate `(organization_id, upper(btrim(code)))` values;
2. no blank normalized codes or control characters in checkout-eligible rows;
3. no coupon-linked version currently executable through the automatic path;
4. no active coupon redemption duplicates by cart or order;
5. all checkout-eligible coupons have same-tenant campaign/version links;
6. all non-null coupon/campaign limits are positive; and
7. no existing redemption identity or terminal history violates proposed
   constraints.

Any finding stops migration generation and requires an Owner-approved data
remediation plan. Frozen migrations are never edited.

## Validation Matrix For Future SQL

1. no-coupon checkout leaves coupon sources untouched;
2. trim/case normalization and duplicate preflight;
3. tenant, status, date and customer restriction denial;
4. exact campaign/version/rule/action allowlist;
5. coupon-linked versions never execute automatically;
6. exact percent/fixed arithmetic and half-up rounding;
7. minimum/maximum spend and minimum-selling-price gates;
8. stackability and exclusive-group conflict behavior;
9. coupon and campaign global/per-customer limits;
10. `RESERVED` capacity under competing checkout transactions;
11. one active redemption and one immutable benefit on retry;
12. complete rollback after injected failures;
13. consume/release lifecycle and retained history;
14. no code, restriction, limit or private configuration leakage;
15. direct browser writes/helper execution denied; and
16. fresh replay, database lint, Supabase regressions, tests, lint, typecheck
    and build.

## Blocking Decisions And Dependencies

Coupon and Part 3D SQL remain **BLOCKED** until:

1. the non-destructive preflight is executed and produces no blocking findings,
   or every finding has a separately Owner-approved remediation;
2. migration generation and local apply are separately authorized; and
3. the future migration proves automatic/coupon separation before checkout
   orchestration is exposed.

Production apply, Part 3E application runtime, payment/provider execution and
public checkout activation remain unauthorized.

## Review Outcome

The existing canonical coupon, campaign, redemption, order and benefit sources
can support the first MVP without a duplicate master. CP01-CP30 now freeze the
narrow executable catalog, deterministic arithmetic, usage/race behavior,
lifecycle evidence and privacy posture. The non-destructive preflight is the
next authorized evidence step; no migration, protected SQL or runtime is
authorized by this document.

## Local Preflight Evidence

The separately approved read-only local preflight ran on 2026-08-01 against
the current local Supabase schema. It used `begin transaction read only`, made
no data/schema change and ended with `rollback`. Every blocking count was zero:

```text
normalized_code_duplicates|0
unsafe_active_codes|0
automatic_coupon_version_overlap|0
active_redemption_cart_duplicates|0
active_redemption_order_duplicates|0
invalid_active_coupon_campaign_links|0
invalid_usage_limits|0
redemption_tenant_or_lifecycle_violations|0
coupon_preflight|pass
```

This validates local migration readiness only. Production was not queried and
no migration or protected function was generated. Layer 3 migration generation
and local apply require a separate explicit Owner authorization.

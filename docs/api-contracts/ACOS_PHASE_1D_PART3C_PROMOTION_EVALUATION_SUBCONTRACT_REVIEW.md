# Phase 1D Part 3C Promotion Evaluation Subcontract Review

**Task ID:** `PHASE-1D-CHECKOUT-PART3C-PROMOTION`
**Review Date:** 2026-08-01
**Status:** OWNER APPROVED / PE01-PE24 FROZEN / SQL IMPLEMENTED / LOCAL VALIDATED
**Owner Approval:** Approved in full on 2026-08-01
**Depends On:** Owner-frozen D01-D24, CO-BR-001 to CO-BR-044, M01-M20, C01-C24 and the locally validated Part 3B foundation
**Migration:** `20260731182133_phase_1d_promotion_evaluator.sql`
**Local Apply:** Fresh replay and focused/regression validation passed
**Production Apply:** Not authorized / blocked by P16
**Provider Spend:** USD 0

## Objective

Define the smallest deterministic promotion evaluator that can safely reprice
an `OPEN` Storefront cart without inventing financial semantics from the open
text and JSON fields in the existing promotion schema.

This review creates no function, migration, campaign, coupon, order, payment,
route, provider integration or Production configuration.

## Task Envelope

```text
PROJECT: ADORA Commerce OS
TRACK: A - Commerce Core
MODULE: Promotion / Cart Pricing
PHASE: 1D Part 3C Promotion Evaluation Subcontract

ALLOWED:
  canonical promotion schema and fixture audit
  executable type allowlist design
  deterministic eligibility and arithmetic contract
  stacking, exclusivity, rounding and snapshot design
  failure, privacy and validation contract
  documentation tests and status reconciliation

FORBIDDEN:
  create or apply migration outside a separately approved implementation step
  interpret unapproved condition/rule/action JSON
  silently ignore an applicable unsupported promotion
  browser-supplied price, discount, campaign or eligibility
  coupon reservation, order benefit persistence or payment work
  provider, secret, network or Production work
```

## Repository Findings

1. `promotion_campaigns`, versions, condition groups, conditions, rules,
   actions, target scopes, price mappings, tiers, bundles and rewards are the
   canonical promotion sources.
2. Most executable type columns and `value_json` payloads have no database
   allowlist or JSON schema. Generic presence does not define business meaning.
3. The existing Commerce A2 fixture demonstrates the names `MIN_QUANTITY` and
   `FIXED_DISCOUNT` with `value_json.amount`, but it does not implement an
   evaluator or freeze all arithmetic semantics.
4. `product_variants.base_price` and nullable `minimum_selling_price` are the
   canonical price and floor sources. Cost is never an eligibility input or
   output.
5. `promotion_applied_benefits` belongs to final order evidence in Part 3D. A
   mutable cart uses only its bounded pricing snapshot.
6. A coupon code is not persisted on the cart and Part 3C signatures contain no
   coupon input. Coupon validation/reservation therefore belongs to Part 3D.
7. D06 and CO-BR-016 require unsupported or ambiguous active promotion
   configuration to fail closed; base-price fallback is not allowed when such a
   promotion could apply.

## Owner-Frozen Decisions

| ID | Contract item | Recommended safe value |
|---|---|---|
| PE01 | Layer 2 scope | Evaluate automatic item promotions only; coupon, order-level, shipping, reward and bundle benefits remain outside Part 3C |
| PE02 | Campaign eligibility | Require same tenant, `status = ACTIVE`, `scope = CART`, currency null or `THB`, and an effective executable version |
| PE03 | Version eligibility | Require exactly one version with `status = ACTIVE`, `effective_from` null/past and `effective_until` null/future; zero versions means no benefit and multiple versions fail closed |
| PE04 | Target allowlist | Require one or more included `promotion_target_scopes` rows with `scope_type = VARIANT`, non-null same-tenant variant `reference_id`; excluded, product/category/global or mixed target semantics are unsupported |
| PE05 | Condition allowlist | Require no `promotion_condition_groups` or `promotion_conditions`; customer, segment, channel, date, payment and arbitrary JSON conditions are unsupported in Layer 2 |
| PE06 | Rule allowlist | Support only `rule_type = MIN_QUANTITY`, `scope_type = VARIANT`, positive `min_quantity`, optional `max_quantity >= min_quantity`, `repeatable = false`, null repeat cap, null spend bounds and null/empty `value_json` |
| PE07 | Action allowlist | Support only `PERCENT_DISCOUNT`, `FIXED_DISCOUNT` and `FIXED_UNIT_PRICE`; every eligible rule has exactly one same-version action |
| PE08 | Percent schema | `PERCENT_DISCOUNT.value_json` must contain exactly `{\"percent\": number}` with percent greater than 0 and at most 100, using at most four decimal places |
| PE09 | Fixed discount schema | `FIXED_DISCOUNT.value_json` must contain exactly `{\"amount\": number}` with amount greater than 0 and at most two decimal places; the amount applies once to the qualifying line, not per unit |
| PE10 | Fixed unit price schema | `FIXED_UNIT_PRICE` uses null/empty `value_json` and exactly one `promotion_price_mappings` row for each targeted variant with `mapping_type = VARIANT`, matching `reference_id`, THB and non-negative `fixed_unit_price` |
| PE11 | Unsupported child records | Any tier, bundle, bundle component, reward rule or extra price mapping attached to an otherwise applicable version makes that version unsupported and fails the mutation |
| PE12 | Eligibility ordering | Sort eligible candidates by campaign priority descending, rule priority descending, action priority descending, then campaign/version/rule/action UUID ascending |
| PE13 | Exclusive groups | Effective group is action group, otherwise campaign group; if both are non-null and differ, fail closed; only the first ordered eligible candidate in one normalized group applies |
| PE14 | Stackability | Continue to later candidates only when both the applied campaign and action are stackable; otherwise stop promotion evaluation for that line after applying the candidate |
| PE15 | Sequential basis | Start from canonical base price; fixed-unit price changes applied unit price, while percent/fixed discounts reduce the remaining rounded line amount; later stackable actions use the remaining amount |
| PE16 | Percent arithmetic | Discount is current remaining line amount multiplied by percent divided by 100, rounded half-up to two decimals and capped at the remaining amount |
| PE17 | Fixed arithmetic | Fixed discount is the lesser of configured amount and current remaining amount; fixed-unit benefit is original line amount minus quantity times fixed unit price, never below zero |
| PE18 | Price floor | Final effective per-unit amount must not fall below non-null `minimum_selling_price`; a violation returns `PROMOTION_PRICE_FLOOR_VIOLATION` and rolls back the cart mutation |
| PE19 | Monetary invariants | THB only; round half-up to two decimals at every persisted unit, benefit, line and aggregate boundary; total discount cannot exceed the eligible line base and no amount may be negative |
| PE20 | Usage-limited promotions | Campaign/version/coupon usage counters are not consumed in Part 3C; any campaign with campaign usage limits or per-customer limits is unsupported until Part 3D can lock and reserve usage atomically |
| PE21 | Coupon boundary | Part 3C neither accepts nor stores a coupon; cart discount totals contain automatic item promotion benefits only; one normalized coupon is evaluated and reserved in Part 3D |
| PE22 | Snapshot allowlist | Store schema version, THB, base/applied unit price, total line benefit, ordered campaign/version/rule/action IDs, action type and calculated timestamp; exclude names, codes, raw JSON, cost, margin and customer data |
| PE23 | Failure posture | An applicable row outside the exact allowlist returns `PROMOTION_CONFIGURATION_UNSUPPORTED` before cart writes; malformed numeric data, ambiguous links or cross-tenant references never fall back to base price |
| PE24 | Delivery gate | Layer 2 SQL may be generated only after PE01-PE24 are Owner-frozen; the same evaluator must be reused and fully recomputed under Part 3D locks before immutable order benefits are written |

## Exact Eligibility Pipeline

For each active cart variant, the future evaluator must:

1. load canonical variant base price and minimum selling price;
2. load same-tenant active `CART` campaigns effective at one captured database
   timestamp;
3. reject any otherwise applicable campaign with an ambiguous version;
4. validate every candidate version and child row against the PE allowlist;
5. keep only included `VARIANT` targets matching the cart variant;
6. require the quantity to satisfy inclusive minimum/maximum bounds;
7. order candidates using PE12;
8. apply exclusive-group and stackability rules;
9. enforce monetary invariants and the price floor after every candidate; and
10. emit the bounded result and snapshot only after all candidates validate.

An organization with no applicable active promotion receives canonical base
pricing. An applicable active promotion with unsupported configuration blocks
the mutation instead of being silently ignored.

## Exact Action Arithmetic

Let:

```text
Q = requested quantity
B = canonical variant base unit price
O = round_half_up(Q * B, 2)
R = current remaining line amount, initially O
```

For an eligible action:

```text
PERCENT_DISCOUNT:
  benefit = min(R, round_half_up(R * percent / 100, 2))
  R = R - benefit

FIXED_DISCOUNT:
  benefit = min(R, configured amount)
  R = R - benefit

FIXED_UNIT_PRICE:
  mapped_line = round_half_up(Q * fixed_unit_price, 2)
  mapped_line must be <= R
  benefit = R - mapped_line
  R = mapped_line
```

An action that would increase price, create a negative amount, violate the
minimum selling price or exceed its bounded JSON schema fails closed. After all
actions, `line_discount_total = O - R` and `line_total = R`.

## Priority, Exclusivity And Stackability

- Higher numeric priority executes first at campaign, rule and action levels.
- UUID ascending is the stable final tie-breaker; creation time is not used.
- Exclusive-group comparison uses trimmed case-sensitive text because the
  canonical schema does not define case folding. Empty groups are invalid.
- The first ordered eligible candidate wins its group; the evaluator does not
  search for the largest customer discount.
- A non-stackable applied campaign or action ends evaluation for that line.
- Ineligible quantity candidates do not consume an exclusive group or stop
  evaluation.

## Snapshot Contract

The future `cart_items.pricing_snapshot_json` shape is:

```json
{
  "schema_version": 1,
  "currency_code": "THB",
  "base_unit_price": "0.00",
  "applied_unit_price": "0.00",
  "line_benefit_total": "0.00",
  "applied_actions": [
    {
      "campaign_id": "uuid",
      "promotion_version_id": "uuid",
      "rule_id": "uuid",
      "action_id": "uuid",
      "action_type": "FIXED_DISCOUNT"
    }
  ],
  "calculated_at": "database timestamptz"
}
```

Arrays follow evaluation order. Monetary values are serialized as two-decimal
strings. Raw condition/action JSON and display labels are not copied.

## Part 3D Consistency Contract

Part 3D must invoke the same evaluator semantics under deterministic cart,
inventory, coupon and promotion locks. It must recompute from canonical rows;
the cart snapshot is evidence for change detection, not authority. A changed
price or promotion returns the newly calculated result for explicit customer
confirmation rather than silently submitting a different total.

Only Part 3D writes `promotion_applied_benefits`, and it writes one immutable row
per applied action with the final order/order-item references and bounded
snapshot. Part 3C writes no order benefit or coupon redemption.

## Controlled Failures

```text
PROMOTION_CONFIGURATION_UNSUPPORTED
PROMOTION_PRICE_FLOOR_VIOLATION
PRICE_CHANGED
```

These codes reveal no cross-tenant campaign existence or private rule payload.
Unexpected database detail is not returned to the browser.

## Validation Matrix For Future SQL

1. no-promotion base-price path;
2. exact percent, fixed and fixed-unit calculations;
3. quantity minimum/maximum boundaries;
4. campaign/version effective-time and currency gates;
5. cross-tenant target and mapping denial;
6. deterministic priority and UUID tie-breaks;
7. exclusive-group first-winner behavior;
8. stackable and non-stackable stop behavior;
9. malformed/extra JSON key rejection;
10. unsupported condition, tier, bundle, reward and usage-limit rejection;
11. minimum selling price and non-negative invariants;
12. half-up rounding at unit, benefit, line and aggregate boundaries;
13. snapshot field/privacy allowlist;
14. unchanged cart after every controlled failure;
15. concurrent promotion edits produce either one consistent snapshot or a
    controlled retry/change result;
16. Part 3D recomputation matches Part 3C for an unchanged source set;
17. full tests, lint, typecheck, build and Supabase security/workflow gates; and
18. no Production apply or public checkout activation.

## Review Outcome

PE01-PE24 provide a narrow executable catalog without changing the canonical
promotion schema. The Project Owner approved PE01-PE24 in full on 2026-08-01,
so Layer 2 SQL design and local implementation are ready for a separately
approved implementation step.

The review itself did not authorize migration generation, guarded cart
runtime, coupon/order benefit persistence, provider work or Production
activation. The evaluator implementation was authorized separately after the
Owner freeze.

## Implementation Evidence

The separately approved Layer 2 implementation added the internal stable
`SECURITY INVOKER` function
`internal_evaluate_storefront_variant_promotion(uuid, uuid, numeric,
timestamptz)`. Execution is revoked from `PUBLIC`, `anon`, `authenticated` and
`service_role`; future guarded cart functions may compose it under their own
frozen authorization boundary.

Fresh local replay, focused arithmetic/configuration/privacy tests, database
lint, Supabase security/workflow/commerce regressions, Storefront regression
and checkout-foundation regression passed. No cart, order, coupon or Production
mutation was added.

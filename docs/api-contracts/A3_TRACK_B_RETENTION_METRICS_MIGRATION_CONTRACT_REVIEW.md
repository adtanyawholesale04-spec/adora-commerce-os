# Track B Retention Metrics Migration Contract Review

**Task:** `ENG-DB-039`
**Status:** APPROVED / IMPLEMENTED
**SQL status:** VALIDATED in local fresh replay
**Track:** Track B - Customer Engagement Platform
**Scope:** Rebuildable customer retention metrics projection

## Source Baseline

- `docs/governance/ACOS_AI_CODING_CONSTITUTION.md`
- `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md`
- `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md`
- `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md`
- validated Core customer and Orders schema from migrations `010_customers.sql` and `014_orders.sql`
- validated Track B migrations through `20260728163536_consent_suppression_038.sql`

## Proposed Migration Scope

Create only:

```text
customer_retention_metrics
```

This is a rebuildable projection. It must not mutate Orders, Payments, Returns, customer history, or financial balances, and it must not introduce a scheduler or calculation worker in the migration.

## Verified Dependency Mapping

| Dependency | Repository target | Result |
|---|---|---|
| Tenant | `organizations(id)` | READY |
| Customer | `customers(organization_id, id)` | READY |
| Order source | `orders(organization_id, customer_id)` | READY; read source only |
| Engagement source | `content_events` not yet created | Deferred; `last_engagement_at` may remain nullable |
| Currency | `orders.currency_code` | Owner decision required for multi-currency aggregation |

No FK to Orders is proposed because one customer has many source orders and the metrics row is a projection.

## Proposed Projection Contract

```text
first_purchase_at
last_purchase_at
order_count
lifetime_value
average_order_value
recency_days
frequency_score 1..5
monetary_score 1..5
rfm_score
retention_segment
last_engagement_at nullable until event source exists
engagement_score optional
churn_risk_score optional
calculated_at
calculation_version
created_at
updated_at
```

Default segment labels are `CHAMPION`, `LOYAL`, `POTENTIAL_LOYALIST`, `NEW_CUSTOMER`, `AT_RISK`, `LOST`, and `DORMANT`.

## Owner Decisions Required Before SQL

1. **Qualifying orders:** approve using `order_status = COMPLETED` and excluding cancelled/payment-expired orders, with payment/refund treatment handled by the projection contract.
2. **Refund/return treatment:** approve whether `lifetime_value` uses `orders.grand_total` as recorded, or a later net-of-refund/return source calculation.
3. **Currency aggregation:** approve one organization reporting currency requirement, or require metrics to remain source-currency scoped until currency conversion is defined.
4. **Engagement inputs:** approve `last_engagement_at` and `engagement_score` as nullable until `content_events` exists, with no guessed fallback from Follow/Interest.
5. **Calculation version/segment rules:** approve storing a required `calculation_version` and constrained default segment labels, with thresholds owned by the scheduled refresh service rather than SQL.

## Owner Approval Record

Owner approval recorded 2026-07-28:

- qualifying orders use `order_status = COMPLETED` and are read only;
- V1 projection values use recorded `orders.grand_total`, with no financial mutation;
- refresh service uses the organization's `currency_code` and does not mix currencies;
- engagement fields remain nullable until `content_events` exists;
- `calculation_version` and constrained default segment labels are required projection metadata.

## Security Requirements

- Enable RLS on `public.customer_retention_metrics`.
- Revoke direct table privileges from `public`, `anon`, and `authenticated` until permission-aware read policies and guarded refresh boundaries exist.
- Keep metrics tenant-scoped by composite customer FK.
- Do not expose financial fields as authoritative accounting values; they are projection outputs only.
- Refresh must be idempotent by `(organization_id, customer_id)` and auditable at the service/worker boundary.

## Acceptance Gate

After the five decisions were recorded, migration `20260728164249_retention_metrics_040.sql` was generated with the Supabase CLI, replayed from `001` through current, and validated for unique tenant/customer projection rows, score ranges, segment checks, nullable engagement fields, RLS, and direct-role denial.

## Current Result

`ENG-DB-039` is `VALIDATED`. The migration creates a rebuildable projection table only; refresh scheduling, order qualification queries, and financial calculations remain service/worker boundaries.

**NEXT:** Contract review for `ENG-DB-040` Audience / Campaign dependency.

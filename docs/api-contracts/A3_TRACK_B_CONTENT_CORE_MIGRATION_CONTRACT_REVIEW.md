# Track B Content Core Migration Contract Review

**Task:** `ENG-DB-035`
**Status:** APPROVED / IMPLEMENTED
**SQL status:** VALIDATED in local fresh replay
**Track:** Track B - Customer Engagement Platform
**Scope:** First Track B schema unit from MIG-PLAN-001

## Source Baseline

- `docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md`
- `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md`
- `docs/migrations/MIGRATION_PLAN_REPOSITORY_VERIFICATION_2026-07-28.md`
- verified local schema through migration `20260728152602`

## Proposed Migration Scope

Create only these tenant-owned tables:

```text
content_posts
content_product_links
content_promotion_links
content_live_links
```

The migration must not create media binary storage, Feed rows, Consent tables, Audience tables, Campaign tables, Messaging jobs, provider calls, or duplicate Core masters.

## Verified Dependency Mapping

| Contract dependency | Verified repository target | Result |
|---|---|---|
| Tenant | `organizations(id)` | READY |
| Author / updater | `profiles(id)` | READY; no public `users` table exists |
| Product | `products(organization_id, id)` | READY |
| Variant | `product_variants(organization_id, id)` | READY |
| Coupon | `coupons(organization_id, id)` | READY |
| Live session | `live_sessions(organization_id, id)` | READY |
| Promotion | No `promotions` table exists | OWNER DECISION REQUIRED |

All cross-tenant references must use composite organization-scoped FKs consistent with the verified Core schema.

## Required Content Rules

- `content_type`, `status`, and `visibility` use `text/varchar` plus named `CHECK` constraints, not PostgreSQL enums.
- Supported types: `GENERAL_POST`, `PRODUCT_POST`, `PROMOTION_POST`, `LIVE_ANNOUNCEMENT`, `ARTICLE`, `ANNOUNCEMENT`.
- Lifecycle: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`, `DELETED`.
- Scheduled content requires `scheduled_at`.
- Published content requires `published_at`.
- Deleted content requires `deleted_at` and follows soft-delete rules.
- Product links reference Core products/variants and may store display snapshots without becoming a new source of truth.
- Important lifecycle changes require audit through the approved application/API boundary.

## Owner Decisions Required Before SQL

1. **Promotion link dependency:** choose one:
   - coupon-only in this migration and defer `promotion_id` until a verified promotion table exists;
   - nullable `promotion_id` without FK, with a later forward FK migration;
   - defer `content_promotion_links` until the promotion model is available.
2. **Body storage:** choose `jsonb` rich-text structure or `text` markdown-safe body. The ER currently permits both.
3. **Content author FK naming:** confirm `created_by_user_id` / `updated_by_user_id` column names may reference `profiles(id)` despite the legacy name.
4. **RLS staging:** choose whether migration 035 enables RLS with no policies until the dedicated RLS migration, or whether table creation and RLS enablement are kept together. Direct public access must remain denied until the controlled public-read boundary exists.
5. **Write boundary:** confirm whether Content Core remains table-write disabled for browser roles until guarded service/RPC contracts are approved.

## Owner Approval Record

Owner approval recorded 2026-07-28:

- defer `content_promotion_links` until a verified `promotions` master exists;
- store `body` as `jsonb`;
- `created_by_user_id` and `updated_by_user_id` reference `public.profiles`;
- enable RLS with no direct browser policies in this migration;
- keep direct browser table writes disabled until guarded Content service/RPC contracts are approved.

## Security Requirements

- `organization_id` is required on every table.
- No broad `public`/`anon` data access.
- New privileged functions, if later required, must use secure empty `search_path`, qualified names, restricted execute grants, tenant/permission checks, idempotency, and audit.
- Public content reads must enforce `PUBLISHED`, `PUBLIC`, and `deleted_at is null` through a controlled read boundary.
- Cross-tenant negative tests are mandatory before promotion.

## Acceptance Gate

This contract became `APPROVED` after the five decisions were recorded. Migration `20260728161057_content_core_035.sql` was generated with the Supabase CLI, replayed from `001` through current, and validated for constraints, FKs, RLS state, and direct-role denial.

## Current Result

`ENG-DB-035` is `VALIDATED`. The migration creates the approved Content Core tables and intentionally defers promotion links; no media, campaign, messaging, or public-read policy surface was introduced.

**NEXT:** Contract review for `ENG-DB-036` Content Media.

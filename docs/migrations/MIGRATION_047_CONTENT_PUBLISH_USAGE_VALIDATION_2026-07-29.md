# Migration 047 Content Publish Usage Boundary Validation

**Migration:** `20260728182051_content_publish_usage_boundary.sql`
**Status:** `VALIDATED`
**Date:** 2026-07-29
**Track:** Track B — Customer Engagement Platform

## Scope

- Service-role-only `api_publish_content_post` guarded boundary.
- Legal `DRAFT` and due `SCHEDULED` to `PUBLISHED` transition.
- One `POSTS` usage unit on successful publish.
- Content update and Usage Meter increment in one transaction.
- Audit-backed idempotent retry using the same request ID.
- Direct authenticated RPC and Content table update denial.

## Evidence

- Fresh local Supabase replay passed through Migration 047.
- `npm run validate:content-publish-usage-boundary` passed.
- `npm run validate:supabase-workflows` passed, including Content publish usage boundary.
- `npm run validate:supabase-security` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm test` passed: 58/58.

## Explicit Non-Scope

Media storage adjustment, Feed events, Audience snapshot metering, Campaign recipient reservation, provider dispatch metering, billing, and database triggers remain outside this migration.

## Next Gate

Review the next workflow-specific Usage Meter boundary separately. No additional workflow is enabled by this migration.

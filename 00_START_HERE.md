# ADORA Commerce OS — START HERE

Project: ADORA Commerce OS (ACOS)
Repository: `adora-commerce-os`

## Development order

```text
1. Create GitHub repository
2. Create local Next.js workspace
3. Configure Tailwind + Supabase
4. Start Supabase Local
5. Replay migrations 001–034
6. Apply SECURITY_HARDENING_V1.sql
7. Validate RLS / RPC / Security
8. Freeze Migration V1
9. Implement Phase 0
10. Local test → GitHub → Staging → UAT → Production
```

## Environments

```text
LOCAL → DEVELOPMENT → STAGING → PRODUCTION
```

## Phases

```text
0 Foundation / Auth / Tenant / Security
1 Product / Inventory
2 Customer / Conversation / Live
3 Cart / Order / Purchase Session
4 Promotion Engine
5 Payment / Credit / Loyalty
6 Fulfillment / QC / Shipping
7 Return / Exchange / RTO
8 SaaS Administration
9 Reports / Export / Operations
10 External Integrations
```

## Read first

- `docs/DEVELOPMENT_LIFECYCLE_PLAN_V1.md`
- `docs/DEVELOPMENT_PHASE_ROADMAP_V1.md`
- `docs/RLS_AND_PERMISSION_MATRIX_V1.md`
- `docs/SECURITY_AND_ABUSE_PROTECTION_PLAN_V1.md`
- `docs/SUPABASE_MIGRATION_VALIDATION_PLAN_V1.md`
- latest Business Rules / Schema under `reference/`

Do not apply these migrations directly to an existing production database before isolated validation.

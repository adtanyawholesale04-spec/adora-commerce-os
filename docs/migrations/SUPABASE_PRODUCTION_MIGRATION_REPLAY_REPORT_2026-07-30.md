# ADORA Commerce OS (ACOS)
# SUPABASE PRODUCTION MIGRATION REPLAY REPORT

**Date:** 2026-07-30
**Status:** REPLAY VALIDATED / ADVISOR REMEDIATION REQUIRED
**Protocol:** `docs/migrations/SUPABASE_MIGRATION_REPLAY_PROTOCOL.md`
**Target:** `ACOS Production` (`pirewyrhddrhmtiwmlaw`)

---

## 1. Production Target

```text
Project: ACOS Production
Project ref: pirewyrhddrhmtiwmlaw
Region: ap-northeast-1 (Tokyo)
Postgres: 17
Status before replay: ACTIVE_HEALTHY
```

The CLI link was verified before any remote write. The unrelated
`ADORA-Project` project was not modified.

---

## 2. Replay Result

Preflight:

```text
supabase db push --dry-run: PASS
Migrations proposed: 83
Remote migration conflicts: none
```

Production replay:

```text
supabase db push --yes: PASS
Applied range: 001_extensions_helpers.sql
Through: 20260729150650_phase_1b_signup_durable_rate_limit_boundary.sql
```

Post-replay verification:

```text
Local/remote migration history: MATCH (83/83)
supabase db push --dry-run: Remote database is up to date
```

The post-push pg-delta catalog cache emitted a missing temporary certificate
warning after the migrations had applied. The command exited successfully and
the independent history and dry-run checks confirmed the remote state.

---

## 3. Layer 3 Validation

Security suite:

```text
npm run validate:supabase-security: PASS
```

Workflow suite:

```text
npm run validate:supabase-workflows: PASS
```

Evidence includes tenant isolation, permission-aware RLS, guarded inventory and
shipping workflows, role management, customer portal boundaries, carrier
webhook idempotency, usage metering, messaging reservation and signup rate
limiting.

---

## 4. Production Advisors

Command:

```text
supabase db advisors --linked --type all --level warn --fail-on error
```

Result:

```text
ERROR findings: 0
WARN findings: 44
```

Warning groups:

```text
anon SECURITY DEFINER executable: 1
authenticated SECURITY DEFINER executable: 37
extension in public: 2
mutable function search_path: 2
RLS initplan performance: 2
```

The authenticated guarded RPC findings require contract-aware review because
many are intentionally callable only after in-function tenant, membership,
permission, ownership and idempotency checks. They must not be revoked in bulk.

The automatically generated `public.rls_auto_enable()` anonymous/authenticated
exposure and the two mutable-search-path functions require focused remediation
review before application credentials are connected.

---

## 5. Status Impact

Validated:

```text
Production migration replay
Remote migration history reconciliation
Local security and workflow regression gates
```

Still blocked:

```text
Vercel-to-Supabase environment connection
Production signup enablement
Production advisor remediation/finding disposition
CAPTCHA, SMTP/DNS, monitoring and rollout evidence
```

No production user data was created by this replay.

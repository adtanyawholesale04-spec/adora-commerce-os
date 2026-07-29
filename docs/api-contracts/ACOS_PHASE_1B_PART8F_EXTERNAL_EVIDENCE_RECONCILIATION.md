# Phase 1B Part 8F External Values and Evidence Reconciliation

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-EVIDENCE`
**Review Date:** 2026-07-30
**Status:** PARTIAL / BLOCKED / OWNER AND PROVIDER INPUTS REQUIRED
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Objective

Reconcile the frozen P01-P16 policy against current repository and provider
evidence without inferring values, exposing secrets, connecting deployment
credentials or enabling public signup.

Approval of this reconciliation is not approval to deploy or enable signup.

## Current Evidence

Confirmed evidence:

```text
ACOS Production project: ACTIVE_HEALTHY
Supabase project ref: pirewyrhddrhmtiwmlaw
Supabase region: ap-northeast-1 (Tokyo)
Postgres: 17
production migration/advisor database gate: CLOSED
registered domain owned by Owner: adora-commerce.com
Vercel repository link: ABSENT
```

The local environment contains the expected variable names and local E2E
configuration. It is not production evidence and must not be copied into
Vercel. No value or secret from `.env.local` is recorded here.

## P01-P16 Reconciliation

| ID | State | Evidence / blocker |
|---|---|---|
| P01 | VERIFIED | Owner approved `https://adora-commerce.com` as the exact canonical production origin; `https://adora-commerce-os.vercel.app` remains a deployment/temporary domain and is not canonical |
| P02 | MISSING | No Vercel project link exists; `.vercel/project.json` is absent |
| P03 | VERIFIED | Dedicated `ACOS Production` project `pirewyrhddrhmtiwmlaw` is active and linked in Tokyo (`ap-northeast-1`) |
| P04 | MISSING | Production Site URL and exact `/auth/platform/callback` allowlist evidence cannot be frozen before P01 |
| P05 | MISSING | No dedicated production Turnstile widget/hostname/sitekey evidence |
| P06 | PARTIAL | Secret destination policy is frozen, but Supabase Auth configuration, named owner and rotation evidence are absent |
| P07 | MISSING | No verified Resend account or dedicated transactional sending domain evidence |
| P08 | MISSING | No exact From address or sender-name approval |
| P09 | MISSING | No verified SPF, DKIM or DMARC monitoring evidence |
| P10 | MISSING | No Resend link-tracking configuration or production callback-integrity evidence |
| P11 | MISSING | No current Resend/Supabase Auth quota evidence; paid overage remains unauthorized |
| P12 | PARTIAL | Destination policy is frozen, but no Vercel project-specific environment evidence exists |
| P13 | MISSING | No named rotation/revocation owner, contact or operating record |
| P14 | MISSING | No monitoring destination or alert owner |
| P15 | MISSING | No named smoke-test cohort/owner or executed kill-switch rollback evidence |
| P16 | MISSING | No approved production backup policy and restore-drill disposition |

Summary:

```text
VERIFIED: 2
PARTIAL: 2
OWNER DECISION REQUIRED: 0
MISSING: 12
```

## Safety Disposition

```text
ACOS_PLATFORM_SIGNUP_ENABLED must remain false in production
ACOS_PLATFORM_SIGNUP_KILL_SWITCH must remain true in production
no Vercel production secrets may be configured before P02/P12
no Turnstile secret may leave Supabase Auth
no SMTP credential may leave Supabase Auth
no production email or public signup is authorized
no paid plan, payment method or overage is authorized
```

Local E2E flags do not represent production state. Production continues to
fail closed until the complete external gate is verified.

## Next Ordered Actions

1. Create/link one Vercel production project and keep previews isolated.
2. Attach and verify `adora-commerce.com` without changing the frozen P01
   canonical origin.
3. Configure P04 only after P02 is frozen.
4. Create and verify Turnstile and Resend/DNS boundaries without exposing
   secrets.
5. Record P11-P16 operational evidence.
6. Run the full production configuration validation and limited smoke test.

## Decision

`PARTIAL / BLOCKED`

P01, P03 and the production database gate are ready. Production deployment and
signup remain blocked because P02/P04-P16 lack complete evidence.

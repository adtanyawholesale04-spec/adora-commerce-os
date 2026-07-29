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
Vercel team/project: adora1/adora-commerce-os
Vercel project ID: prj_toXXCAFY8ajeBJPlDHWby3in7jaI
connected repository: adtanyawholesale04-spec/adora-commerce-os
production branch: main
production deployment: READY at commit ab91128
production custom domain: adora-commerce.com (VALID CONFIGURATION)
production DNS: apex CNAME -> a82fe037db6c1071.vercel-dns-017.com (DNS only)
Supabase Auth Site URL: https://adora-commerce.com
Supabase Auth redirect allowlist: https://adora-commerce.com/auth/platform/callback
project environment variables: NONE
```

The local environment contains the expected variable names and local E2E
configuration. It is not production evidence and must not be copied into
Vercel. No value or secret from `.env.local` is recorded here.

## P01-P16 Reconciliation

| ID | State | Evidence / blocker |
|---|---|---|
| P01 | VERIFIED | Owner approved `https://adora-commerce.com` as the exact canonical production origin; `https://adora-commerce-os.vercel.app` remains a deployment/temporary domain and is not canonical |
| P02 | VERIFIED | Dedicated Hobby project `adora1/adora-commerce-os` (`prj_toXXCAFY8ajeBJPlDHWby3in7jaI`) is connected to `adtanyawholesale04-spec/adora-commerce-os`; `main` is the production source, commit `ab91128` deployed Ready, previews remain separate, and no project environment variables exist |
| P03 | VERIFIED | Dedicated `ACOS Production` project `pirewyrhddrhmtiwmlaw` is active and linked in Tokyo (`ap-northeast-1`) |
| P04 | VERIFIED | `adora-commerce.com` is attached to Vercel with valid configuration and SSL; the Cloudflare apex CNAME targets `a82fe037db6c1071.vercel-dns-017.com` in DNS-only mode; Supabase Auth uses exact Site URL `https://adora-commerce.com` and the sole redirect allowlist entry is `https://adora-commerce.com/auth/platform/callback` |
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
VERIFIED: 4
PARTIAL: 2
OWNER DECISION REQUIRED: 0
MISSING: 10
```

## Safety Disposition

```text
ACOS_PLATFORM_SIGNUP_ENABLED must remain false in production
ACOS_PLATFORM_SIGNUP_KILL_SWITCH must remain true in production
no Vercel production secrets may be configured before P12
no Turnstile secret may leave Supabase Auth
no SMTP credential may leave Supabase Auth
no production email or public signup is authorized
no paid plan, payment method or overage is authorized
```

Local E2E flags do not represent production state. Production continues to
fail closed until the complete external gate is verified.

## Next Ordered Actions

1. Create and verify the P05/P06 production Turnstile widget and Supabase
   CAPTCHA configuration without exposing the secret.
2. Create and verify Resend/DNS boundaries without exposing
   secrets.
3. Record P11-P16 operational evidence.
4. Run the full production configuration validation and limited smoke test.

## Decision

`PARTIAL / BLOCKED`

P01-P04 and the production database gate are ready. Public signup remains
blocked because P05-P16 lack complete evidence.

# Phase 1B Part 8F External Values and Evidence Reconciliation

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-EVIDENCE`
**Review Date:** 2026-07-31
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
Cloudflare Turnstile widget: ACOS Production Signup
Turnstile hostname/mode: adora-commerce.com / Managed
Turnstile pre-clearance: DISABLED
Supabase Auth CAPTCHA: ENABLED / CLOUDFLARE TURNSTILE
Turnstile secret destination: SUPABASE AUTH ONLY
Turnstile credential owner: ACOS Owner
Turnstile rotation cadence: 90 DAYS / NEXT DUE 2026-10-29
Resend transactional domain: auth.adora-commerce.com
Resend sending region: Tokyo (ap-northeast-1)
Resend domain status: VERIFIED
Resend DKIM/SPF/mail-from: VERIFIED
DMARC monitoring: _dmarc.adora-commerce.com / p=none
Resend sender identity: ADORA Commerce <no-reply@auth.adora-commerce.com>
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
| P05 | VERIFIED | Dedicated production widget `ACOS Production Signup` is configured for exact hostname `adora-commerce.com` in Managed mode with pre-clearance disabled; provider keys exist but their values are intentionally excluded from repository evidence |
| P06 | VERIFIED | Supabase Auth CAPTCHA protection is enabled with Cloudflare Turnstile and the secret is stored only in Supabase Auth; `ACOS Owner` owns the credential and the approved 90-day/emergency rotation process is frozen in `ACOS_PHASE_1B_PART8F_P06_TURNSTILE_CREDENTIAL_OPERATIONS.md` |
| P07 | VERIFIED | Owner-controlled Resend account contains the dedicated transactional domain `auth.adora-commerce.com` in Tokyo (`ap-northeast-1`); DNS verification remains separately gated by P09 and no API key, SMTP credential or email send was created |
| P08 | VERIFIED | Owner approved the exact authentication sender `ADORA Commerce <no-reply@auth.adora-commerce.com>`; no Reply-To, SMTP credential, API key or email send is implied |
| P09 | VERIFIED | Resend reports `auth.adora-commerce.com` verified; Cloudflare holds DNS-only DKIM, SPF and mail-from MX records, while `_dmarc.adora-commerce.com` resolves with the approved monitoring policy `p=none`; record values and authorization state are excluded from repository evidence |
| P10 | MISSING | No Resend link-tracking configuration or production callback-integrity evidence |
| P11 | MISSING | No current Resend/Supabase Auth quota evidence; paid overage remains unauthorized |
| P12 | PARTIAL | Destination policy is frozen, but no Vercel project-specific environment evidence exists |
| P13 | MISSING | No named rotation/revocation owner, contact or operating record |
| P14 | MISSING | No monitoring destination or alert owner |
| P15 | MISSING | No named smoke-test cohort/owner or executed kill-switch rollback evidence |
| P16 | MISSING | No approved production backup policy and restore-drill disposition |

Summary:

```text
VERIFIED: 9
PARTIAL: 1
OWNER DECISION REQUIRED: 0
MISSING: 6
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

1. Reconcile P10 link tracking and callback-integrity settings.
2. Record P11-P16 operational evidence.
3. Run the full production configuration validation and limited smoke test.

## Decision

`PARTIAL / BLOCKED`

P01-P09 and the production database gate are ready. Public signup remains
blocked because P10-P16 lack complete evidence.

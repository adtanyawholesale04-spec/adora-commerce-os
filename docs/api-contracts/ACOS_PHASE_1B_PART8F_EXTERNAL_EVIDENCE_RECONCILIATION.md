# Phase 1B Part 8F External Values and Evidence Reconciliation

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-EVIDENCE`
**Review Date:** 2026-07-31
**Status:** PARTIAL / PRODUCTION BLOCKER DEFERRED
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
Resend tracking subdomain: NOT CONFIGURED
Supabase confirmation template: {{ .ConfirmationURL }}
production callback integrity: EXACT / SINGLE ALLOWLIST ENTRY
Resend transactional quota: FREE / 0 OF 3,000 MONTHLY / 0 OF 100 DAILY
Resend payment method/overage: NONE / DISABLED
Supabase plan/spend cap/payment method: FREE / ENABLED / NONE
Supabase Auth email rate limit: 2 PER HOUR
ACOS activation ceiling: 1 ATTEMPTED SIGNUP EMAIL PER HOUR
P12 Vercel environment scope: PRODUCTION ONLY
P12 application server secrets: CONFIGURED / VALUES EXCLUDED
P12 public Turnstile sitekey: CONFIGURED / VALUE EXCLUDED
P12 rollout controls: SIGNUP FALSE / KILL SWITCH TRUE
P12 global limiter: 1 ATTEMPT PER 3,600 SECONDS
Preview/Development P12 variables: NONE
P13 rotation/revocation owner: ACOS OWNER
P13 primary contact route: PROVIDER-ACCOUNT OWNER EMAIL
P13 application-secret cadence: 90 DAYS / NEXT DUE 2026-10-29
P13 fallback disposition: FAIL CLOSED
P14 monitoring owner: ACOS OWNER
P14 destinations: SUPABASE AUTH / CLOUDFLARE TURNSTILE / VERCEL RUNTIME / RESEND
P14 consolidated alert sink: NOT CONFIGURED
P14 rollout disposition: KEEP SIGNUP DISABLED
P15 change/monitoring/rollback owner: ACOS OWNER
P15 smoke-test cohort: 1 OWNER-CONTROLLED TEST MAILBOX
P15 maximum attempted email: 1 PER 3,600 SECONDS
P15 execution/public rollout: BLOCKED / NOT AUTHORIZED
P16 provider backup posture: FREE PLAN / NO PROJECT BACKUPS
P16 encrypted backup destination: TEMPORARY / OUTSIDE GIT / DELETED
P16 commerce-core restore drill: VERIFIED
P16 full managed-service restore: NOT PROVEN
P16 rollout disposition: DEFERRED / PRODUCTION REMAINS BLOCKED
```

The local environment contains the expected variable names and local E2E
configuration. It is not production evidence and must not be copied into
Vercel. No value or secret from `.env.local` is recorded here.

## P01-P16 Reconciliation

| ID | State | Evidence / blocker |
|---|---|---|
| P01 | VERIFIED | Owner approved `https://adora-commerce.com` as the exact canonical production origin; `https://adora-commerce-os.vercel.app` remains a deployment/temporary domain and is not canonical |
| P02 | VERIFIED | Dedicated Hobby project `adora1/adora-commerce-os` (`prj_toXXCAFY8ajeBJPlDHWby3in7jaI`) is connected to `adtanyawholesale04-spec/adora-commerce-os`; `main` is the production source, commit `ab91128` deployed Ready and previews remain separate |
| P03 | VERIFIED | Dedicated `ACOS Production` project `pirewyrhddrhmtiwmlaw` is active and linked in Tokyo (`ap-northeast-1`) |
| P04 | VERIFIED | `adora-commerce.com` is attached to Vercel with valid configuration and SSL; the Cloudflare apex CNAME targets `a82fe037db6c1071.vercel-dns-017.com` in DNS-only mode; Supabase Auth uses exact Site URL `https://adora-commerce.com` and the sole redirect allowlist entry is `https://adora-commerce.com/auth/platform/callback` |
| P05 | VERIFIED | Dedicated production widget `ACOS Production Signup` is configured for exact hostname `adora-commerce.com` in Managed mode with pre-clearance disabled; provider keys exist but their values are intentionally excluded from repository evidence |
| P06 | VERIFIED | Supabase Auth CAPTCHA protection is enabled with Cloudflare Turnstile and the secret is stored only in Supabase Auth; `ACOS Owner` owns the credential and the approved 90-day/emergency rotation process is frozen in `ACOS_PHASE_1B_PART8F_P06_TURNSTILE_CREDENTIAL_OPERATIONS.md` |
| P07 | VERIFIED | Owner-controlled Resend account contains the dedicated transactional domain `auth.adora-commerce.com` in Tokyo (`ap-northeast-1`); DNS verification remains separately gated by P09 and no API key, SMTP credential or email send was created |
| P08 | VERIFIED | Owner approved the exact authentication sender `ADORA Commerce <no-reply@auth.adora-commerce.com>`; no Reply-To, SMTP credential, API key or email send is implied |
| P09 | VERIFIED | Resend reports `auth.adora-commerce.com` verified; Cloudflare holds DNS-only DKIM, SPF and mail-from MX records, while `_dmarc.adora-commerce.com` resolves with the approved monitoring policy `p=none`; record values and authorization state are excluded from repository evidence |
| P10 | VERIFIED | Resend has no tracking subdomain, so click/open tracking is inactive; Supabase uses exact Site URL `https://adora-commerce.com`, the sole allowlist entry is `https://adora-commerce.com/auth/platform/callback`, the default template uses `{{ .ConfirmationURL }}`, and the server adapter enforces the same fixed callback |
| P11 | VERIFIED | Resend Free is at 0/3,000 monthly and 0/100 daily with no payment method or Free-plan overage; Supabase is Free with spend cap enabled, no payment method and a current two-email hourly Auth limit; current effective ACOS send is zero and the approved activation ceiling is one attempted signup email per hour |
| P12 | VERIFIED | Platform-signup server secrets, origin, fail-closed rollout controls, key version and the approved global limiter are configured in Vercel Production only; only the Turnstile sitekey is browser-exposed, provider secrets remain in Supabase, no SMTP credential exists and values are excluded from evidence |
| P13 | VERIFIED | `ACOS Owner` owns application/provider credential operations through the owner-controlled provider-account email; application secrets rotate every 90 days, emergency revocation is fail-closed, exposed values are never restored and the operating/rollback process is frozen in `ACOS_PHASE_1B_PART8F_P13_ROTATION_REVOCATION_OPERATIONS.md` |
| P14 | VERIFIED | `ACOS Owner` owns monitoring through Supabase Auth logs, Cloudflare Turnstile analytics, Vercel Production runtime logs and Resend transactional logs; privacy-safe thresholds and stop conditions are frozen, while the lack of a consolidated alert sink remains fail-closed until P15 validation |
| P15 | VERIFIED | The limited cohort is one dedicated Owner-controlled test mailbox; `ACOS Owner` owns the change, monitoring and rollback, with ordered fail-closed stages, mandatory stop conditions and a known fail-closed deployment rollback target; execution remains separately blocked and no email or rollout is claimed |
| P16 | PARTIAL | The approved encrypted temporary export and isolated commerce-core restore passed with exact public data/object/RLS fingerprints and verified cleanup; Free Plan still has no scheduled backup, and a standalone Postgres target could not prove compatible managed Auth/Storage recovery, so P15 remains blocked |

Summary:

```text
VERIFIED: 15
PARTIAL: 1
OWNER DECISION REQUIRED: 0
MISSING: 0
```

## Safety Disposition

```text
ACOS_PLATFORM_SIGNUP_ENABLED must remain false in production
ACOS_PLATFORM_SIGNUP_KILL_SWITCH must remain true in production
Vercel P12 values are Production-only and excluded from repository evidence
no Turnstile secret may leave Supabase Auth
no SMTP credential may leave Supabase Auth
no production email or public signup is authorized
no paid plan, payment method or overage is authorized
```

Local E2E flags do not represent production state. Production continues to
fail closed until the complete external gate is verified.

## Next Ordered Actions

1. Begin Phase 1C Storefront visibility and read-model contract review.
2. Build and validate the read-only Web app locally and in controlled preview.
3. Resume P16 managed Auth/Storage recovery before public launch, production
   email, real customer onboarding or real checkout/payment.

## Decision

`PARTIAL / PRODUCTION BLOCKER DEFERRED`

P01-P15 plans and the production database gate are ready. P16 commerce-core
recovery is validated, but full Auth/Storage recovery and recurring backup
evidence remain partial. Web app development may continue under the approved
read-only local/preview boundary; public signup and the P15 smoke test remain
blocked.

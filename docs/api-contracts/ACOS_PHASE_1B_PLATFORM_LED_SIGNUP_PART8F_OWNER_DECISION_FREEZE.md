# Phase 1B Part 8F Owner Decision Freeze

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-OWNER-FREEZE`
**Status:** OWNER APPROVED / POLICY FROZEN / EXTERNAL VALUES PENDING
**Approval Date:** 2026-07-29
**P08 External Value Approval Date:** 2026-07-31
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Approval Scope

The Owner approves the safe production-readiness policy for P01-P16. This
approval freezes how each external value must be selected and validated. It
does not invent, create or verify a domain, provider account, project, sender,
DNS record or secret.

## Frozen Decisions

| ID | Owner-approved decision | External value/evidence state |
|---|---|---|
| P01 | Use `https://adora-commerce.com` as the canonical HTTPS application origin with no wildcard, path, query or fragment; `https://adora-commerce-os.vercel.app` is a deployment/temporary domain and must not be treated as canonical | Owner approved and exact origin frozen |
| P02 | Use one dedicated Vercel production project; preview deployments use isolated test configuration | Project creation/link evidence pending |
| P03 | Use one dedicated hosted Supabase production project; never reuse local or preview data | Project reference and region pending |
| P04 | Supabase Site URL equals P01 and the allowlist contains the exact P01 platform callback only | Configuration evidence pending P01/P03 |
| P05 | Use a dedicated production Turnstile widget restricted to the P01 hostname | Widget/sitekey evidence pending P01 |
| P06 | Store the Turnstile secret only in Supabase Auth CAPTCHA configuration | Secret destination approved; configuration/rotation evidence pending |
| P07 | Use Resend Custom SMTP Free with a dedicated transactional sending domain | Account and exact domain pending |
| P08 | Use the exact dedicated Auth identity `ADORA Commerce <no-reply@auth.adora-commerce.com>` | Owner approved and exact sender identity frozen |
| P09 | Require verified SPF and DKIM plus DMARC monitoring before rollout | DNS evidence pending |
| P10 | Disable provider link tracking and preserve the exact Auth callback | Provider configuration evidence pending |
| P11 | Keep approved spend at USD 0, disable paid overage and keep ACOS limits below current provider/Auth limits | Current quota evidence pending |
| P12 | Store application server secrets in Vercel Production only; store CAPTCHA/SMTP secrets in Supabase only; expose only the Turnstile sitekey publicly | Destination map approved; project-specific evidence pending |
| P13 | Rotate application secrets every 90 days and provider secrets after suspected exposure, owner change or provider incident; revoke before replacement during emergencies | Named operational owner and contact pending |
| P14 | Monitor Auth failures, CAPTCHA failures, limiter denials and email delivery failures without logging recipients, tokens or secrets | Monitoring destination and alert owner pending |
| P15 | Roll out to an Owner-approved smoke-test cohort first; keep signup disabled and kill switch active until evidence passes; rollback by enabling the kill switch | Cohort and operational owner pending |
| P16 | Require an approved production backup policy and successful restore-drill disposition before public signup | Backup/restore evidence pending |

## Secret Classification

| Value | Approved destination |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel Production public environment |
| `ACOS_PLATFORM_APP_ORIGIN` | Vercel Production server environment |
| `ACOS_SIGNUP_ABUSE_HASH_SECRET` | Vercel Production server secret |
| `ACOS_PLATFORM_CALLBACK_STATE_SECRET` | Vercel Production server secret |
| Turnstile secret | Supabase Auth CAPTCHA configuration only |
| Resend SMTP credential | Supabase Auth Custom SMTP configuration only |
| Supabase service-role/secret key | Vercel Production server secret only |

Production secrets are forbidden from GitHub, browser bundles, local
development, CI logs and preview deployments.

## Cost And Rollout Freeze

- recurring provider spend remains `USD 0`;
- no payment method, paid plan, overage or add-on is authorized;
- no production email may be sent before sender and DNS evidence passes;
- no public signup may be enabled before all external evidence passes;
- `ACOS_PLATFORM_SIGNUP_ENABLED=false` and
  `ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true` remain the rollout defaults.

## Unresolved External Values

The remaining concrete values and evidence are:

1. P10 provider link-tracking and callback-integrity evidence;
2. P11 current provider quota evidence;
3. P12 project-specific secret destination evidence;
4. P13-P16 named operational owners, monitoring, rollout and recovery evidence.

## Decision

`OWNER APPROVED / POLICY FROZEN / EXTERNAL VALUES PENDING`

Production remains `BLOCKED`. The next step is to collect and approve the
concrete external values and evidence without committing any secret.

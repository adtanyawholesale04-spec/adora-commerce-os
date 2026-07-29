# Phase 1B Platform-Led Signup Part 8F Production Readiness Gate

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F`
**Status:** BLOCKED / OWNER INPUTS REQUIRED
**Review Date:** 2026-07-29
**Runtime:** Production disabled
**Migration:** None
**Approved Provider Spend:** USD 0

## Objective

Determine whether the locally validated platform-led signup boundary can be
configured for an online production environment without guessing external
values, exposing secrets, widening redirects or creating unapproved provider
spend.

Approval to run this review does not approve deployment or public signup.

## Repository Gates

| Gate | Result | Evidence |
|---|---|---|
| Local E2E | PASS | Part 8E signup, email confirmation, PKCE, bootstrap, isolation and Admin Auth regression |
| Static validation | PASS | lint, typecheck, 125 tests and production build |
| Supabase validation | PASS | security, workflows, rate-limit concurrency, carrier webhook and commerce integration |
| Production fail-closed | PASS | local flow rejects `NODE_ENV=production` |
| Canonical origin parser | PASS | production requires one exact HTTPS origin |
| Secret separation | PASS | repository contains names/placeholders only; local secrets remain ignored |
| Migration requirement | NONE | Part 8F requires no schema change |

## Blocking Owner Inputs

The following values and evidence are absent and must not be inferred:

| ID | Required input | Acceptance evidence |
|---|---|---|
| P01 | Canonical production origin | One exact Owner-approved HTTPS origin with no path, query, fragment or wildcard |
| P02 | Hosting environment | Approved production project and environment; previews remain isolated |
| P03 | Supabase production project | Approved project reference and region; no local or preview database reuse |
| P04 | Auth URL configuration | Site URL equals P01; exact `/auth/platform/callback` allowlist entry |
| P05 | Turnstile production widget | Dedicated widget with only the P01 hostname; no localhost or wildcard hostname |
| P06 | Turnstile secret destination | Supabase Auth CAPTCHA configuration only, with named owner and rotation process |
| P07 | Resend account and domain | Approved account and dedicated transactional sending domain |
| P08 | Sender identity | Exact Owner-approved From address and sender name |
| P09 | DNS verification | SPF and DKIM verified; DMARC monitoring policy recorded |
| P10 | Auth link integrity | Provider link tracking disabled and confirmation callback preserved |
| P11 | Quota posture | Current Resend and Supabase Auth limits reviewed; ACOS limits remain lower and paid overage disabled |
| P12 | Deployment secret map | Named destinations for server secrets and public sitekey; no production secret in local, CI or preview |
| P13 | Rotation and revocation | Owner, cadence, emergency revoke steps and rollback contacts recorded |
| P14 | Monitoring | Auth failure, CAPTCHA failure, rate-limit denial and email-delivery alert ownership |
| P15 | Rollout and rollback | Limited test cohort, kill-switch procedure and rollback acceptance criteria |
| P16 | Recovery prerequisite | Production backup policy and restore drill disposition recorded before public rollout |

## Frozen Production Configuration Shape

After P01-P16 are approved, configuration must preserve these boundaries:

- `ACOS_PLATFORM_APP_ORIGIN` is exactly P01 and is server-controlled;
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` contains only the production public sitekey;
- the Turnstile secret exists only in Supabase Auth CAPTCHA configuration;
- SMTP credentials exist only in Supabase Auth Custom SMTP configuration;
- `ACOS_SIGNUP_ABUSE_HASH_SECRET` and
  `ACOS_PLATFORM_CALLBACK_STATE_SECRET` are independent server-only secrets;
- production, preview and local environments use separate credentials;
- production Auth uses exact redirects, never wildcard preview URLs;
- `ACOS_PLATFORM_SIGNUP_ENABLED` remains false until the final smoke test;
- `ACOS_PLATFORM_SIGNUP_KILL_SWITCH` remains true until the final rollout
  approval.

No secret value may be committed to the repository, copied into browser code,
stored in the database, included in audit payloads or printed in validation
output.

## Validation Required After Inputs Exist

1. verify HTTPS origin and exact Supabase Auth redirect configuration;
2. verify Turnstile hostname and invalid/replayed token rejection;
3. send Auth confirmation only to approved production smoke-test recipients;
4. verify From identity, SPF, DKIM, DMARC posture and unchanged callback link;
5. verify generic duplicate-account and provider-failure responses;
6. verify durable IP, destination and global limits remain below provider caps;
7. verify production secrets are absent from preview, CI, browser bundles and
   logs;
8. run migration replay, Supabase security/workflow, lint, typecheck, tests and
   production build;
9. exercise kill switch and rollback before enabling a limited cohort;
10. record evidence without recipient addresses, tokens, credentials or private
    onboarding data.

## Decision

`BLOCKED`

The repository boundary is ready for external configuration review, but
production rollout cannot begin until P01-P16 are Owner-approved and verified.
No production account, provider configuration, DNS change, deployment, email or
spend was created by this gate.

## Next

Owner Decision Freeze for Part 8F inputs P01-P16, followed by external
configuration validation. Public signup remains disabled.

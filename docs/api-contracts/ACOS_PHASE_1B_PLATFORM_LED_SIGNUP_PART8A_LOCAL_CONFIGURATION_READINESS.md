# Phase 1B Platform-Led Signup Part 8A Local Configuration Readiness

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8A`
**Status:** IMPLEMENTED / VALIDATED
**Supabase CLI:** `2.109.1` pinned project dependency
**Local Stack:** Running
**Mailpit:** `http://127.0.0.1:54324`
**Runtime:** Disabled
**Migration:** None
**Validation Date:** 2026-07-29

## Task Envelope

```text
PROJECT: ADORA Commerce OS
TRACK: Track B Customer Engagement
MODULE: Phase 1B Platform-Led Signup
PHASE: 1B Part 8A
TASK ID: PHASE-1B-PLATFORM-SIGNUP-PART8A

OBJECTIVE:
Align local Supabase Auth and environment contracts with frozen Parts 7A-7D.

ALLOWED:
supabase/config.toml
.env.example
readiness documentation and static tests

FORBIDDEN:
migration
production provider configuration
real secret or recipient
signup/callback/onboarding route
public runtime enablement
customer, organization, consent or payment side effect
```

## Readiness Findings

| Check | Before | Result |
|---|---|---|
| Supabase CLI | Project-pinned `2.109.1` | Ready; `2.110.0` update is available but not introduced mid-part |
| Local stack | Running | Ready |
| Mailpit | Enabled on port `54324` | Ready; capture only |
| Auth Site URL | `http://127.0.0.1:3000` | Reconciled to frozen `http://localhost:3000` |
| Existing callback | Not exactly allowlisted | Preserved as `http://localhost:3000/auth/callback` |
| Platform callback | Not allowlisted | Added as exact `http://localhost:3000/auth/platform/callback` |
| Email confirmation | Disabled locally | Enabled to match confirmed-email contract |
| Password minimum | 6 | Raised to 8 |
| Anonymous sign-in | Disabled | Ready |
| SMS signup | Disabled | Ready |
| CAPTCHA | Not configured | Deferred to the local runtime part; signup runtime stays disabled |
| Production SMTP | Not configured | Ready; local Mailpit remains the only delivery boundary |

The CLI update is intentionally deferred. A dependency update requires its own
changelog review and validation rather than changing the stack version during
configuration reconciliation.

## Exact Local Auth Contract

```text
Site URL:
http://localhost:3000

Allowed redirects:
http://localhost:3000/auth/callback
http://localhost:3000/auth/platform/callback
```

No wildcard, HTTPS localhost, `127.0.0.1:3000`, alternate port or external
origin is approved.

The existing `/auth/callback` remains available for Admin/member-invite
behavior. Platform signup uses its separate callback and must not overload the
existing route.

## Environment Contract

`.env.example` declares names and safe disabled defaults only:

| Variable | Exposure | Purpose |
|---|---|---|
| `ACOS_PLATFORM_SIGNUP_ENABLED` | Server-only | Explicit feature enablement; default `false` |
| `ACOS_PLATFORM_SIGNUP_KILL_SWITCH` | Server-only | Emergency stop; default `true` |
| `ACOS_PLATFORM_APP_ORIGIN` | Server-only | Canonical trusted origin |
| `ACOS_SIGNUP_ABUSE_HASH_SECRET` | Server-only secret | HMAC pepper; empty in example |
| `ACOS_SIGNUP_ABUSE_HASH_KEY_VERSION` | Server-only | Pepper rotation version |
| `ACOS_PLATFORM_CALLBACK_STATE_SECRET` | Server-only secret | Callback-state signing; empty in example |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Browser-safe public value | Turnstile widget sitekey; empty until Part 8D |

The Turnstile secret remains owned by Supabase Auth and is deliberately absent
from ACOS environment files.

## Configuration Decisions

- Email/password signup remains enabled in the local Auth service so the future
  local E2E can exercise it.
- ACOS runtime remains disabled through the server feature flag and kill switch.
- Confirmed email is required before platform bootstrap.
- Mailpit captures local Auth email; no Resend configuration exists locally.
- CAPTCHA is not enabled in `config.toml` until the local widget/test-key
  implementation can be validated end to end.
- No production origin, SMTP credential or Turnstile secret is configured.

## Validation Evidence

- pinned CLI reports `2.109.1`;
- local stack reports API, Studio and Mailpit healthy;
- config uses the exact frozen Site URL and callback allowlist;
- email confirmation, password minimum and disabled anonymous/SMS settings are
  statically validated;
- example environment contains no secret values;
- no migration or application route was added;
- static project gates pass.

## Reviewed Official Sources

- Supabase CLI configuration:
  `https://supabase.com/docs/guides/local-development/cli/config`
- Supabase local CLI and Mailpit:
  `https://supabase.com/docs/guides/local-development/cli/getting-started`
- Supabase password Auth:
  `https://supabase.com/docs/guides/auth/passwords`
- Supabase Auth changelog:
  `https://supabase.com/changelog?tags=auth`

# Phase 1B Part 8D Local Signup, Callback And Onboarding Skeleton

**Status:** IMPLEMENTED / VALIDATED
**Runtime:** LOCAL-ONLY / DISABLED BY DEFAULT
**Migration:** None

## Implemented Flow

```text
/signup
-> guarded server action
-> local availability and kill-switch check
-> durable IP, destination and global limiter
-> signed HttpOnly callback-state cookie
-> Supabase Auth signUp with Turnstile token
-> Mailpit confirmation
-> /auth/platform/callback
-> PKCE exchange and network-verified confirmed user
-> Part 4 guarded account bootstrap
-> /onboarding private read-only snapshot
```

The existing `/auth/callback` remains unchanged and continues to own Admin and
member-invite behavior.

## Local-Only Controls

- Runtime requires `NODE_ENV` to be non-production.
- `ACOS_PLATFORM_APP_ORIGIN` must be exactly `http://localhost:3000`.
- `ACOS_PLATFORM_SIGNUP_ENABLED=true` and
  `ACOS_PLATFORM_SIGNUP_KILL_SWITCH=false` must both be explicit.
- Missing adapter configuration, secrets or rate-limit thresholds fails closed.
- The checked-in `.env.example` remains disabled and contains no secret value.
- Production cannot be enabled by these Part 8D controls.

## CAPTCHA And Email

Supabase Auth is the single Turnstile validation owner. Local `config.toml`
enables Turnstile and reads `SUPABASE_AUTH_CAPTCHA_SECRET` from the CLI process
environment. ACOS stores only the public sitekey in
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` and forwards each transient token once to
Supabase Auth.

Use Cloudflare's published local test pair only:

- sitekey `1x00000000000000000000AA` in the ACOS local environment;
- test secret `1x0000000000000000000000000000000AA` in the Supabase CLI process
  environment.

The test pair is forbidden in production. Confirmation email remains captured
by local Mailpit; ACOS sends no email itself.

## Callback And Retry

- Callback intent is isolated in `acos_platform_signup_state`.
- The cookie is `HttpOnly`, `SameSite=Lax`, path-limited to the dedicated
  platform callback and expires after 15 minutes.
- Callback state has a fixed schema, HMAC signature and expiry.
- Redirects are fixed to `/signup`, `/auth/platform/callback` or `/onboarding`.
- A persistence failure retains state and returns to signup with an explicit
  callback retry link. The existing verified cookie session allows bootstrap
  repair without consuming the PKCE code again and avoids an automatic redirect
  loop.
- State is deleted only after successful bootstrap.

## Privacy And Non-Scope

Part 8D creates no new schema and no duplicate source of truth. The approved
bootstrap may create/reuse only the existing private platform profile,
onboarding, acquisition and account-created event projections.

Part 8D does not create:

- organization or organization membership;
- tenant customer or customer-profile link;
- marketing consent;
- public profile publication;
- order, payment, payout, ledger or provider spend.

The onboarding screen is read-only. Interest, Community Terms, profile draft
and completion writes remain unavailable.

## Validation

- local-only and production fail-closed assertions;
- server action and dedicated callback isolation;
- HttpOnly callback-state cookie and retry behavior;
- CAPTCHA single-owner and widget reset assertions;
- verified-user and private onboarding read assertions;
- no direct browser database write or privileged secret exposure;
- existing Admin/member-invite callback regression;
- lint, typecheck, tests and production build.

## Next

Phase 1B Part 8E runs the complete local E2E suite with the local Supabase
stack, Mailpit and Cloudflare test credentials. Production remains blocked until
Part 8F.

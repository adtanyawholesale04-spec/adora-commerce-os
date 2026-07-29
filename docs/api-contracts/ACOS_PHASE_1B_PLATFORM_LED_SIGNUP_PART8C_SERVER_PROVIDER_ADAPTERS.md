# Phase 1B Part 8C Server Provider Adapters

**Status:** IMPLEMENTED / VALIDATED

## Scope

Part 8C implements the server-only adapters behind the provider-neutral signup
ports. It does not add a public route, signup page, callback route or onboarding
screen, and it does not enable the signup feature.

Implemented boundaries:

- peppered, domain-separated HMAC derivation for IP, destination and global
  limiter identities;
- durable three-scope rate limiting through
  `api_consume_platform_signup_rate_limit`;
- signed, size-bounded, short-lived callback state with an exact field
  allowlist;
- canonical application origin and callback URL derived only from trusted
  server configuration;
- Supabase Auth email/password signup using `captchaToken` and the approved
  callback URL;
- PKCE code exchange followed by network-verified `getUser`;
- Part 4 account bootstrap service adaptation using the server-only admin
  client;
- fail-closed configuration, provider and persistence error handling.

## Privacy And Security

- Browser-facing request contracts carry the raw request IP and normalized
  destination only into server orchestration; browsers do not choose persisted
  hashes.
- Raw IP and email are converted to HMAC digests before the limiter RPC.
- The HMAC pepper, callback signing key and Supabase privileged key remain
  server-only.
- Turnstile validation remains single-owner in Supabase Auth. This adapter does
  not call the Turnstile verification endpoint.
- Callback state is integrity-protected, field-allowlisted and valid for no
  longer than 15 minutes. The Part 8D route must store it in a signed
  `HttpOnly`, `SameSite=Lax`, secure-in-production cookie.
- The adapter factory is request-scoped because the callback session gateway
  retains the cookie-backed Supabase client between code exchange and verified
  user lookup.

## Required Server Configuration

- `ACOS_PLATFORM_APP_ORIGIN`
- `ACOS_SIGNUP_ABUSE_HASH_SECRET`
- `ACOS_SIGNUP_ABUSE_HASH_KEY_VERSION`
- `ACOS_PLATFORM_CALLBACK_STATE_SECRET`
- IP, destination and global rate-limit window and attempt-limit variables
  listed in `.env.example`
- existing Supabase URL, publishable key and privileged server key variables

Secrets must contain at least 32 UTF-8 bytes. Missing, malformed or out-of-range
configuration fails closed.

## Runtime State

`ACOS_PLATFORM_SIGNUP_ENABLED=false` and
`ACOS_PLATFORM_SIGNUP_KILL_SWITCH=true` remain the checked-in defaults. No
route invokes these adapters in Part 8C.

## Validation

- TypeScript typecheck;
- server-only import and secret-boundary assertions;
- HMAC, rate-limit scope and bounded configuration assertions;
- callback signature, size, field and expiry assertions;
- Supabase Auth CAPTCHA, redirect, PKCE and verified-user assertions;
- bootstrap reuse and absence-of-route assertions;
- full static project gates.

## Next

Phase 1B Part 8D may add the local signup, callback and onboarding skeleton.
Production configuration and enablement remain blocked until Part 8F.

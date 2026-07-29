# Phase 1B Platform-Led Signup Part 5 Owner Decision Freeze

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART5-OWNER-FREEZE`
**Status:** OWNER APPROVED / FROZEN
**Approval Date:** 2026-07-29
**Migration:** None

## Owner Approval

The Project Owner approved decisions A01-A24 from
`ACOS_PHASE_1B_PLATFORM_LED_SIGNUP_PART5_AUTH_CALLBACK_CONTRACT_REVIEW.md`
in full using every recommended safe value.

The frozen direction includes:

- email and password only for the initial signup method;
- required confirmed email before bootstrap and onboarding;
- phone and OAuth/social signup deferred;
- guarded server Auth request using the publishable key;
- production CAPTCHA and layered durable abuse controls;
- generic duplicate-account responses;
- a dedicated platform PKCE callback intent;
- signed short-lived HTTP-only callback state;
- server-generated idempotency and sanitized acquisition evidence;
- private onboarding redirects only;
- no tenant, identity-merge, customer, consent or monetization side effects;
- no raw Auth, destination, CAPTCHA or session secrets in logs;
- unchanged Admin login and member invitation callback behavior.

Any change to A01-A24 requires a new explicit Owner decision record.

## Provider And Deployment Selection Gate

This approval freezes the requirement for the controls below. It does not select
a vendor, paid plan, secret, storage endpoint or production domain:

1. CAPTCHA provider and secret-management boundary;
2. production SMTP/email provider and cost policy;
3. durable shared rate-limit adapter/storage;
4. production Site URL and exact redirect allowlist.

These selections remain **DECISION REQUIRED** because they involve external
providers, secrets, cost or production routing. Built-in Supabase email may be
used only for bounded local development and is not approved as the production
delivery contract.

## Execution Gate

Phase 1B Part 6 may begin only with provider-neutral implementation that remains
disabled and cannot send production email or expose a callback publicly.

Production-capable Auth signup, provider configuration and public rollout remain
**BLOCKED** until all four provider/deployment selections are explicitly
approved.

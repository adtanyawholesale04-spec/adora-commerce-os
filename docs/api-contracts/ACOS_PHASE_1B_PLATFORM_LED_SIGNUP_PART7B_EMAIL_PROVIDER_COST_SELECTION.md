# Phase 1B Platform-Led Signup Part 7B Email Provider And Cost Selection

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART7B`
**Status:** OWNER APPROVED / FROZEN
**Local Provider:** Supabase CLI Mailpit
**Production Provider:** Resend Custom SMTP
**Initial Plan:** Resend Free
**Approved Monthly Spend:** USD 0
**Approval Date:** 2026-07-29
**Migration:** None

## Selection

Local development uses the Mailpit service included with the Supabase CLI local
stack. Local Auth messages are captured for inspection and must not be delivered
to real recipients.

The selected future production delivery boundary is Resend connected to
Supabase Auth through Custom SMTP. Supabase Auth remains the template, token and
confirmation-flow owner. ACOS does not send signup confirmation email directly.

This approval selects the provider and cost policy only. It does not create a
Resend account, verify a domain, configure DNS, create a credential, change
Supabase Auth settings or send an email.

## Cost Policy

- Begin with the Resend Free transactional plan.
- Approved recurring email-provider spend is `USD 0`.
- Paid-plan upgrade, payment method, overage or add-on activation requires a new
  explicit Owner approval.
- Signup must fail closed or pause when an approved provider limit is reached;
  it must not silently create paid usage.
- Provider quotas and prices must be rechecked against current official terms
  before production configuration because they can change.
- As reviewed on 2026-07-29, the Free plan publishes 3,000 transactional emails
  per month and 100 per day. These figures are planning ceilings, not an ACOS
  entitlement or guaranteed capacity.
- ACOS operational limits must remain below the provider ceiling and the
  Supabase Auth email rate limit.

## Secret And Sender Boundary

- SMTP credentials live only in Supabase Auth Custom SMTP configuration.
- SMTP passwords/API keys are forbidden from the browser, repository, ACOS
  application environment, logs, callback state, audit payloads and database.
- Use a dedicated least-privilege provider credential for the Supabase project.
- Production requires an Owner-approved sending domain and sender address.
- Configure SPF and DKIM before production; add DMARC monitoring before public
  rollout.
- Authentication email uses a dedicated sender identity and must not share
  marketing campaigns or marketing contact lists.
- Disable provider link tracking for Auth messages so confirmation links are
  not rewritten.

The exact production sending domain and `From` address are deferred with the
production application domain. No placeholder sender is approved.

## Delivery And Privacy Policy

- Email confirmation remains required.
- Messages contain only the minimum Auth action and fixed product identity.
- Do not include display name, acquisition evidence, interests, organization
  data, customer data or private onboarding state.
- Do not copy confirmation content or recipient addresses into ACOS audit
  payloads.
- Provider delivery logs follow the selected plan's retention and must be
  reviewed before production.
- Generic browser responses must not reveal whether an email address already
  exists or whether provider delivery succeeded.
- A provider failure maps to controlled `auth_unavailable`; account/bootstrap
  side effects must not bypass confirmed-email requirements.

## Environment Policy

| Environment | Delivery |
|---|---|
| Local | Supabase CLI Mailpit capture only |
| Preview/staging | Dedicated test provider configuration and approved test recipients only |
| Production | Resend Custom SMTP after domain, DNS, secret and exact URL approval |

Production credentials must never be used by local, CI or arbitrary preview
deployments.

## Current Runtime Gate

The following remain blocked after Part 7B:

- Resend account and domain setup;
- production sender identity and DNS verification;
- SMTP secret creation/configuration;
- exact production application origin;
- durable rate-limit migration and adapter;
- dedicated platform callback/onboarding routes;
- public signup enablement.

## Validation Required Before Runtime

- Mailpit captures local confirmation without external delivery;
- custom SMTP credential is absent from repo, browser and ACOS environment;
- sender-domain SPF/DKIM and DMARC posture;
- confirmation link uses the exact approved callback;
- link tracking is disabled;
- provider daily/monthly and Supabase Auth rate-limit behavior;
- no paid overage and fail-closed quota exhaustion;
- duplicate-account response privacy;
- provider outage and retry behavior;
- unchanged Admin/member-invite Auth flows;
- static, typecheck, production build and Auth integration gates.

## Reviewed Official Sources

- Supabase Custom SMTP:
  `https://supabase.com/docs/guides/auth/auth-smtp`
- Supabase password Auth and local Mailpit:
  `https://supabase.com/docs/guides/auth/passwords`
- Resend pricing:
  `https://resend.com/docs/knowledge-base/what-is-resend-pricing`
- Resend SMTP:
  `https://resend.com/docs/send-with-smtp`

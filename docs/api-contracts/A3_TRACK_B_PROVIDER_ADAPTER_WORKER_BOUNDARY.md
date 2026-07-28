# Track B Provider Adapter / Worker Boundary

**Task:** `ENG-MSG-001`
**Status:** `IMPLEMENTED / PROVIDER RUNTIME BLOCKED`
**Track:** Track B — Customer Engagement Platform

## Boundary

The provider worker contract is implemented as a typed, dependency-injected skeleton:

- `src/lib/messaging/provider-adapter.ts` defines channel-specific adapter inputs and sanitized results;
- `src/lib/messaging/worker.ts` reserves usage before calling an adapter;
- provider failure is recorded as a delivery attempt while the prior quota reservation remains attempted spend;
- `api_record_message_delivery_attempt` persists append-only delivery evidence and updates job status;
- no provider SDK, credentials, endpoint, or browser bundle integration is added.

## Required Sequence

```text
worker loads durable message job
  -> adapter readiness check
  -> api_reserve_message_job_usage
  -> provider adapter send
  -> guarded delivery-attempt persistence
```

The worker does not bypass reservation, does not retry the meter, and does not expose raw provider errors or secrets.

## Current Blockers

- provider-specific contracts for LINE, SMS, and Email;
- server-only credentials/secret configuration;
- worker scheduling/queue runtime;
- integration tests against approved provider adapters.

## Explicit Non-Goals

- no real provider call;
- no credentials;
- no synchronous browser send;
- no direct table write;
- no billing or quota refund behavior.

**NEXT:** Connect a selected provider through server-only configuration and provider fixtures, then enable a queue worker after end-to-end validation.

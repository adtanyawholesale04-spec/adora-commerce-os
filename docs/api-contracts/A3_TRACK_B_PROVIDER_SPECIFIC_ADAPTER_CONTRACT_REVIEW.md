# Track B Provider-Specific Adapter Contract Review

**Task:** `ENG-MSG-002`
**Status:** `APPROVED / FIXTURE IMPLEMENTED / PROVIDER RUNTIME PENDING`
**Track:** Track B — Customer Engagement Platform
**Depends on:** Messaging reservation boundary 050 and Provider Adapter / Worker skeleton

## Purpose

กำหนด contract กลางสำหรับ LINE, SMS และ Email ก่อนเลือก provider จริง โดยไม่ผูกระบบกับ SDK, credential format หรือ provider-specific payload ใน core workflow

## Common Adapter Contract

Every adapter must implement:

```text
providerCode
channel: LINE | SMS | EMAIL
isReady(): boolean
send(request): ProviderSendResult
```

The worker must:

1. load a durable `message_job` inside the tenant boundary;
2. call the validated usage reservation boundary;
3. pass only the normalized destination and safe payload to the adapter;
4. record a sanitized delivery attempt;
5. reuse the same channel reservation on retry;
6. never expose provider secrets or raw provider error bodies.

## Channel Contracts

| Channel | Destination contract | Payload contract | Provider result required |
|---|---|---|---|
| LINE | normalized LINE user/channel reference; no raw secret | approved template/message object; size limits owned by provider adapter | provider message ID, accepted/failed, safe code |
| SMS | normalized E.164-like destination reference; raw number stays server-side | text/template payload; length/encoding rules owned by adapter | provider message ID, accepted/failed, safe code |
| EMAIL | normalized recipient reference; no credential or raw address in logs | subject/template/body contract; HTML/text policy owned by adapter | provider message ID, accepted/failed, safe code |

## Result Normalization

Adapters return only:

```text
status: SENT | FAILED
provider_message_id: string | null
failure_code: safe stable code | null
failure_reason: sanitized short summary | null
response_metadata: safe JSON object | null
```

The core workflow must not depend on provider-specific status names, retry headers, response bodies, or SDK error classes.

## Retry and Failure Rules

- Quota reservation happens before `send`.
- Provider failure after reservation is attempted spend; no automatic usage refund is performed.
- Transient/permanent classification is adapter-owned but must produce a stable safe failure code.
- The same message job may create later delivery attempts, but must not create another usage reservation.
- Provider message IDs are stored only in delivery-attempt persistence, never in usage metadata.

## Secret Boundary

- Provider credentials live in server-only secret management or encrypted deployment configuration.
- Provider SDKs must not be imported into browser bundles.
- `providerCode`, safe status, and safe failure code may be logged.
- Raw credentials, authorization headers, destination secrets, and raw provider payloads must not be logged or persisted.

## Provider Selection Decisions Required

| Decision | Recommendation | Owner decision |
|---|---|---|
| LINE provider | Start with one provider adapter behind the common interface; keep provider code configurable | PENDING |
| SMS provider | Start with one provider adapter behind the common interface; keep provider code configurable | PENDING |
| Email provider | Start with one provider adapter behind the common interface; keep provider code configurable | PENDING |
| Credential storage | Server-only environment/secret manager; no PostgreSQL credential table | APPROVED DIRECTION |
| Delivery status truth | Provider delivery attempts are operational evidence; usage remains attempted spend | APPROVED |
| Retry ownership | Worker/orchestrator owns retry classification and backoff | PENDING |
| Payload templates | Provider adapter validates channel-specific size/encoding; core stores safe template intent | PENDING |

Owner approval recorded on 2026-07-29: all recommended values above approved. Provider names remain configuration decisions and no real provider is enabled by this approval.

## Current Blockers

- provider names and API contracts are not frozen;
- credential/configuration deployment target is not selected;
- delivery-attempt persistence RPC is not implemented;
- queue/worker runtime and retry backoff are not implemented.

## Explicit Non-Goals

- No provider SDK installation.
- No credentials or secret values.
- No real provider request.
- No browser send path.
- No billing, quota refund, or provider settlement.

**NEXT:** Implement guarded delivery-attempt persistence, then connect a selected provider through server-only configuration and provider fixtures.

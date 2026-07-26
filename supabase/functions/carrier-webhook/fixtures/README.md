# Carrier Webhook Fixtures

These sample payloads exercise the provider adapters in `carrier-adapters.ts`.

Use HMAC SHA-256 over the exact raw request body and send it as:

```text
x-carrier-signature: sha256=<hex_digest>
x-carrier-provider: flash
idempotency-key: <provider_event_id>
```

Supported fixture provider codes:

```text
flash
kerry
jandt
thailand_post
```

The provider contracts here are adapter fixtures for integration validation. Replace or extend them with the exact carrier production contracts once each account's webhook spec is confirmed.

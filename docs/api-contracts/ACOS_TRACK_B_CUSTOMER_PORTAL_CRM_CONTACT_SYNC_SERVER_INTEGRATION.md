# Track B Customer Portal CRM Contact Sync Server Integration

**Task ID:** `PORTAL-P1-PART5-CRM-CONTACT-SYNC-PART3`
**Status:** IMPLEMENTED / VALIDATED

## Flow

`applyVerifiedCustomerContactChange` remains a `server-only` service boundary.
After Auth Admin has the verified contact and the request is `APPLIED`, it calls
`api_sync_applied_customer_contact_to_crm`.

```text
VERIFIED request
  -> Auth Admin lookup/update
  -> api_apply_customer_contact_change
  -> api_sync_applied_customer_contact_to_crm

APPLIED retry
  -> skip Auth provider update
  -> api_sync_applied_customer_contact_to_crm
```

The second path closes the retry gap where Auth succeeded but CRM sync did not
complete.

## Result Contract

Auth application and CRM synchronization are reported separately. Once Auth is
`APPLIED`, a CRM error never reports that Auth was rolled back.

```text
ok: true
status: APPLIED
alreadyApplied: boolean
crmSyncResult:
  synced
  already_matching
  contact_request_not_applied
  customer_link_not_active
  customer_not_active
  crm_contact_conflict
  crm_duplicate_contact_conflict
  persistence_error
crmSyncRetryable: boolean
```

`persistence_error` is sanitized and retryable. Business conflicts remain
controlled non-retryable results requiring the appropriate operational review.

## Controls

- The module imports `server-only`.
- It uses the existing Auth Admin client with server-only secret configuration.
- No server action, route handler, or browser callable is added.
- No raw contact value, provider error, or database error is returned.
- The CRM RPC rechecks tenant, ownership, lifecycle and conflict rules.
- Consent, suppression, identity and messaging behavior remain unchanged.

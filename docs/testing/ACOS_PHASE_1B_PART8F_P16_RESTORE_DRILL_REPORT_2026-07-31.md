# Phase 1B Part 8F P16 Restore Drill Report

**Task ID:** `PHASE-1B-PLATFORM-SIGNUP-PART8F-P16-DRILL`
**Execution Date:** 2026-07-31
**Status:** PARTIAL / COMMERCE CORE RESTORE VALIDATED / FULL SERVICE RESTORE BLOCKED
**Production Writes:** None
**Migration:** None
**Approved Provider Spend:** USD 0

## Approved Scope

The Owner approved:

1. an encrypted temporary backup destination outside Git with deletion after
   the drill; and
2. a read-only production export followed by restore into an isolated Docker
   database.

The approval did not authorize a production restore, paid provider upgrade,
public signup, email send or retention of private backup artifacts.

## Safety Controls

```text
production access: READ ONLY
restore target: LOCAL DOCKER / NETWORK NONE
Postgres major version: 17
host backup encryption: AES-256-CBC + HMAC-SHA256
key protection: WINDOWS DPAPI / CURRENT USER
checksum verification: PASS
Git backup artifacts: NONE
production secret values recorded: NONE
customer/Auth rows recorded: NONE
```

Plaintext dump files were removed from the host immediately after verified
transfer to the isolated restore target. The restore container, encrypted
artifacts, protected key and temporary logs were deleted after validation.

## Production Coverage Snapshot

Privacy-safe aggregate inspection returned:

```text
public base tables: 155
public total rows: 73
auth users: 0
auth audit rows: 0
storage buckets: 0
storage objects: 0
```

No customer, Auth, recipient, object or raw business row was read into
repository evidence.

## Restore Results

| Scope | Result | Evidence |
|---|---|---|
| Cluster roles | PASS WITH TARGET COMPATIBILITY PRECONDITION | The isolated image required the managed `supabase_realtime_admin` role before the role dump could be applied |
| Public schema | PASS | Schema restore completed without error |
| Public data | PASS | 155 tables and 73 total rows match Production |
| Public functions | PASS | 65 objects and the metadata fingerprint match Production |
| Public RLS policies | PASS | 545 policies and the metadata fingerprint match Production |
| Public triggers | PASS | 86 triggers and the metadata fingerprint match Production |
| Public RLS enablement | PASS | RLS is enabled on all 155 public tables and the state fingerprint matches Production |
| Auth data coverage | ZERO-DATA VERIFIED | Production currently has zero Auth users and zero Auth audit rows |
| Storage coverage | ZERO-DATA VERIFIED | Production currently has zero buckets and zero objects |
| Full managed Auth restore | BLOCKED | The standalone Postgres image did not contain the current managed Auth `audit_log_entries.ip_address` column expected by the production data export |
| Full Supabase service restore | NOT PROVEN | A target with compatible managed Auth/Storage services was not available in this zero-cost isolated drill |
| Temporary artifact deletion | PASS | Restore container and the complete temporary drill directory were removed |

The failed full-data step stopped at the managed Auth table before public data
was applied. Public data was then exported explicitly from the `public` schema
and restored without modifying or filtering individual rows.

## Integrity Reconciliation

Production and the isolated restore target produced identical privacy-safe
fingerprints for:

- per-table public row counts;
- public relations;
- public functions;
- public RLS policies;
- public triggers; and
- public RLS enablement state.

The matching fingerprints prove commerce-core parity for the observed
production state. They do not prove recovery of future Auth identities,
Storage objects or provider-managed configuration.

## Timing

The observed encrypted export, compatibility analysis, commerce-core restore,
validation and cleanup window was approximately 11 minutes. This is not an
approved recovery-time objective because the full managed-service restore did
not pass and the run included manual diagnosis.

## Repository Validation

```text
focused P16 evidence tests: 17 / 17 PASS
full repository tests: 161 / 161 PASS
lint: PASS
typecheck: PASS
production build: PASS
Supabase security suite: PASS
Supabase workflow suite: PASS
commerce integration suite: PASS
```

The first sandboxed production-build attempt could not reach Google Fonts. The
approved network-enabled retry fetched Noto Sans Thai and passed. The first
sandboxed Supabase validation attempt could not write CLI telemetry; the
approved local-stack retry passed. Neither sandbox restriction was a product
failure.

## Disposition

```text
encrypted temporary backup: PASS / DELETED
isolated commerce-core restore: PASS
full Auth/Storage service restore: BLOCKED
P16 recovery evidence: PARTIAL
P15 smoke-test execution: BLOCKED
public signup: BLOCKED
```

P16 cannot close until Auth and Storage recovery are proven on a compatible
non-production Supabase target or an approved provider-managed recovery
capability. No retry may silently omit managed service data.

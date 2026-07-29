# ACOS Production Advisor Reconciliation
# Part 2 - Guarded RPC Contract Review

**Date:** 2026-07-30
**Status:** PRODUCTION VALIDATED
**Target:** `ACOS Production` (`pirewyrhddrhmtiwmlaw`)
**Scope:** 36 authenticated `SECURITY DEFINER` advisor findings

---

## 1. Guardrails

Part 2 reviewed the latest effective function definitions and grants from the
forward migration history. It did not:

```text
change a function body or grant
edit a frozen migration
push a production migration
connect Vercel credentials
enable production signup
```

The 36 advisor findings are not accepted merely because the functions have an
`api_` prefix. Each boundary was checked for caller identity, tenant or
customer ownership, permission, resource scope, lifecycle constraints,
idempotency or audit where required, and explicit role grants.

---

## 2. Review Result

| Group | Findings | Result | Notes |
|---|---:|---|---|
| Auth and permission helpers | 3 | 2 accepted, 1 remediation required | `has_org_permission` omits active-profile status |
| Inventory and product cost | 6 | Contract accepted, remediation dependency | Identity, permission and tenant-owned resource checks are present |
| Operations and assignments | 10 | Contract accepted, remediation dependency | Permission, tenant resource and workflow guards are present |
| Member administration | 8 | Contract accepted, remediation dependency | Organization, permission, owner/self, idempotency and audit rules are present as applicable |
| Customer portal and ownership | 9 | Accepted | Active customer-profile ownership or guarded staff permission is checked; service-only transitions remain restricted |

Every reviewed signature explicitly denies `PUBLIC` and `anon`. Authenticated
execution is retained only for browser-facing guarded boundaries. Separate
provider or Auth Admin functions that are service-only are not widened by this
review.

---

## 3. Remediation Finding

The effective `public.has_org_permission(uuid, text)` definition checks:

```text
auth.uid() maps to the joined profile
organization membership is ACTIVE
role is ACTIVE
the requested permission exists
```

It does not check:

```text
profiles.status = 'ACTIVE'
```

`public.is_org_member(uuid)` already includes this predicate. The missing
predicate means a disabled profile can retain a positive permission result
while its organization membership and role assignments remain active.
Permission-guarded RPCs therefore inherit this authorization gap even when
their own tenant and resource checks are correct.

Original classification:

```text
REMEDIATION REQUIRED
PROTECTED AUTHORIZATION CORE
FORWARD MIGRATION REQUIRED
PRODUCTION CHANGE NOT AUTHORIZED BY THIS REVIEW
```

Approved remediation contract:

```text
replace has_org_permission through a new forward migration
add p.status = 'ACTIVE' without changing its signature or grants
preserve ACTIVE membership, ACTIVE role and exact permission-code checks
prove disabled-profile denial and active-profile allow behavior
run fresh replay, security, workflow and focused negative suites
push to production only after explicit approval
rerun advisors and verify the expected finding disposition
```

The approved forward migration is:

```text
supabase/migrations/20260729183433_harden_active_profile_permission_guard.sql
```

It adds only `p.status = 'ACTIVE'`, preserves the function signature and
existing permission predicates, and reasserts denial for `PUBLIC`/`anon` plus
the existing authenticated grant. Production application remains a separate
approval gate.

---

## 4. Function Disposition

### Accepted helpers

```text
current_profile_id
is_org_member
```

### Remediation required

```text
has_org_permission
```

### Accepted subject to the shared helper remediation

```text
api_reserve_inventory
api_release_inventory_reservation
api_convert_reservation_to_allocation
api_post_inventory_movement
api_get_product_variant_cost
api_update_product_variant_cost
api_process_refund
api_override_qc_session
api_create_shipment_label
api_complete_qc_session
api_mark_shipment_ready_for_handoff
api_record_carrier_tracking_event
api_assign_fulfillment
api_assign_qc_session
api_assign_shipment
api_assign_return
api_request_member_invitation
api_prepare_member_invitation_email_send
api_record_member_invitation_email_event
api_accept_member_invitation
api_assign_member_role
api_remove_member_role
api_replace_member_role
api_deactivate_member
api_request_customer_profile_link
api_revoke_customer_profile_link
```

### Accepted customer-owned boundaries

```text
api_get_customer_portal_snapshot
api_create_customer_portal_address
api_update_customer_portal_address
api_archive_customer_portal_address
api_update_customer_portal_consent
api_request_customer_contact_change
api_get_customer_portal_notifications
```

---

## 5. Evidence and Next Gate

Existing focused database suites cover cross-tenant, unauthorized,
idempotency, audit and direct-role denial behavior for the reviewed workflow
groups. Part 2 adds a repository regression test that freezes all 36 names,
role-grant expectations and the identified helper gap.

Local validation evidence:

```text
fresh migration replay through 20260729183433: PASS
Supabase database lint: PASS
active-profile allow and inactive-profile denial: PASS
security suite: PASS
workflow suite: PASS
carrier webhook E2E: PASS
signup rate-limit concurrency: PASS
repository tests: 140/140 PASS
```

Production validation evidence:

```text
linked migration 20260729183433: APPLIED
linked dry-run: database up to date
has_org_permission active-profile predicate: PRESENT
SECURITY DEFINER: PRESERVED
anon EXECUTE: DENIED
authenticated EXECUTE: PRESERVED
advisor WARN: 40 EXPECTED
```

The remaining 40 findings match the frozen classification:

```text
36 authenticated guarded/helper RPC findings accepted by contract
2 extension dependency reviews reserved for Part 3
2 RLS initplan performance findings reserved for Part 3
```

Part 3 extension and RLS performance review must not conceal or bypass these
accepted guarded boundaries.

Vercel-to-Supabase credentials and production signup remain blocked until
Part 4 closes all unexpected findings or records an approved,
contract-backed disposition.

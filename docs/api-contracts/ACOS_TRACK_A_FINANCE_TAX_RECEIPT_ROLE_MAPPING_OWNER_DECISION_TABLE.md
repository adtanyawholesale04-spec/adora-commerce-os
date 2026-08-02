# ACOS Track A Finance & Tax Receipt Role Mapping Owner Decision Table

**Phase:** `1E Finance & Tax Control MVP`
**Task:** `FIN-TAX-001-ROLE-MAPPING`
**Prepared Date:** 2026-08-03
**Owner Approval Date:** Pending
**Status:** OWNER DECISION REQUIRED / RM01-RM24 PREPARED
**Depends on:** Receipt Layers A-C locally validated
**Migration:** None authorized
**Runtime:** None authorized
**Production:** NOT AUTHORIZED / BLOCKED BY P16

## Objective

Prepare the least-privilege mapping between the four Owner-frozen Receipt
permissions and the existing ACOS system-role archetypes before any
`role_permissions` row is created.

This review creates no role, permission, grant, migration, runtime service,
UI, customer access rule, Receipt row, or Production change. Role authority is
reserved for the Project Owner, so RM01-RM24 remain recommendations until the
Owner explicitly approves them.

## Repository Evidence

- `roles` is organization-scoped and role codes are unique inside one tenant.
- The validated role matrix uses the existing system archetypes `owner`,
  `manager`, `warehouse`, and `support`.
- `owner` is the protected highest-authority role.
- `manager` already has `payment.view` and `payment.verify`, but not
  `payment.refund`, product cost, or inventory-adjust authority.
- `warehouse` is limited to catalog, inventory, fulfillment, QC, packing, and
  shipping operations.
- `support` is limited to customer, order, and conversation support and does
  not have payment visibility or verification.
- Receipt Layers A-C created the four `finance.document.*` permission rows but
  intentionally created zero role mappings.
- Customer Portal Receipt reads derive active customer ownership and do not
  use staff role mappings.

## Recommended Role Matrix

| Existing role | `finance.document.view` | `finance.document.create` | `finance.document.void` | `finance.document.reverse` | Reason |
|---|---:|---:|---:|---:|---|
| `owner` | YES | YES | YES | YES | Protected tenant authority; may perform every guarded Receipt lifecycle operation |
| `manager` | YES | YES | NO | NO | May operate the paid-order workflow and issue an eligible deterministic Receipt, but cannot perform historical correction or reversal |
| `warehouse` | NO | NO | NO | NO | Warehouse duties do not require customer financial documents |
| `support` | NO | NO | NO | NO | Support has no payment visibility and must not gain tenant-wide financial-document access |
| Custom roles | NO AUTO-GRANT | NO AUTO-GRANT | NO AUTO-GRANT | NO AUTO-GRANT | Future custom finance authority requires a separately audited Owner-managed contract |

This matrix keeps normal issuance usable without widening high-risk lifecycle
authority. `manager` creation remains guarded by canonical paid-payment
eligibility, exact tenant authorization, idempotency, immutable snapshots, and
audit. Void and reverse remain Owner-only because they alter official document
lifecycle history.

## RM01-RM24 Decision Table

| ID | Recommended safe value | State |
|---|---|---|
| RM01 | Reuse only the existing exact lowercase system-role codes `owner`, `manager`, `warehouse`, and `support` | Owner decision required |
| RM02 | Create no new `finance`, `accounting`, `cashier`, or other role in this scope | Owner decision required |
| RM03 | Keep the four existing `finance.document.*` permission codes unchanged; add no permission | Owner decision required |
| RM04 | Map only organization-scoped roles with `is_system_role = true`; an exact-code non-system collision fails preflight | Owner decision required |
| RM05 | Grant `owner` `finance.document.view` | Owner decision required |
| RM06 | Grant `owner` `finance.document.create` | Owner decision required |
| RM07 | Grant `owner` `finance.document.void` | Owner decision required |
| RM08 | Grant `owner` `finance.document.reverse` | Owner decision required |
| RM09 | Grant `manager` `finance.document.view` | Owner decision required |
| RM10 | Grant `manager` `finance.document.create` | Owner decision required |
| RM11 | Do not grant `manager` `finance.document.void` | Owner decision required |
| RM12 | Do not grant `manager` `finance.document.reverse` | Owner decision required |
| RM13 | Grant no `finance.document.*` permission to `warehouse` | Owner decision required |
| RM14 | Grant no `finance.document.*` permission to `support` | Owner decision required |
| RM15 | Do not infer Receipt authority from `payment.view`, `payment.verify`, `payment.refund`, `order.view`, or any other permission | Owner decision required |
| RM16 | Customer Portal Receipt access remains ownership-scoped and receives no staff role or `finance.document.*` grant | Owner decision required |
| RM17 | Existing and future custom roles receive no automatic Receipt permission | Owner decision required |
| RM18 | Every Receipt RPC continues to check the exact permission internally; role mapping never replaces Auth, active profile, membership, tenant, ownership, or RLS checks | Owner decision required |
| RM19 | Any later mapping implementation must use a new CLI-generated forward-only migration; frozen migrations remain untouched | Owner decision required |
| RM20 | The later migration may insert only the approved role-permission pairs idempotently and must never delete or broadly rewrite unrelated mappings | Owner decision required |
| RM21 | Preflight must prove all four permission rows exist, target system roles are unambiguous, and no unexpected Receipt grants exist; any mismatch is `BLOCKED` | Owner decision required |
| RM22 | Existing-role backfill and future-organization system-role provisioning are separate implementation concerns; future bootstrap must be reviewed before runtime organization creation relies on this matrix | Owner decision required |
| RM23 | Migration history is the evidence for initial system mapping; every future runtime permission edit requires a separately approved guarded Owner workflow and append-only audit | Owner decision required |
| RM24 | Validation must cover exact positive/negative role matrix, inactive profile/membership/role, cross-tenant denial, direct-table denial, no custom-role auto-grant, fresh replay, security regressions, and zero Production apply | Owner decision required |

## Alternatives Considered

### Owner-only issuance

Granting all four permissions only to `owner` has the smallest authority
surface, but creates an operational bottleneck for normal paid-order Receipt
issuance. The guarded create boundary is deterministic and already rejects
ineligible payment evidence, so manager create is the recommended balance.

### Full manager lifecycle authority

Granting manager void or reverse reduces Owner workload but widens historical
financial-document correction authority beyond the existing manager role.
This is not recommended for the first MVP.

### New finance role

A dedicated finance role could improve separation of duties later, but adding
a new role now would invent core Role Authority and require organization
bootstrap, assignment UI, audit, and migration decisions outside this task.

## Approval Effect

Owner approval of RM01-RM24 will authorize only a separate forward-only role
mapping migration contract review. It will not itself create mappings or
authorize runtime/UI/Production behavior.

## Next Gate

The Project Owner must explicitly approve or amend RM01-RM24. After approval,
the next separately gated task is the Receipt role-mapping migration contract
and local validation plan. Server read-service and Admin/Portal UI integration
remain closed until that mapping gate is complete.

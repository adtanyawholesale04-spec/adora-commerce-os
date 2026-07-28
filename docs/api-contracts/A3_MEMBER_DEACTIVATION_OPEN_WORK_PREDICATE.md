# A3 Membership Deactivation Open-Work Predicate

**Task ID:** `A3-MEMBER-DEACTIVATION-OPEN-WORK-PREDICATE-001`  
**Status:** `APPROVED`  
**Purpose:** Define the cross-module read predicate required before enabling `admin.member.deactivate.request`.

**Owner approval:** Approved by Project Owner in the current task. Unknown assignment coverage is a blocking condition until the affected domains define canonical member assignment.

## Finding

The frozen schema has assignment data for conversations and notifications, but no member assignment field on `fulfillments`, `shipments`, orders, QC, or returns. Therefore a deactivation guard cannot safely claim that all operational work has been checked.

## Proposed canonical predicate

For a target `profile_id` and `organization_id`, `has_blocking_open_work` is true when at least one known assigned work item exists:

### Conversation work

```sql
exists (
  select 1
  from public.conversations c
  where c.organization_id = p_organization_id
    and c.assigned_profile_id = p_profile_id
    and c.status in ('OPEN', 'PENDING', 'WAITING_CUSTOMER')
)
or exists (
  select 1
  from public.conversation_assignments ca
  join public.conversations c
    on c.organization_id = ca.organization_id
   and c.id = ca.conversation_id
  where ca.organization_id = p_organization_id
    and ca.assigned_profile_id = p_profile_id
    and ca.unassigned_at is null
    and c.status in ('OPEN', 'PENDING', 'WAITING_CUSTOMER')
)
```

The two branches intentionally cover both the current conversation assignee and the active assignment history shape. The implementation must deduplicate by conversation ID when returning diagnostics.

### Notification work

```sql
exists (
  select 1
  from public.notifications n
  where n.organization_id = p_organization_id
    and n.assigned_profile_id = p_profile_id
    and n.action_required is true
    and n.status in ('PENDING', 'ACTIVE')
)
```

### Coverage boundary

Fulfillment, QC, shipping, returns, orders, and payments are **unknown coverage** today because their frozen tables do not contain a canonical assigned member field or approved assignment relation. They must not be silently treated as checked.

## Required contract result

The eventual guarded deactivation RPC should return or audit:

```text
blocking_work_found: boolean
blocking_work_domains: string[]
blocking_work_count: integer
coverage_gaps: string[]
```

If `blocking_work_found` is true, return `OPEN_WORK_BLOCKS_DEACTIVATION`. If `coverage_gaps` is non-empty, the action must not be enabled until the owner approves the coverage policy below.

## Owner decisions required

1. Approve conversation and action-required notification records as blocking work.
2. Decide whether unknown operational domains block deactivation by default or are allowed with an explicit coverage warning.
3. Define the assignment source for fulfillment/QC/shipping/returns before claiming full operational coverage.
4. Approve whether reassignment must occur before suspension or can be a separate workflow.

## Implementation guard

No function, migration, deactivation RPC, or UI enablement is added by this design artifact. The database boundary remains `BLOCKED` until the coverage policy is approved and the predicate can be implemented without inventing ownership semantics.

NEXT: Warehouse QC assignment contract review.

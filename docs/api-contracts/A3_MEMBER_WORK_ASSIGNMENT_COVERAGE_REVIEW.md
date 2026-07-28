# A3 Member Work Assignment Coverage Review

**Task ID:** `A3-MEMBER-WORK-ASSIGNMENT-COVERAGE-001`  
**Status:** `BLOCKED`  
**Purpose:** Define the missing assignment source required to remove the deactivation coverage guard.

## Verified schema gap

The frozen schema currently provides member assignment data for:

- `conversations.assigned_profile_id`;
- active rows in `conversation_assignments`;
- `notifications.assigned_profile_id`.

It does not provide an approved member assignment field or relation for:

- `fulfillments` and fulfillment picking;
- warehouse QC sessions/scans;
- `shipments` and handoff work;
- returns/RMA inspection and disposition.

The current deactivation RPC therefore blocks `ACTIVE -> SUSPENDED` when these coverage gaps exist. This preserves the approved safety policy without claiming that unassigned operational work has been checked.

Fulfillment and Warehouse QC contract reviews are now approved and implemented. Shipping and Returns remain uncovered until their assignment contracts are approved.

## Decisions required

### Option A: Domain-local assignees

Add an approved assignee/reassignment contract to each owning domain, such as a membership-scoped profile assignment on fulfillment, QC, shipment, and return work. Each domain defines its own open statuses, reassignment rules, RLS, audit, and guarded mutation boundary.

**Benefit:** clear ownership per module and precise lifecycle rules.  
**Cost:** several migrations and coordinated workflow changes.

### Option B: Shared work-assignment model

Create a single approved work-assignment relation with organization, work type, work ID, profile, assignment status, timestamps, and audit semantics. Domain workflows write through guarded wrappers and the deactivation predicate reads one source.

**Benefit:** one deactivation predicate and consistent reassignment behavior.  
**Cost:** new protected core model, polymorphic integrity concerns, and larger migration scope.

### Option C: Workflow-owned derived coverage

Each domain exposes a guarded read function that answers whether a profile has blocking work. The deactivation boundary calls approved domain functions without owning domain assignment storage.

**Benefit:** preserves domain ownership.  
**Cost:** more function contracts, coordination, and completeness monitoring.

## Required owner decisions

1. Select Option A, B, or C.
2. Define which domain statuses count as open/blocking for each affected module.
3. Define reassignment-before-suspension behavior and who can perform it.
4. Approve whether a member may be suspended while work is unassigned but still operationally open.
5. Approve the migration range and module owners before changing the frozen core schema.

## Current implementation boundary

No new assignment table, column, role, permission, status, or migration is authorized by this review. Part 2B remains safely guarded: known open work blocks deactivation, and unknown assignment coverage also blocks deactivation.

NEXT: Owner approval of the Shipping assignment decision table.

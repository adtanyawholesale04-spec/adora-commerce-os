# A3 Member Work Assignment Coverage Review

**Task ID:** `A3-MEMBER-WORK-ASSIGNMENT-COVERAGE-001`  
**Status:** `VALIDATED`
**Purpose:** Define the missing assignment source required to remove the deactivation coverage guard.

## Verified assignment coverage

The approved forward-only assignment boundaries now provide member assignment data for:

- `conversations.assigned_profile_id`;
- active rows in `conversation_assignments`;
- `notifications.assigned_profile_id`.

 - fulfillment-level work and picking;
 - warehouse QC sessions/scans;
 - shipment handoff work;
 - Returns cases.

Each source has a guarded assignment/reassignment boundary, tenant-scoped membership validation, direct-write denial, audit/idempotency handling, and deactivation coverage for its approved blocking statuses. The deactivation RPC now reports no coverage gaps after fresh replay.

## Historical decisions

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

No shared assignment table or new role is required. Domain-local assignment boundaries are implemented for all four approved domains. Known assigned and unassigned open work blocks deactivation; with no blocking work and no coverage gaps, the guarded transition may proceed with audit/idempotency protection.

NEXT: Final Part 2C status reconciliation, then Track B Business Rule Review.

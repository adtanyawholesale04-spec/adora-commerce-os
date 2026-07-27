# ADORA Commerce OS (ACOS)
# IMPLEMENTATION STATUS

**Project Name:** ADORA Commerce OS
**Short Name:** ACOS
**Repository Slug:** `adora-commerce-os`
**Document:** `ACOS_IMPLEMENTATION_STATUS.md`
**Status:** ACTIVE PROJECT CHECKPOINT
**Purpose:** ใช้เป็นไฟล์สถานะกลางของการพัฒนา ACOS เพื่อให้มนุษย์และ AI Coding Agent รู้ว่าแต่ละ Track / Module / Task อยู่สถานะใด ทำอะไรได้แล้ว อะไรยัง Block และอะไรเป็น Next Step

---

# 0. How to Use This File

ไฟล์นี้ไม่ใช่ Roadmap และไม่ใช่ Business Rules

หน้าที่ของไฟล์นี้คือบอกว่า:

```text
ตอนนี้โปรเจกต์ทำถึงไหนแล้ว
อะไรเสร็จแล้ว
อะไรยังไม่เริ่ม
อะไรถูก Block
อะไรเป็นงานถัดไป
```

ทุกครั้งที่ AI Coding Agent เริ่มงาน ต้องอ่านไฟล์นี้ร่วมกับ:

```text
1. docs/governance/ACOS_AI_CODING_CONSTITUTION.md
2. docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
3. docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
4. Business Rules ล่าสุดของ Module
5. Frozen ER / Schema ล่าสุด
6. Migration Status ล่าสุด
```

---

# 1. Status Vocabulary

ใช้สถานะต่อไปนี้เท่านั้น

```text
NOT_STARTED
IN_REVIEW
APPROVED
READY
IN_PROGRESS
BLOCKED
IMPLEMENTED
VALIDATED
DEFERRED
REJECTED
```

ความหมาย:

| Status | Meaning |
|---|---|
| NOT_STARTED | ยังไม่เริ่ม |
| IN_REVIEW | อยู่ระหว่างตรวจ/ออกแบบ/รีวิว |
| APPROVED | อนุมัติทิศทางหรือกติกาแล้ว |
| READY | พร้อมให้ AI/Developer เริ่ม implement |
| IN_PROGRESS | กำลังดำเนินการ |
| BLOCKED | มี blocker ต้องตัดสินใจก่อน |
| IMPLEMENTED | เขียนเสร็จเบื้องต้นแล้ว |
| VALIDATED | ผ่านการทดสอบ/ตรวจสอบตาม Gate |
| DEFERRED | เลื่อนไป Phase หลัง |
| REJECTED | ไม่ทำหรือยกเลิก |

---

# 2. Current Master Baseline

```text
Project Identity:
APPROVED

Canonical Name:
ADORA Commerce OS

Short Name:
ACOS

Repository Slug:
adora-commerce-os

Architecture:
Modular Monolith

Primary DB:
PostgreSQL / Supabase

Tenant Boundary:
organization_id

Development Model:
Track A Commerce Core
Track B Customer Engagement Platform
```

---

# 3. Document Baseline

| Document | Path | Current Status | Notes |
|---|---|---:|---|
| AI Coding Constitution | `docs/governance/ACOS_AI_CODING_CONSTITUTION.md` | APPROVED | Mandatory AI execution rules |
| Master Development Roadmap | `docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md` | APPROVED | Master execution map |
| Implementation Status | `docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md` | ACTIVE | This file |
| Status Reconciliation Audit | `docs/roadmap/ACOS_STATUS_RECONCILIATION_AUDIT.md` | ACTIVE | Drift audit between repository evidence and this status file |
| Supabase Migration Replay Protocol | `docs/migrations/SUPABASE_MIGRATION_REPLAY_PROTOCOL.md` | ACTIVE | Defines baseline/full replay evidence layers |
| Supabase Migration Replay Report 2026-07-27 | `docs/migrations/SUPABASE_MIGRATION_REPLAY_REPORT_2026-07-27.md` | VALIDATED | Fresh local replay and security/workflow gates passed |
| Project Blueprint V13 | `reference/PROJECT_BLUEPRINT_V13.md` | APPROVED | Commerce Core baseline |
| Business Rules V13 | `reference/BUSINESS_RULES_V13.md` | APPROVED | Commerce Core baseline |
| Database Schema V1 Frozen V3 | `reference/DATABASE_SCHEMA_V1_FROZEN_V3.md` | APPROVED | Commerce Core frozen schema |
| Supabase Migration Status | `reference/SUPABASE_MIGRATION_V1_STATUS.md` | ACTIVE | Migration 001–034 status |
| A3 Admin Service Contract Map | `docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md` | HARDENED_IN_REVIEW | Admin MVP service boundary before UI implementation; guarded action envelope now references A3 hardening contract |
| A3 Guarded Action Service Contract Hardening | `docs/api-contracts/ACOS_A3_GUARDED_ACTION_SERVICE_CONTRACT_HARDENING.md` | IMPLEMENTED | Server-only action envelope, risk tiers, first action candidates, idempotency/audit/tenant guardrails, and blocked action list |
| A3 Low-Risk Guarded Admin Action Skeletons | `docs/api-contracts/A3_LOW_RISK_GUARDED_ADMIN_ACTION_SKELETONS.md` | IMPLEMENTED | Server-only skeletons for member invite request and organization profile update request |
| A3 Permission-Aware UI Affordances | `docs/api-contracts/A3_PERMISSION_AWARE_UI_AFFORDANCES.md` | IMPLEMENTED | Disabled UI affordances show action IDs, permission state, skeleton readiness, audit requirement, and persistence-disabled status |
| A3 Member Invite Audited Persistence Contract | `docs/api-contracts/A3_MEMBER_INVITE_AUDITED_PERSISTENCE_CONTRACT.md` | IMPLEMENTED | Defines `admin.member.invite.request` write shape, duplicate invite behavior, expiry gate, audit payload, role assignment non-scope, and Auth Admin server-only boundary |
| A3 Member Invite Persistence Implementation | `docs/api-contracts/A3_MEMBER_INVITE_PERSISTENCE_IMPLEMENTATION.md` | IMPLEMENTED | DB-only guarded RPC persists `organization_invitations` and `audit_logs` with ACOS 7-day TTL, duplicate reuse, actor profile audit, and no Auth Admin email send |
| A3 Member Invite UI Submit Enablement | `docs/api-contracts/A3_MEMBER_INVITE_UI_SUBMIT_ENABLEMENT.md` | IMPLEMENTED | `/admin/users` enables DB-only invite submit with client/server validation, permission-aware disabled state, server action revalidation, and no Auth Admin email send |
| A3 Member Invite Auth Admin Email Boundary | `docs/api-contracts/A3_MEMBER_INVITE_AUTH_ADMIN_EMAIL_BOUNDARY.md` | IMPLEMENTED | Sends Supabase Auth Admin invite email from a server-only secret boundary after DB persistence, records email sent/failed audit events, and blocks repeat sends after successful audit |
| A3 Member Invite Acceptance Activation Boundary | `docs/api-contracts/A3_MEMBER_INVITE_ACCEPTANCE_ACTIVATION_BOUNDARY.md` | IMPLEMENTED | Invite callback accepts `invitation_id` after Supabase session exchange, matches authenticated email to invitation email, creates/reuses profile, activates membership, marks invitation accepted, audits acceptance, and keeps role assignment deferred |
| CORE-UI-001 Admin Shell Contract | `docs/api-contracts/CORE_UI_001_ADMIN_APP_SHELL_RBAC_NAVIGATION.md` | IMPLEMENTED | Admin shell, auth entry, organization switcher, and permission-aware navigation contract |
| CORE-UI-002 Products Read Contract | `docs/api-contracts/CORE_UI_002_PRODUCTS_READ_ONLY_SCREEN.md` | IMPLEMENTED | Read-only Products screen and server read model contract |
| CORE-UI-DESIGN-001 Admin Visual System Pass | `docs/api-contracts/CORE_UI_DESIGN_001_ADMIN_VISUAL_SYSTEM_PASS.md` | IMPLEMENTED | Admin light/dark theme and Thai/English UI preference foundation |
| Architecture V2 Content Retention | `docs/architecture/ACOS_ARCHITECTURE_V2_CONTENT_RETENTION.md` | APPROVED DIRECTION | Track B architecture direction |
| ER Diagram V2 Content Retention | `docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md` | PROPOSED | Not frozen |
| Cost Scale Model V1 | `docs/architecture/COST_SCALE_MODEL_V1.md` | REFERENCE | Used for scale planning |
| Migration Plan Content Retention V1 | `docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V1.md` | RESERVED | Migration 035+ plan only |

---

# 4. Protected Core

AI Coding Agent ห้ามแก้ส่วนนี้โดยไม่มีคำสั่งชัดเจนจาก Project Owner

```text
Project canonical identity
Tenant model
Customer source of truth
Product source of truth
Order source of truth
Historical migrations 001–034
Core permission model
Core audit model
Core organization/membership model
```

ถ้างานใดจำเป็นต้องแตะ Protected Core:

```text
STATUS: BLOCKED
```

และรายงาน decision required ก่อนดำเนินการ

---

# 5. Migration Baseline

```text
Current Protected Historical Migration Range:
001–034

Status:
GENERATED / COMPLETE

Next Required Gate:
Fresh Supabase Replay Validation

Track B Reserved Migration Range:
next approved Track B migration range after current repository latest

Important:
Post-034 Track A/shared hardening migrations exist in the repository and are not Track B production implementation.
Do not generate Track B production migrations until Business Rules Content Retention V1 and ER Diagram V2 are frozen.
```

---

# 6. Track Summary

| Track | Name | Current Status | Next Gate |
|---|---|---:|---|
| Track A | Commerce Core | VALIDATED BASELINE | Commerce Integration Test |
| Track B | Customer Engagement | APPROVED DIRECTION | Business Rule Review |
| Shared | SaaS / Security / Cost Guardrails | IN_REVIEW | Implementation after module gates |
| Shared | AI Governance | APPROVED | Use in every AI task |

---

# 7. TRACK A — COMMERCE CORE STATUS

## A0 — Governance Baseline

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| CORE-GOV-001 | Confirm canonical project identity | APPROVED | ADORA Commerce OS / ACOS / `adora-commerce-os` |
| CORE-GOV-002 | Confirm architecture style | APPROVED | Modular Monolith |
| CORE-GOV-003 | Confirm tenant boundary | APPROVED | `organization_id` |
| CORE-GOV-004 | Confirm protected migration range | APPROVED | `001–034` |

---

## A1 — Fresh Database Validation

| Task ID | Task | Status | Blocker / Notes |
|---|---|---:|---|
| CORE-DB-001 | Create fresh Supabase dev project | VALIDATED | Local Supabase stack reset through Supabase CLI at 2026-07-27 |
| CORE-DB-002 | Replay migration `001–034` | VALIDATED | `supabase db reset --local` applied baseline migrations 001-034 successfully at 2026-07-27 |
| CORE-DB-003 | Validate extension/function/trigger dependency | VALIDATED | Full local reset applied migrations 001-latest successfully |
| CORE-DB-004 | Validate FK / constraints / indexes | VALIDATED | Full replay plus `supabase db lint --local` passed |
| CORE-DB-005 | Validate RLS policies | VALIDATED | `npm.cmd run validate:supabase-security` passed after fresh local reset at 2026-07-27 |
| CORE-DB-006 | Validate seed roles/permissions | VALIDATED | Permission layer and role matrix validation passed after fresh local reset at 2026-07-27 |
| CORE-DB-007 | Document replay result | VALIDATED | Replay report updated with fresh replay and validation evidence |

### Gate A1

```text
Status:
PASSED

Required for:
Commerce Core implementation confidence
Track B migration 035+ fresh replay later
Production readiness
```

Latest evidence:

```text
docs/migrations/SUPABASE_MIGRATION_REPLAY_PROTOCOL.md
docs/migrations/SUPABASE_MIGRATION_REPLAY_REPORT_2026-07-27.md

Fresh local Supabase replay passed for migrations 001-latest.
Security/workflow validation passed after fresh reset.
Latest applied migration: 20260727104818_carrier_webhook_tracking_rpc.sql.
```

---

## A2 — Commerce Integration Test

| Task ID | Task | Status | Blocker / Notes |
|---|---|---:|---|
| CORE-INT-001 | Product → Variant → Inventory test | VALIDATED | `npm.cmd run validate:commerce-integration` passed at 2026-07-27 |
| CORE-INT-002 | Customer → Conversation → Cart test | VALIDATED | `npm.cmd run validate:commerce-integration` passed at 2026-07-27 |
| CORE-INT-003 | Cart → Purchase Session → Order test | VALIDATED | `npm.cmd run validate:commerce-integration` passed at 2026-07-27 |
| CORE-INT-004 | Promotion immutable snapshot test | VALIDATED | Applied benefit snapshot stays immutable after campaign version state changes |
| CORE-INT-005 | Payment / Credit / Loyalty test | VALIDATED | Payment, credit ledger, and loyalty ledger linkage/append-only checks passed |
| CORE-INT-006 | Fulfillment → QC → Shipping test | VALIDATED | QC, label, handoff, tracking, delivery wrappers passed |
| CORE-INT-007 | Return / RTO test | VALIDATED | Customer return/refund and RTO disposition coverage passed |
| CORE-INT-008 | Audit completeness test | VALIDATED | Critical cart/order/promotion/payment/shipment/return audit coverage passed |

### Gate A2

```text
Status:
PASSED
```

Latest evidence:

```text
supabase/validation/016_commerce_integration_a2_test.sql
supabase/validation/commerce-integration-suite.mjs
npm.cmd run validate:supabase

Security/RLS/workflow/commerce integration validation passed locally at 2026-07-27.
```

---

## A3 — Commerce Admin MVP

Planning evidence:

```text
docs/api-contracts/ACOS_A3_ADMIN_SERVICE_CONTRACT_MAP.md

Status:
IN_REVIEW

Scope:
Admin MVP service boundary and guarded action map.

Important:
No UI, schema, migration, role, permission, status, or financial rule implementation is claimed by this planning artifact.
```

| Task ID | Module | Status | Notes |
|---|---|---:|---|
| CORE-UI-000 | Admin service contract map | HARDENED_IN_REVIEW | Defines read/action boundary for Admin MVP and now references guarded action hardening requirements |
| CORE-UI-DESIGN-001 | Admin visual system pass | IMPLEMENTED | Light/dark theme tokens, Thai/English UI preferences, and shared Admin preference switcher added |
| CORE-UI-001 | Admin app shell / RBAC navigation | IMPLEMENTED | `/admin` shell, magic-link sign-in, sign-out, organization switcher, server auth context loader, and permission-aware navigation contract added |
| CORE-UI-002 | Products | IMPLEMENTED | `/admin/products` read-only product/variant snapshot added; product reads use RLS, inventory totals require `inventory.view`, and cost fields remain wrapper-only |
| CORE-UI-003 | Inventory | IMPLEMENTED | `/admin/inventory` read-only warehouse, balance, and movement screen added; inventory reads require `inventory.view`, product labels require `product.view`, and mutations remain wrapper-only |
| CORE-UI-004 | Customers | IMPLEMENTED | `/admin/customers` read-only customer master screen added; customer reads require `customer.view`, optional order signals require `order.view`, and edit/merge/privacy flows remain service-contract gated |
| CORE-UI-005 | Orders | IMPLEMENTED | `/admin/orders` read-only order list/status/payment/fulfillment snapshot added; order reads require `order.view`, optional customer labels require `customer.view`, and create/edit/cancel/reprice remain service-contract gated |
| CORE-UI-006 | Payments | IMPLEMENTED | `/admin/payments` read-only payment, transaction, and refund snapshot added; payment reads require `payment.view`, optional order labels require `order.view`, and verification/settlement/refund processing remain service/wrapper gated |
| CORE-UI-007 | Fulfillment | IMPLEMENTED | `/admin/fulfillment` read-only fulfillment queue/item/QC/shipping snapshot added; fulfillment reads require `warehouse.pick`, optional QC signals require `warehouse.qc`, optional shipping signals require `shipping.create`, and state transitions remain service/wrapper gated |
| CORE-UI-008 | Warehouse QC | IMPLEMENTED | `/admin/qc` read-only QC session, item total, and scan signal snapshot added; QC reads require `warehouse.qc`, optional fulfillment labels require `warehouse.pick`, optional product labels require `product.view`, and completion/override/scan ingestion remain service/wrapper gated |
| CORE-UI-009 | Shipping | IMPLEMENTED | `/admin/shipping` read-only shipment, package, package item, provider, and tracking snapshot added; shipping reads require `shipping.create`, print label remains wrapper-only with `shipping.print_label`, and label/handoff/tracking/webhook/cost/COD flows remain guarded |
| CORE-UI-010 | Returns | IMPLEMENTED | `/admin/returns` read-only RMA/RTO/exchange, item, history, disposition, and replacement snapshot added; return reads require `return.view`, optional order/product labels respect permissions, and create/approve/inspect/restock/refund/exchange flows remain service/wrapper gated |
| CORE-UI-011 | Promotions | IMPLEMENTED | `/admin/promotions` read-only campaign/version/rule/action/coupon/trigger/applied-benefit snapshot added; promotion reads require `promotion.view`, optional order labels respect `order.view`, and create/edit/publish/validate/simulate/evaluate/rewrite flows remain service/engine gated |
| CORE-UI-012 | Users / Roles | IMPLEMENTED | `/admin/users` read-only member, role, permission, role-permission, and invitation snapshot added; reads require `members.view`, Auth Admin data is not selected, and invite/deactivate/role assignment/support access flows remain guarded admin-service/audit gated |
| CORE-UI-013 | Settings | IMPLEMENTED | `/admin/settings` read-only organization, subscription, entitlement, usage, and plan-feature snapshot added; reads require `organization.settings.view`, `config_json` and service-role data are not selected, and commercial writes remain owner-decision gated |
| A3-READ-QA-001 | Read-only Admin QA + Dashboard reconciliation | IMPLEMENTED | `/admin` Dashboard read model added, Dashboard navigation reconciled to `READY_FOR_READ`, and QA contract test/report added for CORE-UI-001 through CORE-UI-013 |
| A3-ACTION-CONTRACT-001 | Guarded action service contract hardening | IMPLEMENTED | Server-only guarded action envelope, risk tiers, first allowed action candidates, idempotency/audit/tenant guardrails, and not-ready action list documented and contract-tested; no write endpoint, schema, migration, role, or permission added |
| A3-ACTION-SKELETON-001 | Low-risk guarded admin action skeletons | IMPLEMENTED | Server-only skeletons added for `admin.member.invite.request` and `admin.organization.profile.update.request`; guards auth, active membership, active organization, exact permission, tenant scope, validation, audit requirement, and controlled errors; persistence intentionally disabled |
| A3-UI-AFFORDANCE-001 | Permission-aware UI affordances | IMPLEMENTED | `/admin/users` and `/admin/settings` now show disabled action affordances for member invite and organization profile update skeletons, including required permission, tenant scope, audit requirement, and persistence-disabled status |
| A3-ACTION-PERSISTENCE-CONTRACT-001 | Member invite audited persistence contract | IMPLEMENTED | Defines future `organization_invitations` + `audit_logs` persistence for `admin.member.invite.request`, duplicate handling, expiry approval gate, Auth Admin server-only boundary, and role assignment non-scope; no write endpoint, migration, or enabled UI submit added |
| A3-ACTION-PERSISTENCE-001 | Member invite DB-only persistence | IMPLEMENTED | Adds guarded `api_request_member_invitation` RPC and server action integration for `admin.member.invite.request`; persists invitation + audit with 7-day TTL, rejects role assignment, reuses duplicate pending invites, and keeps Auth Admin email/visible UI submit disabled |
| A3-ACTION-UI-SUBMIT-001 | Member invite UI validation and submit enablement | IMPLEMENTED | Enables `/admin/users` DB-only member invite submit through the guarded server action, adds required email validation and form result handling, revalidates the users read model after success, and keeps role assignment/Auth Admin email send out of scope |
| A3-ACTION-AUTH-ADMIN-001 | Supabase Auth Admin invite email-send boundary | IMPLEMENTED | Adds server-only Auth Admin client with `SUPABASE_SECRET_KEY`/legacy service-role fallback, requires configured invite redirect URL, sends `inviteUserByEmail` after DB persistence, and records email sent/failed audit events for retry-safe idempotency |
| A3-ACTION-INVITE-ACCEPT-001 | Member invite acceptance callback and membership activation boundary | IMPLEMENTED | Adds `api_accept_member_invitation`, binds acceptance to authenticated Supabase email, creates/reuses active profile, activates `organization_memberships`, marks invitation `ACCEPTED`, records `admin.member.invite.accepted`, and leaves role assignment deferred |

---

## A4 — Live / Conversation Workflow

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| LIVE-001 | Live Session workflow | NOT_STARTED |  |
| LIVE-002 | Contextual sale code | NOT_STARTED |  |
| LIVE-003 | Conversation to cart | NOT_STARTED |  |
| LIVE-004 | Purchase session from live/chat | NOT_STARTED |  |
| LIVE-005 | Staff ownership / assignment | NOT_STARTED |  |

---

## A5 — Commerce Core Stabilization

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| CORE-STAB-001 | Error handling baseline | NOT_STARTED |  |
| CORE-STAB-002 | Audit baseline verification | NOT_STARTED |  |
| CORE-STAB-003 | Concurrency tests | NOT_STARTED |  |
| CORE-STAB-004 | Backup / restore runbook | NOT_STARTED |  |
| CORE-STAB-005 | Observability baseline | NOT_STARTED |  |
| CORE-STAB-006 | Production readiness checklist | NOT_STARTED |  |

---

# 8. TRACK B — CUSTOMER ENGAGEMENT STATUS

## B0 — Architecture Direction

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| ENG-ARCH-001 | Confirm module belongs inside ACOS | APPROVED | Module of ACOS, developed separately |
| ENG-ARCH-002 | Confirm no separate Customer DB | APPROVED | Uses Core Customer Master |
| ENG-ARCH-003 | Confirm no premature microservices | APPROVED | Modular Monolith first |
| ENG-ARCH-004 | Confirm media separated from PostgreSQL | APPROVED DIRECTION | Object storage strategy |
| ENG-ARCH-005 | Confirm messaging provider adapter pattern | APPROVED DIRECTION | Messaging Orchestrator required |
| ENG-ARCH-006 | Confirm cost/usage metering direction | APPROVED DIRECTION | Required for SaaS |

---

## B1 — Business Rule Review

Current Gate:

```text
NEXT REQUIRED WORK
```

| Task ID | Rule Area | Status | Notes |
|---|---|---:|---|
| CONTENT-BR-001 | Content types and lifecycle | NOT_STARTED | Draft / Scheduled / Published / Archived |
| CONTENT-BR-002 | Content visibility rules | NOT_STARTED | Public / follower / member / segment |
| CONTENT-BR-003 | Product-linked content rules | NOT_STARTED | Product references only; no duplicate catalog |
| MEDIA-BR-001 | Media upload limits | NOT_STARTED | File type, size, quota, processing |
| MEDIA-BR-002 | Native video policy | DEFERRED | V1 should not host video directly |
| FOLLOW-BR-001 | Merchant follow semantics | NOT_STARTED | Follow / unfollow / block |
| INTEREST-BR-001 | Customer interest topics | NOT_STARTED | Category/interest model |
| FEED-BR-001 | Feed ranking V1 rules | NOT_STARTED | Deterministic first |
| FEED-BR-002 | Feed event tracking policy | NOT_STARTED | Event type and retention |
| CONSENT-BR-001 | Consent channels | NOT_STARTED | LINE / SMS / Email / Phone |
| CONSENT-BR-002 | Consent purposes | NOT_STARTED | Promotion / Live / Order / Loyalty |
| CONSENT-BR-003 | Consent revoke behavior | NOT_STARTED | Must block dispatch |
| SUPPRESSION-BR-001 | Suppression list rules | NOT_STARTED | Bounce, unsubscribe, block |
| RETENTION-BR-001 | RFM calculation rules | NOT_STARTED | Recency/Frequency/Monetary |
| RETENTION-BR-002 | Customer segment definitions | NOT_STARTED | Champion / Loyal / At Risk |
| AUDIENCE-BR-001 | Segment rule model | NOT_STARTED | Static/dynamic |
| AUDIENCE-BR-002 | Audience snapshot behavior | NOT_STARTED | Freeze recipients |
| CAMPAIGN-BR-001 | Campaign lifecycle | NOT_STARTED | Draft/Scheduled/Running/etc. |
| CAMPAIGN-BR-002 | Campaign cancellation/retry | NOT_STARTED | Required before dispatch |
| MSG-BR-001 | Channel dispatch priority | NOT_STARTED | LINE/SMS/Email |
| MSG-BR-002 | Provider failure handling | NOT_STARTED | Retry/dead-letter |
| ATTR-BR-001 | Attribution window | NOT_STARTED | Click/order mapping |
| ATTR-BR-002 | ROI calculation | NOT_STARTED | Revenue/cost definition |
| USAGE-BR-001 | Quota and metered usage | NOT_STARTED | Customer/message/storage/events |
| AUTO-BR-001 | Automation trigger policy | DEFERRED | Do after manual campaign stable |

### Gate B1

```text
Status:
NOT_PASSED

Required Output:
BUSINESS_RULES_CONTENT_RETENTION_V1.md

Implementation:
BLOCKED UNTIL APPROVED
```

---

## B2 — ER Diagram V2 Freeze

| Task ID | Area | Status | Notes |
|---|---|---:|---|
| ENG-ER-001 | Content tables | PROPOSED | Waiting B1 |
| ENG-ER-002 | Media tables | PROPOSED | Waiting B1 |
| ENG-ER-003 | Follow / Interest tables | PROPOSED | Waiting B1 |
| ENG-ER-004 | Consent tables | PROPOSED | Waiting B1 |
| ENG-ER-005 | Audience tables | PROPOSED | Waiting B1 |
| ENG-ER-006 | Retention metrics tables | PROPOSED | Waiting B1 |
| ENG-ER-007 | Campaign tables | PROPOSED | Waiting B1 |
| ENG-ER-008 | Messaging tables | PROPOSED | Waiting B1 |
| ENG-ER-009 | Event / Attribution tables | PROPOSED | Waiting B1 |
| ENG-ER-010 | RLS review | NOT_STARTED | Waiting ER freeze |
| ENG-ER-011 | Index review | NOT_STARTED | Waiting ER freeze |
| ENG-ER-012 | Retention/partition review | NOT_STARTED | Waiting event rules |

### Gate B2

```text
Status:
NOT_PASSED

Implementation:
BLOCKED UNTIL BUSINESS RULES APPROVED
```

---

## B3 — Migration 035+

| Task ID | Migration Area | Status | Notes |
|---|---|---:|---|
| ENG-DB-035 | Content core migration | BLOCKED | Requires B1/B2 |
| ENG-DB-036 | Follow / interest migration | BLOCKED | Requires B1/B2 |
| ENG-DB-037 | Consent migration | BLOCKED | Requires B1/B2 |
| ENG-DB-038 | Audience migration | BLOCKED | Requires B1/B2 |
| ENG-DB-039 | Retention metrics migration | BLOCKED | Requires B1/B2 |
| ENG-DB-040 | Campaign migration | BLOCKED | Requires B1/B2 |
| ENG-DB-041 | Messaging dispatch migration | BLOCKED | Requires B1/B2 |
| ENG-DB-042 | Events / attribution migration | BLOCKED | Requires B1/B2 |
| ENG-DB-043 | Index / performance migration | BLOCKED | Requires B1/B2 |
| ENG-DB-044 | RLS / permission seed migration | BLOCKED | Requires B1/B2 |

### Gate B3

```text
Status:
BLOCKED

Reason:
Business Rules and ER V2 are not frozen.
```

---

## B4 — Content Foundation

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| CONTENT-001 | Create draft post | BLOCKED | Requires B1/B2/B3 |
| CONTENT-002 | Edit draft post | BLOCKED | Requires CONTENT-001 |
| CONTENT-003 | Publish post | BLOCKED | Requires lifecycle rules |
| CONTENT-004 | Schedule post | BLOCKED | Requires scheduling rules |
| CONTENT-005 | Archive post | BLOCKED | Requires lifecycle rules |
| CONTENT-006 | Product-linked post | BLOCKED | Requires product read contract |
| CONTENT-007 | Promotion post | BLOCKED | Requires promotion contract |
| CONTENT-008 | Live announcement post | BLOCKED | Requires live contract |
| CONTENT-009 | Article post | BLOCKED | Requires content type rules |
| CONTENT-010 | Public post page | BLOCKED | Requires visibility rules |

---

## B5 — Media Foundation

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| MEDIA-001 | Image upload contract | BLOCKED | Requires MEDIA-BR-001 |
| MEDIA-002 | Object storage strategy | IN_REVIEW | Direction approved, provider final pending |
| MEDIA-003 | Image processing sizes | BLOCKED | Requires media rules |
| MEDIA-004 | Tenant storage quota | BLOCKED | Requires USAGE-BR-001 |
| MEDIA-005 | Orphan file cleanup | BLOCKED | Requires schema and object strategy |
| MEDIA-006 | Native video hosting | DEFERRED | Not V1 |

---

## B6 — Follow + Interest

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| FOLLOW-001 | Follow merchant | BLOCKED | Requires follow rules/schema |
| FOLLOW-002 | Unfollow merchant | BLOCKED | Requires follow rules/schema |
| FOLLOW-003 | Block/suppress merchant updates | BLOCKED | Requires suppression rules |
| INTEREST-001 | Define interest topics | BLOCKED | Requires interest rules |
| INTEREST-002 | Customer update interests | BLOCKED | Requires schema |
| INTEREST-003 | Interest-based targeting read model | BLOCKED | Requires Audience rules |

---

## B7 — Customer Feed MVP

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| FEED-001 | Feed query V1 | BLOCKED | Requires Content + Follow + Interest |
| FEED-002 | Cursor pagination | BLOCKED | Requires Feed query model |
| FEED-003 | Feed ranking V1 | BLOCKED | Requires FEED-BR-001 |
| FEED-004 | Visibility enforcement | BLOCKED | Requires CONTENT-BR-002 |
| FEED-005 | Feed event tracking | BLOCKED | Requires FEED-BR-002 |
| FEED-006 | Customer feed page | BLOCKED | Requires API/query |

---

## B8 — Consent Center

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| CONSENT-001 | Consent channel model | BLOCKED | Requires CONSENT-BR-001 |
| CONSENT-002 | Consent purpose model | BLOCKED | Requires CONSENT-BR-002 |
| CONSENT-003 | Grant consent | BLOCKED | Requires schema |
| CONSENT-004 | Revoke consent | BLOCKED | Requires revoke rule |
| CONSENT-005 | Consent event log | BLOCKED | Requires event rules |
| CONSENT-006 | Preference page | BLOCKED | Requires UI/API |
| CONSENT-007 | Dispatch-time consent check | BLOCKED | Required before Campaign |

---

## B9 — Retention Intelligence MVP

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| RETENTION-001 | Customer metrics projection | BLOCKED | Requires orders read contract |
| RETENTION-002 | RFM calculation | BLOCKED | Requires RETENTION-BR-001 |
| RETENTION-003 | Segment classification | BLOCKED | Requires RETENTION-BR-002 |
| RETENTION-004 | Retention metrics refresh worker | BLOCKED | Requires schema |
| RETENTION-005 | Retention dashboard cards | BLOCKED | Requires metrics |

---

## B10 — Audience Engine

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| AUDIENCE-001 | Segment definition model | BLOCKED | Requires AUDIENCE-BR-001 |
| AUDIENCE-002 | Segment preview count | BLOCKED | Requires customer/order read models |
| AUDIENCE-003 | Audience snapshot creation | BLOCKED | Requires AUDIENCE-BR-002 |
| AUDIENCE-004 | Snapshot member table | BLOCKED | Requires ER freeze |
| AUDIENCE-005 | Audience audit | BLOCKED | Requires snapshot rules |

---

## B11 — Campaign Foundation

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| CAMPAIGN-001 | Campaign lifecycle model | BLOCKED | Requires CAMPAIGN-BR-001 |
| CAMPAIGN-002 | Draft campaign | BLOCKED | Requires schema |
| CAMPAIGN-003 | Schedule campaign | BLOCKED | Requires schedule rules |
| CAMPAIGN-004 | Prepare run | BLOCKED | Requires audience snapshot |
| CAMPAIGN-005 | Pause/cancel campaign | BLOCKED | Requires cancellation rules |
| CAMPAIGN-006 | Campaign audit | BLOCKED | Requires lifecycle |

---

## B12 — Messaging Orchestrator

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| MSG-001 | Messaging canonical model | BLOCKED | Requires MSG-BR-001 |
| MSG-002 | Message job queue | BLOCKED | Requires schema |
| MSG-003 | Provider adapter interface | BLOCKED | Requires provider rules |
| MSG-004 | LINE adapter | BLOCKED | Requires provider contract |
| MSG-005 | Email adapter | BLOCKED | Requires provider contract |
| MSG-006 | SMS adapter | BLOCKED | Requires provider contract |
| MSG-007 | Delivery attempts | BLOCKED | Requires retry/failure rules |
| MSG-008 | Dead-letter handling | BLOCKED | Requires failure rules |
| MSG-009 | Usage metering | BLOCKED | Requires USAGE-BR-001 |

---

## B13 — Content-to-Campaign Workflow

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| C2C-001 | Publish + choose audience | BLOCKED | Requires Content + Audience |
| C2C-002 | Estimate reach | BLOCKED | Requires audience preview |
| C2C-003 | Estimate usage/cost | BLOCKED | Requires usage model |
| C2C-004 | Schedule notification | BLOCKED | Requires Campaign + Messaging |
| C2C-005 | Post campaign result summary | BLOCKED | Requires Attribution |

---

## B14 — Live Reminder Workflow

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| LIVE-REM-001 | Live announcement content type | BLOCKED | Requires Content rules |
| LIVE-REM-002 | Customer remind-me action | BLOCKED | Requires Feed + Consent |
| LIVE-REM-003 | Reminder schedule rule | BLOCKED | Requires Business Rule |
| LIVE-REM-004 | Dispatch reminders | BLOCKED | Requires Campaign + Messaging |
| LIVE-REM-005 | Reminder analytics | BLOCKED | Requires Attribution |

---

## B15 — Attribution V1

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| ATTR-001 | Attribution model definition | BLOCKED | Requires ATTR-BR-001 |
| ATTR-002 | Campaign click tracking | BLOCKED | Requires Events |
| ATTR-003 | Order attribution read model | BLOCKED | Requires Order contract |
| ATTR-004 | Campaign revenue report | BLOCKED | Requires ATTR-BR-002 |
| ATTR-005 | ROI dashboard | BLOCKED | Requires cost meter |

---

## B16 — Customer Portal

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| PORTAL-001 | Customer profile page | BLOCKED | Requires auth/customer identity |
| PORTAL-002 | Followed merchants | BLOCKED | Requires Follow |
| PORTAL-003 | Feed page | BLOCKED | Requires Feed |
| PORTAL-004 | Coupons / points page | BLOCKED | Requires Loyalty contract |
| PORTAL-005 | Notification preference page | BLOCKED | Requires Consent Center |
| PORTAL-006 | Order history page | BLOCKED | Requires Order read contract |

---

## B17 — Automation Engine

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| AUTO-001 | Automation architecture review | DEFERRED | After manual campaign stable |
| AUTO-002 | Trigger model | DEFERRED |  |
| AUTO-003 | Condition model | DEFERRED |  |
| AUTO-004 | Delay/action model | DEFERRED |  |
| AUTO-005 | Automation run history | DEFERRED |  |

---

# 9. Shared Security / Operations Status

## Security

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| SEC-001 | RLS test framework | VALIDATED | SQL suites and runner passed at 2026-07-27 |
| SEC-002 | Cross-tenant test suite | VALIDATED | Auth/profile/membership, domain RLS, permission layer, and role matrix checks passed at 2026-07-27 |
| SEC-003 | Public feed rate limit | BLOCKED | Requires Feed routes |
| SEC-004 | Upload abuse protection | BLOCKED | Requires Media |
| SEC-005 | Webhook signature verification | BLOCKED | Shipping carrier webhook boundary validated locally; broader provider integrations still require provider contracts |
| SEC-006 | Secret management review | NOT_STARTED | Before provider integration |
| SEC-007 | Support/admin access audit | NOT_STARTED | SaaS hardening |

---

## DoS / Rate Limit / Quota

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| DOS-001 | Global rate limit plan | IN_REVIEW | Needs implementation target |
| DOS-002 | Per-tenant API quota | BLOCKED | Requires usage model |
| DOS-003 | Upload quota | BLOCKED | Requires Media rules |
| DOS-004 | Campaign recipient quota | BLOCKED | Requires Campaign rules |
| DOS-005 | Provider spend guardrail | BLOCKED | Requires Messaging + Pricing model |
| DOS-006 | Kill switch design | NOT_STARTED | Required before SaaS beta |

---

## Observability

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| OPS-001 | Logging fields standard | NOT_STARTED | request_id / organization_id |
| OPS-002 | API error monitoring | NOT_STARTED |  |
| OPS-003 | DB slow query monitoring | NOT_STARTED |  |
| OPS-004 | Queue depth monitoring | BLOCKED | Requires workers |
| OPS-005 | Campaign provider failure monitoring | BLOCKED | Requires Messaging |
| OPS-006 | Usage/cost dashboard | BLOCKED | Requires usage meter |

---

## Backup / Recovery

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| BACKUP-001 | Database backup policy | NOT_STARTED |  |
| BACKUP-002 | Restore drill | NOT_STARTED | Required before production |
| BACKUP-003 | Object storage recovery policy | BLOCKED | Requires media provider |
| BACKUP-004 | Tenant export strategy | NOT_STARTED | SaaS hardening |
| BACKUP-005 | Tenant deletion/anonymization strategy | BLOCKED | Requires privacy rules |

---

# 10. Cost / Scale Status

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| COST-001 | Cost model 10 merchants | REFERENCE | Draft exists |
| COST-002 | Cost model 1,000 merchants | REFERENCE | Draft exists |
| COST-003 | Cost model 10,000 merchants | REFERENCE | Draft exists |
| COST-004 | Usage meter list | IN_REVIEW | Needs Business Rule approval |
| COST-005 | Per-tenant cost attribution | BLOCKED | Requires usage table |
| COST-006 | Plan/Quota model | BLOCKED | Requires commercial decision |
| SCALE-001 | High-volume event strategy | IN_REVIEW | Needs event retention rule |
| SCALE-002 | Media scale strategy | IN_REVIEW | Needs provider decision |
| SCALE-003 | Campaign dispatch scale strategy | BLOCKED | Requires Messaging design |
| SCALE-004 | Extraction candidate tracking | DEFERRED | After measured bottleneck |

---

# 11. AI Governance Status

| Task ID | Task | Status | Notes |
|---|---|---:|---|
| AI-GOV-001 | Master Roadmap created | APPROVED | `ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md` |
| AI-GOV-002 | AI Coding Constitution created | APPROVED | `ACOS_AI_CODING_CONSTITUTION.md` |
| AI-GOV-003 | Implementation Status created | ACTIVE | This document |
| AI-GOV-004 | AI handoff template adopted | APPROVED | Use every task |
| AI-GOV-005 | BLOCKED format adopted | APPROVED | Use when ambiguity exists |
| AI-GOV-006 | Task ID convention adopted | APPROVED | CORE / CONTENT / FEED / etc. |
| AI-GOV-007 | Governance docs placed in repository and README read order added | IMPLEMENTED | README references mandatory read order |

---

# 12. Immediate Next Tasks

ลำดับงานถัดไปที่แนะนำ

```text
01. Put governance docs into repository
02. Confirm paths in README.md
03. Run Track A Fresh DB Validation
04. Start Track B Business Rule Review
05. Freeze BUSINESS_RULES_CONTENT_RETENTION_V1.md
06. Freeze ER_DIAGRAM_V2_CONTENT_RETENTION.md
07. Generate migration 035+
08. Replay 001→latest on fresh DB
09. Implement Content Foundation
10. Implement Consent Center
11. Implement Follow / Interest
12. Implement Customer Feed
13. Implement Retention / Audience
14. Implement Campaign / Messaging
15. Implement Attribution
```

---

# 13. Recommended First AI Coding Tasks

## Task 1 — Put docs in repository

```text
TASK ID:
AI-GOV-007

OBJECTIVE:
Add governance and roadmap documents to the repository under approved paths.

ALLOWED FILES:
docs/governance/ACOS_AI_CODING_CONSTITUTION.md
docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
README.md

FORBIDDEN:
Modify migrations
Modify schema
Modify source code
Invent new architecture

DONE WHEN:
Files exist at approved paths
README references the mandatory read order
No production code changed
```

---

## Task 2 — Fresh DB validation

```text
TASK ID:
CORE-DB-001

OBJECTIVE:
Validate migration 001–034 on a fresh Supabase development project.

ALLOWED:
supabase/migrations
docs/migrations/SUPABASE_MIGRATION_V1_STATUS.md
tests/database if required

FORBIDDEN:
Implement new features
Generate Track B migrations
Modify historical migrations without explicit approval

DONE WHEN:
Replay result is documented
Failures are listed with root cause
Repair strategy is proposed but not applied without approval
```

---

## Task 3 — Track B Business Rule Review

```text
TASK ID:
CONTENT-BR-001 to USAGE-BR-001

OBJECTIVE:
Create BUSINESS_RULES_CONTENT_RETENTION_V1.md

ALLOWED:
docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md

FORBIDDEN:
Generate SQL
Implement code
Invent final rule without owner approval

DONE WHEN:
All schema-impacting rules are APPROVED or DEFERRED
```

---

# 14. Current Blockers

| Blocker ID | Affected Area | Description | Required Decision |
|---|---|---|---|
| BLK-002 | Track B | Business Rules Content/Retention not frozen | Conduct review |
| BLK-003 | Track B | ER V2 not frozen | Wait for business rule approval |
| BLK-004 | Track B | Migration 035+ not generated | Wait for ER freeze |
| BLK-005 | Messaging | Provider contract not frozen | Decide LINE/SMS/Email integration strategy |
| BLK-006 | Cost | Plan/quota/commercial rules not frozen | Decide pricing/usage model later |
| BLK-007 | Media | Object storage provider not finalized | Decide Supabase Storage vs Cloudflare R2 strategy |
| BLK-008 | Automation | Manual campaign flow not stable | Defer automation |

---

# 15. Current Allowed Work

ตอนนี้สามารถทำได้โดยไม่ชนกับ blocker:

```text
Governance file placement
README update
Fresh DB validation planning
Migration replay test setup
Commerce Core test planning
Business Rule Review preparation
Content/Retention rule drafting
ER V2 review notes
Cost model refinement
Security checklist refinement
Fresh replay protocol refinement
Non-destructive validation reporting
Admin MVP service contract planning
Admin app shell/RBAC navigation planning
```

---

# 16. Current Forbidden Work

ตอนนี้ยังไม่ควรทำ:

```text
Generate migration 035+
Implement Content production tables
Implement Campaign dispatch
Implement LINE/SMS/Email send
Implement Automation engine
Create duplicate customer tables
Change historical migrations 001–034
Change Customer/Product/Order source of truth
Assume final consent purposes
Assume final attribution window
Assume unlimited message usage
```

---

# 17. Status Update Protocol

เมื่อมีงานเสร็จ ให้ update section ที่เกี่ยวข้อง

ตัวอย่าง:

```text
Before:
CORE-DB-002 | Replay migration 001–034 | NOT_STARTED

After:
CORE-DB-002 | Replay migration 001–034 | VALIDATED
Notes:
Replay passed on fresh Supabase project at YYYY-MM-DD.
```

ถ้า Block:

```text
Status:
BLOCKED

Notes:
Failed at migration 017 due to missing extension.
Decision required: repair historical migration or add preflight migration?
```

---

# 18. AI Completion Report Requirement

ทุกครั้งที่ AI ทำ task เสร็จ ต้องตอบกลับรูปแบบนี้:

```text
STATUS:
COMPLETED / BLOCKED / PARTIAL

TASK ID:
<id>

CHANGES:
- ...

FILES CHANGED:
- ...

DATABASE:
- none / migration xxx

TESTS:
- ...

SECURITY / RLS:
- ...

STATUS FILE UPDATE:
- section updated / not updated and why

KNOWN LIMITATIONS:
- ...

NEXT RECOMMENDED TASK:
- ...
```

---

# 19. Versioning

| Version | Date | Description |
|---|---|---|
| V1 | 2026-07-27 | Initial implementation status checkpoint |

---

# 20. Current Overall Status

```text
ACOS Governance:
READY

Track A Commerce Core:
BASELINE + A2 INTEGRATION VALIDATED
A3 ADMIN SERVICE CONTRACT MAP HARDENED_IN_REVIEW
CORE-UI-DESIGN-001 ADMIN VISUAL SYSTEM PASS IMPLEMENTED
CORE-UI-001 ADMIN APP SHELL IMPLEMENTED
CORE-UI-002 PRODUCTS READ-ONLY SCREEN IMPLEMENTED
CORE-UI-003 INVENTORY READ-ONLY SCREEN IMPLEMENTED
CORE-UI-004 CUSTOMERS READ-ONLY SCREEN IMPLEMENTED
CORE-UI-005 ORDERS READ-ONLY SCREEN IMPLEMENTED
CORE-UI-006 PAYMENTS READ-ONLY SCREEN IMPLEMENTED
CORE-UI-007 FULFILLMENT READ-ONLY SCREEN IMPLEMENTED
CORE-UI-008 WAREHOUSE QC READ-ONLY SCREEN IMPLEMENTED
CORE-UI-009 SHIPPING READ-ONLY SCREEN IMPLEMENTED
CORE-UI-010 RETURNS READ-ONLY SCREEN IMPLEMENTED
CORE-UI-011 PROMOTIONS READ-ONLY SCREEN IMPLEMENTED
CORE-UI-012 USERS / ROLES READ-ONLY SCREEN IMPLEMENTED
CORE-UI-013 SETTINGS READ-ONLY SCREEN IMPLEMENTED
A3 READ-ONLY ADMIN QA + DASHBOARD RECONCILIATION IMPLEMENTED
A3 GUARDED ACTION SERVICE CONTRACT HARDENING IMPLEMENTED
A3 LOW-RISK GUARDED ADMIN ACTION SKELETONS IMPLEMENTED
A3 PERMISSION-AWARE UI AFFORDANCES IMPLEMENTED
A3 MEMBER INVITE AUDITED PERSISTENCE CONTRACT IMPLEMENTED
A3 MEMBER INVITE DB-ONLY PERSISTENCE IMPLEMENTED
A3 MEMBER INVITE UI VALIDATION + SUBMIT ENABLEMENT IMPLEMENTED
A3 MEMBER INVITE AUTH ADMIN EMAIL-SEND BOUNDARY IMPLEMENTED
A3 MEMBER INVITE ACCEPTANCE + MEMBERSHIP ACTIVATION IMPLEMENTED
NEXT: A3 member role assignment guarded action boundary

Track B Customer Engagement:
ARCHITECTURE DIRECTION APPROVED
NEXT: Business Rule Review

Implementation:
CONTROLLED START

Latest validation:
Fresh local Supabase replay passed for migrations 001-latest at 2026-07-27.
Security/RLS/workflow/commerce integration suites passed after fresh reset.
Gate A1 and Gate A2 are PASSED.
```

---

**END — ACOS IMPLEMENTATION STATUS**

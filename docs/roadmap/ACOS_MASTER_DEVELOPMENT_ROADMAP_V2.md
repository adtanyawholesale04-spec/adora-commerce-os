# ADORA Commerce OS (ACOS)
# MASTER DEVELOPMENT ROADMAP V2

**Project Name:** ADORA Commerce OS
**Short Name:** ACOS
**Repository Slug:** `adora-commerce-os`
**Document:** `ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
**Status:** MASTER EXECUTION MAP
**Purpose:** ใช้เป็น Roadmap กลางสำหรับพัฒนา ACOS Commerce Core และ Content + Customer Feed + Retention ควบคู่กัน โดยมนุษย์และ AI Coding Agent ต้องยึดลำดับ, dependency, module boundary และ gate จากเอกสารนี้

---

# 0. Executive Decision

ACOS จะพัฒนาเป็น **Modular Monolith** ในช่วงแรก

แนวทาง:

```text
One Product
One Repository
One Primary PostgreSQL Database
One Tenant Model
One Auth / Permission Model

แต่

หลาย Domain Module
หลาย Development Track
หลาย Package Owner
หลาย Worker ที่แยก process ได้
```

ไม่แยก Microservices / Database per module ตั้งแต่เริ่ม

เหตุผล:
- ลด distributed-system complexity
- ไม่สร้าง Customer / Order / Product ซ้ำ
- transaction สำคัญยังอยู่ใน boundary เดียว
- AI Coding Agent เข้าใจ dependency ได้ง่ายกว่า
- deploy / rollback / migration ง่ายกว่า
- สามารถ extract high-throughput modules ออกเป็น service ภายหลังได้

---

# 1. Product Structure

```text
ADORA Commerce OS
│
├── TRACK A — COMMERCE CORE
│   ├── Organization / Auth / RBAC
│   ├── Product Catalog
│   ├── Inventory
│   ├── Customer Master
│   ├── Conversation / Live
│   ├── Cart / Purchase Session
│   ├── Order
│   ├── Promotion
│   ├── Payment / Credit / Loyalty
│   ├── Fulfillment
│   ├── Warehouse QC
│   ├── Shipping
│   ├── Return / RTO
│   ├── Notification
│   ├── Audit
│   └── SaaS Entitlement / Usage
│
└── TRACK B — CUSTOMER ENGAGEMENT PLATFORM
    ├── Content
    ├── Media
    ├── Follow
    ├── Customer Interest
    ├── Customer Feed
    ├── Consent
    ├── Audience / Segmentation
    ├── Retention Intelligence
    ├── Campaign
    ├── Messaging
    ├── Attribution
    └── Automation
```

Track B เป็น Module ของ ACOS ไม่ใช่ระบบอิสระที่สร้าง Customer Database ของตัวเอง

---

# 2. Non-Negotiable Architecture Rules

AI Coding Agent ห้ามฝ่าฝืนกฎเหล่านี้

## ARCH-001 — Single Customer Source of Truth

`customers` ของ Commerce Core เป็น Customer Master

ห้ามสร้าง:
- `content_customers`
- `marketing_customers`
- `retention_customers`
- `campaign_customers`

เพื่อแทน Customer Master

---

## ARCH-002 — Single Product Source of Truth

Content สามารถอ้างถึง Product / Variant ได้

แต่ห้ามสร้าง Product Catalog ซ้ำ

---

## ARCH-003 — Single Order Source of Truth

Retention / Campaign Attribution อ่าน Order ได้

แต่ห้ามเปลี่ยน historical order เพื่อให้เข้ากับ campaign ภายหลัง

---

## ARCH-004 — Tenant Boundary

Tenant-owned tables ต้องมี:

```text
organization_id
```

และต้องเข้ากับ RLS strategy ของ ACOS

---

## ARCH-005 — Module Ownership

Module หนึ่งห้ามเขียน table ภายในของ module อื่นโดยพลการ

ตัวอย่าง:

```text
Campaign
  ↓
Messaging Contract
  ↓
Messaging Module
  ↓
LINE Adapter
```

ไม่ใช่:

```text
Campaign
  ↓
LINE API โดยตรง
```

---

## ARCH-006 — Forward-only Migration

Migration `001–034` ของ Commerce Core ห้ามแก้ย้อนหลัง

Content + Retention ใช้ migration ใหม่ตั้งแต่ `035+`

---

## ARCH-007 — Messaging Provider Cost

LINE / SMS / Email ต้องถูกมองเป็น metered external usage

ห้ามออกแบบ Unlimited Provider Usage เป็น default SaaS contract

---

## ARCH-008 — Consent Before Marketing Delivery

Audience eligibility ไม่เท่ากับสิทธิ์ส่งข้อความ

ก่อน dispatch ต้องตรวจ current consent / suppression อีกครั้ง

---

## ARCH-009 — No Premature Microservices

ห้าม extract service เพียงเพราะ module code ใหญ่

extract เมื่อมีเหตุผลเช่น:
- throughput
- independent scaling
- isolation
- reliability boundary
- deployment cadence
- provider workload

---

## ARCH-010 — No Fan-out Feed Table at Publish Time

ห้ามสร้าง:

```text
customer_count × post_count
```

เป็น feed rows ล่วงหน้าทุกคน

Feed V1 ใช้ query/ranking/projection แบบควบคุมได้

---

# 3. Repository Target Structure

```text
adora-commerce-os/
│
├── apps/
│   ├── admin-web/
│   └── customer-web/
│
├── packages/
│   ├── platform/
│   ├── auth/
│   ├── commerce/
│   ├── customer/
│   ├── content/
│   ├── feed/
│   ├── consent/
│   ├── audience/
│   ├── retention/
│   ├── campaign/
│   ├── messaging/
│   ├── analytics/
│   └── integrations/
│
├── workers/
│   ├── campaign-dispatch/
│   ├── event-consumer/
│   ├── retention-refresh/
│   └── projection-refresh/
│
├── supabase/
│   └── migrations/
│
├── docs/
│   ├── architecture/
│   ├── business-rules/
│   ├── er/
│   ├── roadmap/
│   ├── api-contracts/
│   ├── runbooks/
│   └── testing/
│
└── tests/
    ├── integration/
    ├── rls/
    ├── contract/
    └── load/
```

---

# 4. Roadmap Status Vocabulary

ใช้สถานะเดียวกันทั้งมนุษย์และ AI

```text
IDEA
UNDER_REVIEW
PROPOSED
APPROVED
READY_FOR_IMPLEMENTATION
IN_PROGRESS
BLOCKED
IMPLEMENTED
VALIDATED
REJECTED
DEFERRED
```

Feature ที่ยังไม่ `READY_FOR_IMPLEMENTATION` ห้าม AI สร้าง production implementation แบบถือว่า final

---

# 5. Master Phase Map

```text
PHASE 0    Governance / Baseline
   ↓
PHASE 1A   Commerce Core Validation
   ║
   ║ parallel
   ║
PHASE 1B   Engagement Business Rule Review
   ↓
PHASE 2B   Engagement ER / Schema Freeze
   ↓
PHASE 3B   Foundation Implementation
   ↓
PHASE 4B   Feed MVP
   ↓
PHASE 5B   Retention & Audience
   ↓
PHASE 6B   Campaign & Messaging
   ↓
PHASE 7B   Attribution & ROI
   ↓
PHASE 8B   Automation
   ↓
PHASE 9    SaaS Hardening
   ↓
PHASE 10   Scale Validation
   ↓
PHASE 11   Production / Commercial Release
```

Commerce Core ไม่ต้องหยุดทั้งหมดระหว่าง Track B

แต่ทั้งสอง track ต้องผ่าน Shared Gates ก่อน integration ที่กระทบ source-of-truth

---

# 6. PHASE 0 — PROJECT GOVERNANCE BASELINE

## Goal

ทำให้ AI และ Developer ทุกตัวมีเอกสารอ้างอิงเดียวกัน

## Required Documents

```text
ADORA_COMMERCE_OS_PROJECT_IDENTITY.md
PROJECT_BLUEPRINT_V13.md
BUSINESS_RULES_V13.md
DATABASE_SCHEMA_V1_FROZEN_V3.md
SUPABASE_MIGRATION_V1_STATUS.md
WAREHOUSE_PICKING_QC_MODEL_V1.md

ACOS_ARCHITECTURE_V2_CONTENT_RETENTION.md
ER_DIAGRAM_V2_CONTENT_RETENTION.md
COST_SCALE_MODEL_V1.md
MIGRATION_PLAN_CONTENT_RETENTION_V1.md

ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
```

## Output

AI Project Context / Coding Constitution

## Gate G0

PASS เมื่อ:
- canonical naming ตรงกัน
- latest docs ถูกระบุชัด
- deprecated docs ไม่ถูกใช้เป็น source of truth
- migration baseline = `001–034`
- module ownership ถูกระบุ

---

# 7. TRACK A — COMMERCE CORE ROADMAP

# A1 — Fresh Database Validation

สถานะเป้าหมาย:

```text
MIGRATION 001–034
GENERATED → REPLAYED → VALIDATED
```

## Tasks

- create fresh Supabase development project
- run migration `001–034`
- fix dependency errorsโดยสร้าง migration ใหม่หรือแก้เฉพาะก่อน production freeze ตาม policy ที่อนุมัติ
- Auth → Profile → Membership test
- RLS tenant isolation test
- seeded roles/permissions test
- RPC permission test

## Gate A1

PASS เมื่อ fresh replay สำเร็จ 100%

---

# A2 — Commerce Integration Test

ทดสอบ flow:

```text
Product
→ Variant
→ Stock
→ Customer
→ Conversation / Live
→ Cart
→ Purchase Session
→ Order
→ Promotion
→ Payment
→ Fulfillment
→ QC
→ Shipment
→ Return
```

## Critical Cases

- inventory reservation concurrency
- promotion immutable snapshot
- payment retry/idempotency
- QC incorrect scan
- QC pass gate
- final label gate
- return / partial return
- RTO
- audit completeness

---

# A3 — Admin Application MVP

Admin modules:

```text
Dashboard
Products
Inventory
Customers
Orders
Payments
Fulfillment
QC
Shipping
Returns
Promotions
Users / Roles
Settings
```

CRUD ต้องผ่าน Service/Application layer

ห้ามให้ browser เขียน sensitive table โดยตรงเพียงเพราะ Supabase ทำได้

---

# A4 — Live / Conversation Workflow

พัฒนา:

- Live Session
- contextual Sale Code
- customer conversation
- cart from conversation
- purchase session
- order consolidation
- staff ownership

---

# A5 — Commerce Core Stabilization

Gate:

```text
COMMERCE_CORE = OPERATIONALLY USABLE
```

ก่อนเรียกว่า Stable ต้องผ่าน:
- error handling
- audit
- retry
- concurrency
- backup
- monitoring
- test coverage
- permissions

---

# 8. TRACK B — CUSTOMER ENGAGEMENT ROADMAP

# B1 — Business Rule Review

ทำก่อน SQL

หัวข้อหลัก:

```text
Content
Media
Visibility
Follow
Interest
Consent
Suppression
Feed
Audience
Segment
Retention
Campaign
Messaging
Attribution
Automation
Usage / Quota
```

## Output

`BUSINESS_RULES_CONTENT_RETENTION_V1.md`

## Gate B1

ทุก rule ที่กระทบ Schema ต้องเป็น:

```text
APPROVED
```

หรือ

```text
DEFERRED
```

ห้ามเหลือ ambiguity ที่ทำให้ table design เปลี่ยนได้

---

# B2 — ER Diagram V2 Freeze

## Proposed Domains

```text
content_posts
content_media
content_product_links

merchant_follows
interest_topics
customer_interests

customer_consents
customer_consent_events
customer_suppressions

audience_segments
audience_segment_rules
audience_snapshots
audience_snapshot_members

customer_retention_metrics

marketing_campaigns
campaign_runs

message_jobs
message_delivery_attempts

content_events
attribution_events
```

## Gate B2

ต้อง review:
- PK
- FK
- organization_id
- lifecycle
- state machine
- indexes
- RLS
- retention
- append-only candidates
- audit
- privacy / deletion behavior

---

# B3 — Migration 035+ Generation

Tentative sequence:

```text
035_content_core.sql
036_customer_follow_interest.sql
037_consent_preferences.sql
038_audience_segments.sql
039_retention_metrics.sql
040_marketing_campaigns.sql
041_message_dispatch.sql
042_content_events_attribution.sql
043_content_retention_indexes.sql
044_content_retention_rls.sql
045_content_retention_permissions_seed.sql
```

หมายเหตุ:
เลขจริง freeze หลัง ER Review

## Gate B3

Fresh DB ต้อง replay:

```text
001 → 045
```

จากศูนย์ได้

---

# B4 — Content Foundation

## Merchant Admin

- create post
- edit draft
- publish
- schedule
- archive
- product link
- promotion link
- live announcement
- article
- image upload

## Customer

- public post URL
- merchant profile
- post detail

## Not Yet

- comments
- DMs
- repost
- reels clone
- native video streaming
- creator network

---

# B5 — Media Foundation

V1:

```text
Images → Object Storage
Metadata → PostgreSQL
```

Required:
- mime validation
- size limit
- tenant quota
- original
- thumbnail
- feed size
- large size
- cleanup orphan files
- signed upload strategy
- abuse control

Native video hosting = DEFERRED

---

# B6 — Follow + Interest

Customer สามารถ:

- follow merchant
- unfollow
- choose interests
- update interests
- opt into live notification
- change communication preference

## Gate B6

ต้องไม่มี dependency กับ social graph

V1 คือ:

```text
Customer → Merchant
Customer → Interests
```

ไม่ใช่:

```text
Customer ↔ Customer
```

---

# B7 — Customer Feed MVP

Ranking V1 ใช้ deterministic/simple rules:

```text
Follow
+
Interest Match
+
Product/Purchase Category Match
+
Recency
+
Content Priority
```

ห้ามเริ่มด้วย ML recommendation

## Required

- pagination/cursor
- publish visibility
- tenant scoping
- basic ranking
- basic tracking
- no fan-out explosion

---

# B8 — Consent Center

Channels:

```text
LINE
SMS
EMAIL
PHONE
```

Purpose ตัวอย่าง:

```text
ORDER_UPDATE
LIVE_NOTIFICATION
PROMOTION
NEW_PRODUCT
LOYALTY
```

Required:
- grant
- revoke
- source
- version
- timestamp
- event history
- suppression
- customer self-service preference page

## Hard Gate

Marketing campaign dispatch ห้ามเริ่มก่อน Consent Center ผ่าน test

---

# B9 — Retention Intelligence MVP

Metrics:

```text
first_purchase_at
last_purchase_at
order_count
lifetime_value
average_order_value
purchase_frequency
recency_days
```

Segments:

```text
CHAMPION
LOYAL
POTENTIAL_LOYALIST
NEW
AT_RISK
LOST
```

V1 ใช้ rule-based RFM

AI prediction / churn model = later phase

---

# B10 — Audience Engine

รองรับ:

- static segment
- dynamic segment rule
- preview audience
- count
- snapshot

Critical concept:

```text
Segment Definition
       ↓
Evaluate
       ↓
Audience Snapshot
       ↓
Campaign Run
```

Campaign ต้องอ้าง snapshot

เพื่อ audit ว่าตอนส่งเลือกใครบ้าง

---

# B11 — Campaign Foundation

Campaign states:

```text
DRAFT
SCHEDULED
PREPARING
RUNNING
PAUSED
COMPLETED
CANCELLED
FAILED
```

Required:
- campaign content
- audience
- channel
- schedule
- dry-run / preview
- expected recipient count
- estimated external usage
- cancel
- retry
- audit

---

# B12 — Messaging Orchestrator

Architecture:

```text
Campaign
   ↓
Audience Snapshot
   ↓
Current Consent Check
   ↓
Message Job
   ↓
Queue
   ↓
Provider Adapter
   ├── LINE
   ├── SMS
   └── Email
```

Provider API ห้ามอยู่ใน Campaign domain

Required:
- provider adapter
- retry
- exponential backoff
- idempotency
- delivery receipt
- provider error mapping
- dead-letter path
- quota enforcement

---

# B13 — LINE Integration

V1:
- merchant connects own LINE OA
- account/channel config encrypted
- webhook verification
- user identity mapping where supported
- push delivery
- delivery tracking available from provider
- unsubscribe / block-aware handling

LINE provider cost ไม่ถือเป็น platform unlimited cost

---

# B14 — Email Integration

V1:
- provider adapter
- domain/sender configuration
- template rendering
- unsubscribe
- bounce
- complaint/suppression
- delivery status

---

# B15 — SMS Integration

V1:
- provider adapter
- sender configuration
- cost estimate
- delivery status
- failure handling
- consent enforcement
- tenant quota

SMS ต้องมี hard spend guardrail

---

# B16 — Content-to-Campaign Workflow

Merchant workflow:

```text
Create Post
   ↓
Publish
   ↓
Select Audience
   ↓
Preview Reach
   ↓
Choose Channel
   ↓
Estimate Usage
   ↓
Schedule / Send
```

นี่คือจุดที่ Content + Retention เริ่มให้ value จริง

---

# B17 — Live Reminder Workflow

```text
Create Live Announcement
       ↓
Customer presses Remind Me
       ↓
LIVE_REMINDER_REQUESTED
       ↓
Schedule notification
       ↓
Consent check
       ↓
Send
```

รองรับ:
- 24 hour
- 1 hour
- 10 minute

ตาม rule ที่ approve

---

# B18 — Attribution V1

ต้องตอบให้ได้ว่า:

```text
Campaign
  ↓
Message
  ↓
Click
  ↓
Session / Customer
  ↓
Order
  ↓
Revenue
```

Dashboard:

```text
Audience
Sent
Delivered
Clicked
Orders
Revenue
Message Cost
Campaign ROI
Repeat Purchase Revenue
```

Attribution model V1 ต้องชัดก่อน implementation

---

# B19 — Customer Portal

Mobile-first Web / PWA

Features:

```text
Profile
Followed Merchant
Feed
Order History
Coupons
Points
Live Reminder
Notification Preference
Consent Center
```

Native mobile app ยังไม่ใช่ requirement

---

# B20 — Automation Engine

ทำหลัง Campaign manual workflow stable แล้ว

Model:

```text
TRIGGER
  ↓
CONDITION
  ↓
DELAY
  ↓
ACTION
```

Examples:
- purchase completed → wait → no repeat purchase → LINE
- birthday → coupon → LINE
- live scheduled → VIP → reminder
- customer becomes AT_RISK → win-back

Required:
- versioned automation
- run history
- idempotency
- pause
- resume
- retry
- loop prevention

---

# 9. SHARED INTEGRATION POINTS BETWEEN TRACK A AND TRACK B

สอง Track เชื่อมกันเฉพาะผ่าน contract ที่กำหนด

| Track B Needs | Source |
|---|---|
| Merchant | Organization Core |
| Staff | Auth/RBAC |
| Customer | Customer Master |
| Product | Product Catalog |
| Category | Product Catalog |
| Purchase Behavior | Orders |
| LTV | Orders/Payment projection |
| Loyalty | Loyalty |
| Coupon | Coupon/Promotion |
| Live | Live Session |
| Order Attribution | Orders |
| Subscription Limit | SaaS Entitlement |
| Audit | Audit Core |
| Notifications | Notification/Messaging boundary |

---

# 10. PARALLEL DEVELOPMENT MATRIX

## Workstreams that CAN run together

```text
A1 Fresh DB Validation
        ║
        ║
B1 Business Rule Review
```

---

```text
A2 Commerce Integration Tests
        ║
        ║
B2 ER V2 Design
```

---

```text
A3 Admin Commerce UI
        ║
        ║
B3/B4 Content Foundation
```

---

```text
A4 Live/Conversation
        ║
        ║
B6 Follow/Interest + B7 Feed
```

---

## Workstreams that MUST WAIT

Campaign Messaging ต้องรอ:

```text
Consent
+
Audience Snapshot
+
Queue/Worker foundation
+
Usage Guardrail
```

Retention Attribution ต้องรอ:

```text
stable Customer ID
+
stable Order data
```

Customer Feed personalization using purchase behavior ต้องรอ:

```text
Customer ↔ Order identity integrity
```

Automation ต้องรอ:

```text
Campaign manual flow stable
```

---

# 11. AI VIBE CODING EXECUTION RULES

ก่อน AI เขียน code task ใด ๆ ต้องระบุ:

```text
PROJECT
MODULE
PHASE
TASK ID
SOURCE DOCUMENTS
DEPENDENCIES
ALLOWED TABLES
FORBIDDEN TABLES
EXPECTED OUTPUT
ACCEPTANCE TEST
```

ตัวอย่าง:

```text
PROJECT: ADORA Commerce OS
MODULE: Content
PHASE: B4
TASK: CONTENT-004

READ FIRST:
- ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
- BUSINESS_RULES_CONTENT_RETENTION_V1.md
- ER_DIAGRAM_V2_CONTENT_RETENTION.md

DEPENDENCY:
- organization
- auth membership
- products read contract

ALLOWED:
- content_posts
- content_product_links

FORBIDDEN:
- customers UPDATE
- products UPDATE
- orders UPDATE

OUTPUT:
- create draft post use case
- API
- validation
- unit tests

DONE WHEN:
- cross-tenant denied
- invalid product denied
- unpublished post not public
```

---

# 12. AI CODING STOP CONDITIONS

AI ต้องหยุดและรายงาน BLOCKED เมื่อ:

1. Business rule ไม่มีคำตอบ
2. Schema ใน code ไม่ตรง Frozen ER
3. ต้องแก้ migration `001–034`
4. ต้องสร้าง source-of-truth ซ้ำ
5. ต้องข้าม tenant isolation
6. ต้อง bypass permission/RLS
7. task ต้องใช้ module ที่ยังไม่ผ่าน gate
8. provider contract ยังไม่ freeze
9. field/status ใหม่ไม่มีใน business rule
10. ต้องเดา financial/consent behavior

AI ห้าม “ตัดสินใจแทน” ในกรณีเหล่านี้

---

# 13. DEFINITION OF DONE — DATABASE TASK

Database task เสร็จเมื่อ:

- migration replay ผ่าน
- FK ถูกต้อง
- constraints ถูกต้อง
- indexes review แล้ว
- RLS test แล้ว
- cross-tenant denied
- rollback/recovery strategy documented
- no destructive edit of historical migration
- seed/test fixture available
- schema doc updated

---

# 14. DEFINITION OF DONE — BACKEND TASK

- input validated
- authorization checked
- tenant checked
- idempotency where needed
- error codes defined
- audit where needed
- tests pass
- no provider secret exposed
- logging/metrics included
- API contract updated

---

# 15. DEFINITION OF DONE — FRONTEND TASK

- loading state
- empty state
- error state
- permission state
- responsive
- validation
- no direct sensitive DB mutation
- accessibility baseline
- API errors surfaced correctly
- destructive actions confirmed
- feature flag / entitlement respected

---

# 16. DEFINITION OF DONE — CAMPAIGN TASK

- audience snapshot created
- count visible
- current consent rechecked
- suppression applied
- tenant quota checked
- estimated cost/usage visible where possible
- idempotent dispatch
- retry safe
- cancel behavior defined
- provider status recorded
- audit complete

---

# 17. DEFINITION OF DONE — PRODUCTION RELEASE

ต้องผ่าน:

```text
Fresh Migration Replay
RLS Test
Cross-Tenant Test
Backup Restore Test
Load Test
Queue Failure Test
Provider Failure Test
Campaign Retry Test
Consent Revoke Test
Media Abuse Test
Rate Limit Test
Cost Attribution Test
Observability Test
```

---

# 18. SECURITY ROADMAP

## S1 — Foundation
- authentication
- membership
- roles/permissions
- RLS
- secret management

## S2 — Public Surface
- rate limiting
- bot mitigation
- upload validation
- webhook verification
- CSRF/XSS review
- signed URL where appropriate

## S3 — Messaging
- encrypted provider credentials
- provider rotation
- webhook signature
- replay protection
- send quota

## S4 — SaaS Hardening
- support access auditing
- organization suspension
- incident audit trail
- tenant export
- tenant deletion process

---

# 19. OBSERVABILITY ROADMAP

Monitor:

```text
API latency
API error rate
Database connections
Slow query
Queue depth
Queue oldest age
Worker failures
Campaign throughput
Provider failure rate
Feed latency
Image processing failure
Storage usage
Tenant usage
Unexpected spend
```

Required IDs in logs:

```text
request_id
organization_id
user_id
campaign_id
message_job_id
```

ตามความเหมาะสม

---

# 20. COST / SCALE ROADMAP

Reference scale:

| Scale | Merchants | Customers | Posts/month | Events/month |
|---|---:|---:|---:|---:|
| Pilot | 10 | ~100K | ~3K | ~1M |
| Growth | 1,000 | ~10M | ~300K | ~100M |
| Large | 10,000 | ~100M | ~3M | ~1B |

Design requirement:
- customer data ไม่ fan-out
- media แยก object storage
- event retention policy
- async messaging
- usage meter
- per-tenant quota
- provider pass-through/metered cost
- partition-ready event table
- archive strategy

---

# 21. EXTRACTION ROADMAP — WHEN MONOLITH BECOMES TOO LARGE

Candidate extraction order:

```text
1. Campaign Dispatch Worker
2. Event Ingestion
3. Media Processing
4. Analytics Aggregation
5. Feed Ranking
```

Core ที่ควรอยู่ใกล้ transaction DB นานที่สุด:

```text
Customer
Product
Inventory
Cart
Order
Payment
Fulfillment
```

---

# 22. PRODUCT RELEASE STAGES

## RELEASE R0 — Internal Engineering
- no merchant sale
- schema / integration validation

## RELEASE R1 — ADORA Internal Pilot
- ADORA ใช้เอง
- real customer data under controlled rollout
- Content
- Feed
- Consent
- basic Audience

## RELEASE R2 — ADORA Retention Pilot
- Campaign
- LINE / Email / SMS selected channel
- live reminder
- RFM
- ROI

## RELEASE R3 — Design Partner
- 3–10 external merchants
- controlled onboarding
- support-heavy
- usage/cost observation

## RELEASE R4 — SaaS Beta
- self-service merchant onboarding
- plan/entitlement
- quotas
- billing support
- monitoring

## RELEASE R5 — General Availability
- security validated
- backup/restore validated
- scale tested
- SLA/operational runbook
- incident process

---

# 23. FEATURES EXPLICITLY DEFERRED

เพื่อป้องกัน scope explosion

```text
Native short-video platform
Reels clone
Customer-to-customer social graph
Public comment system
Customer DM
Creator marketplace
Complex ML recommendation
Real-time global trend feed
Microservices per domain
Native iOS/Android app
Unlimited messaging
```

Feature เหล่านี้ต้องกลับเข้า IDEA → REVIEW process ก่อน

---

# 24. DOCUMENT UPDATE MATRIX

เมื่อ Business Rule เปลี่ยน:

```text
BUSINESS_RULES
↓
ER if data-impact
↓
MIGRATION if schema-impact
↓
API CONTRACT
↓
TEST CASE
↓
ROADMAP STATUS
```

เมื่อ Architecture เปลี่ยน:

```text
ARCHITECTURE
↓
MODULE BOUNDARY
↓
ER
↓
SECURITY
↓
DEPLOYMENT
↓
COST MODEL
```

---

# 25. MASTER TASK ID CONVENTION

```text
CORE-xxx
CONTENT-xxx
MEDIA-xxx
FEED-xxx
CONSENT-xxx
AUDIENCE-xxx
RETENTION-xxx
CAMPAIGN-xxx
MSG-xxx
ATTR-xxx
AUTO-xxx
SEC-xxx
OPS-xxx
SCALE-xxx
```

ตัวอย่าง:

```text
CONSENT-001
Design consent purposes

CONTENT-014
Schedule post publishing

CAMPAIGN-021
Create audience snapshot

MSG-008
LINE retry policy
```

---

# 26. CURRENT PROJECT POSITION

ณ Roadmap V2:

## Commerce Core

```text
Architecture        APPROVED
Business Rules      APPROVED baseline
Schema              FROZEN V1
Migration 001–034   GENERATED / COMPLETE
Next Gate           FRESH DATABASE VALIDATION
```

## Customer Engagement

```text
Architecture V2     APPROVED DIRECTION
Module Boundary     APPROVED DIRECTION
Cost Model          DRAFT / REFERENCE
ER Extension        PROPOSED
Migration 035+      RESERVED / NOT GENERATED
Business Rules      NEXT
Implementation      BLOCKED UNTIL RULE REVIEW
```

---

# 27. IMMEDIATE NEXT 10 STEPS

```text
01. Freeze this Master Roadmap V2
02. Create AI Coding Constitution / Project Context
03. Validate ACOS migration 001–034 on fresh Supabase
04. Start Content + Retention Business Rule Review
05. Freeze Business Rules V1
06. Freeze ER Diagram V2
07. Generate migration 035+
08. Replay 001→newest on fresh DB
09. Implement Content Foundation + Consent
10. Build Feed → Retention → Audience → Campaign sequentially
```

Commerce Admin UI สามารถพัฒนาคู่กับข้อ 4–8 ได้
ตราบใดที่ไม่แก้ Frozen Database Contract โดยพลการ

---

# 28. ROADMAP PRINCIPLE

เป้าหมายไม่ใช่:

> ทำ Feature ให้เยอะที่สุดเร็วที่สุด

เป้าหมายคือ:

> ทำให้แต่ละ Phase สร้าง foundation ที่ Phase ถัดไปใช้ต่อได้ โดยไม่ต้องรื้อ architecture เดิม

หลักตัดสินใจ:

```text
Correctness
   ↓
Data Integrity
   ↓
Security
   ↓
Operational Reliability
   ↓
Usability
   ↓
Performance
   ↓
Scale
   ↓
Advanced Features
```

---

# 29. FINAL DEVELOPMENT MODEL

```text
                    MASTER ROADMAP
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
     TRACK A                           TRACK B
  COMMERCE CORE                 CUSTOMER ENGAGEMENT
          │                               │
          ▼                               ▼
   Stable Commerce                  Content / Feed
          │                               │
          │                         Consent / Retention
          │                               │
          │                         Audience / Campaign
          │                               │
          └───────────────┬───────────────┘
                          ▼
                    INTEGRATED ACOS
                          │
                          ▼
                     SaaS Hardening
                          │
                          ▼
                   Commercial Release
```

---

# 30. AI HANDOFF HEADER

ทุกครั้งที่ส่งงานให้ AI Vibe Coding ให้เริ่ม prompt ด้วย:

```text
You are working on ADORA Commerce OS (ACOS).

Read and obey:
1. ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
2. latest approved Business Rules for the target module
3. latest Frozen ER/Schema
4. current Migration Status
5. relevant API/Module Contract

Do not invent schema, statuses, permissions, financial rules,
consent behavior, or cross-module writes.

Do not modify historical migrations unless the project owner
explicitly approves a migration repair workflow.

If a required rule is missing or conflicts with frozen documents,
stop the affected task and report BLOCKED with the exact conflict.

Implement only the specified Module / Phase / Task ID.
```

นี่เป็น contract สำหรับลด hallucination และ scope drift ของ Coding Agent

---

# 31. SUCCESS CRITERIA OF THIS ROADMAP

Roadmap นี้ถือว่าทำหน้าที่สำเร็จเมื่อ:

- มนุษย์ดูแล้วรู้ว่าอะไรทำก่อน/หลัง
- AI ดูแล้วรู้ว่าอะไรทำได้/ทำไม่ได้
- Track A และ Track B พัฒนาคู่กันได้
- ไม่มี Customer/Product/Order source-of-truth ซ้ำ
- migration ไม่ชนกัน
- Business Rule มาก่อน schema ใน domain ใหม่
- schema มาก่อน implementation ที่ต้องพึ่ง schema
- campaign ไม่ bypass consent
- variable cost ถูก meter
- scale path จาก 10 → 1,000 → 10,000 ร้านมีทางออก
- monolith สามารถ extract service ภายหลังโดยไม่รื้อ business core

---

**END — ACOS MASTER DEVELOPMENT ROADMAP V2**

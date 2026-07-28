# ADORA Commerce OS (ACOS)
# MIGRATION PLAN — CONTENT + CUSTOMER FEED + RETENTION V2

**Project Name:** ADORA Commerce OS  
**Short Name:** ACOS  
**Repository Slug:** `adora-commerce-os`  
**Document:** `MIGRATION_PLAN_CONTENT_RETENTION_V2.md`  
**Status:** MIGRATIONS 035-046 VALIDATED; NEXT USAGE METER INTEGRATION / QUOTA READ MODEL REVIEW
**Track:** Track B — Customer Engagement Platform  
**Depends On:**  
- `ACOS_AI_CODING_CONSTITUTION.md`
- `ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md`
- `ACOS_IMPLEMENTATION_STATUS.md`
- `BUSINESS_RULES_CONTENT_RETENTION_V1.md`
- `ER_DIAGRAM_V2_CONTENT_RETENTION.md`

---

# 0. Purpose

เอกสารนี้กำหนดแผนสร้าง migration สำหรับ Track B:

```text
Content
Media
Follow
Interest
Customer Feed
Consent
Suppression
Retention
Audience
Campaign
Messaging
Attribution
Live Reminder
Usage Meter Hook
RLS
Permissions
Indexes
Validation
```

เป้าหมายคือให้ AI Coding Agent และ Developer สามารถสร้าง SQL migration `035+` ได้อย่างเป็นระบบ โดยไม่ทำให้ Commerce Core พัง และไม่ละเมิด source-of-truth rules ของ ACOS

---

# 1. Current Migration Baseline

สถานะที่รับรู้จาก Roadmap/Status:

```text
Protected Historical Migrations:
001–034

Track A Commerce Core:
Migration baseline generated / complete

Next Track A Gate:
Fresh database replay validation

Track B:
Business Rules approved for ER V2 design
ER V2 frozen for migration planning
```

## Important

เลข migration จริงต้องตรวจจาก repository ก่อนสร้างไฟล์ทุกครั้ง:

```text
supabase/migrations/
```

ห้าม AI เดาเลขจากเอกสารนี้ถ้า repository state ไม่ตรง

---

# 2. Migration Policy

## MIG-POL-001 — Forward-Only

Track B ต้องใช้ migration ใหม่เท่านั้น

ห้ามแก้ migration `001–034` โดยไม่ได้รับอนุมัติ explicit จาก Project Owner

**Status:** APPROVED

---

## MIG-POL-002 — Fresh Replay Required

หลังสร้าง migration Track B ต้อง replay:

```text
001 → latest
```

บน fresh database ได้

**Status:** APPROVED

---

## MIG-POL-003 — No Production SQL Before Core Verification

ก่อนเขียน SQL จริง ต้องตรวจ:

```text
existing table names
existing FK targets
existing uuid/default conventions
existing updated_at trigger conventions
existing RLS helper functions
existing permission seed pattern
existing audit log pattern
existing subscription usage model
```

**Status:** REQUIRED

---

## MIG-POL-004 — No Duplicate Source of Truth

Migration Track B ห้ามสร้าง master tables ซ้ำ:

```text
customers
products
orders
organizations
users
```

**Status:** APPROVED

---

## MIG-POL-005 — RLS Required

Tenant-owned tables ต้องมี RLS หรือ server-side enforcement ตาม convention เดิมของ ACOS

**Status:** APPROVED

---

# 3. Pre-Migration Repository Verification Checklist

ก่อนสร้าง SQL ให้ AI/Developer ตรวจสิ่งนี้ใน repository จริง

## 3.1 Latest Migration Number

```text
Check:
supabase/migrations/

Find:
latest migration prefix
```

Expected from current plan:

```text
034
```

ถ้าไม่ใช่ `034` ให้ใช้เลขถัดไปจริงจาก repository

---

## 3.2 Core Table Names

ต้องยืนยันชื่อจริงของ tables:

```text
organizations
users / profiles
memberships / organization_memberships
customers
products
product_variants
categories
orders
order_items
promotions
coupons
live_sessions
audit_logs
subscription_usage
permissions
roles
role_permissions
```

ถ้าชื่อไม่ตรง ให้ migration ใช้ชื่อจริงจาก schema ปัจจุบัน

---

## 3.3 Common Column Conventions

ตรวจว่าระบบเดิมใช้ convention ใด:

```text
id uuid primary key default gen_random_uuid()
created_at timestamptz default now()
updated_at timestamptz default now()
deleted_at timestamptz nullable
created_by
created_by_user_id
updated_by
updated_by_user_id
```

ใช้ convention เดิมให้มากที่สุด

---

## 3.4 Updated At Trigger

ตรวจว่ามี function กลางหรือไม่ เช่น:

```text
set_updated_at()
handle_updated_at()
update_updated_at_column()
```

ถ้ามี ให้ใช้ function เดิม

ถ้าไม่มี ต้องสร้าง function ใหม่ใน migration ที่เหมาะสม แต่ห้ามชนชื่อเดิม

---

## 3.5 RLS Helper Functions

ตรวจว่า ACOS มี helper เช่น:

```text
current_organization_id()
current_user_id()
is_org_member(org_id)
has_permission(org_id, permission_key)
```

หรือใช้ pattern อื่น

Migration RLS ต้องใช้ convention เดิม

---

## 3.6 Permission Seed Pattern

ตรวจว่า permission seed ใช้:

```text
permissions table
role_permissions
organization roles
system roles
seed function
insert on conflict
```

ต้อง seed permission ใหม่ตาม pattern เดิม

---

## 3.7 Audit Pattern

ตรวจว่า lifecycle audit ใช้ table/function ใด

เช่น:

```text
audit_logs
record_audit_event()
```

ถ้ายังไม่ชัด ให้ migration Track B ยังไม่ผูก trigger audit อัตโนมัติ แต่ระบุ TODO/contract ให้ service layer เขียน audit แทน

---

## 3.8 Usage Meter Pattern

ตรวจว่า existing SaaS usage table รองรับ usage types ของ Track B หรือไม่

ถ้ารองรับ:

```text
do not create usage_meter_events
```

ถ้าไม่รองรับ:

```text
create optional usage_meter_events
```

ตาม ER V2

---

# 4. Proposed Migration Sequence

เลขด้านล่างเป็น proposed sequence ถ้า latest repository migration คือ `034`

```text
035_content_core.sql
036_content_media.sql
037_follow_interest.sql
038_consent_suppression.sql
039_content_events.sql
040_retention_metrics.sql
041_audience_segments.sql
042_campaign_core.sql
043_message_dispatch.sql
044_attribution_live_reminder.sql
045_usage_meter_extension.sql
046_content_retention_rls.sql
047_content_retention_permissions_seed.sql
048_content_retention_validation.sql
```

## Why This Order

```text
Content core
   ↓
Media attaches to Content
   ↓
Follow/Interest supports Feed
   ↓
Consent/Suppression required before Campaign
   ↓
Events support Feed/Analytics
   ↓
Retention depends on Customer/Order projections
   ↓
Audience depends on Customer/Retention
   ↓
Campaign depends on Audience
   ↓
Message dispatch depends on Campaign + Consent
   ↓
Attribution depends on Content/Campaign/Message/Order
   ↓
Usage meter can hook into all
   ↓
RLS after tables exist
   ↓
Permission seed after permission keys finalized
   ↓
Validation after everything exists
```

---

# 5. Migration 035 — Content Core

**File:** `20260728161057_content_core_035.sql`

## Purpose

สร้าง table หลักของ Content:

```text
content_posts
content_product_links
content_promotion_links deferred until promotions master is verified
content_live_links
```

## Creates

```text
content_posts
content_product_links
content_live_links
content_promotion_links deferred until promotions master is verified
```

## Depends On Core Tables

```text
organizations
users/profiles
products
product_variants
coupons; promotions not present in verified repository
live_sessions optional
```

## Key Rules Implemented

```text
content status
content type
visibility
published/scheduled timestamp constraints
soft delete
product links without duplicate product master
```

## Must Include

```text
PK
organization_id FK
content lifecycle constraints
created_by_user_id
updated_by_user_id
created_at
updated_at
indexes
```

## Must Not Include

```text
RLS policies
permission seed
media binary
campaign logic
```

## Validation

```text
Insert draft content
Reject invalid status
Reject scheduled without scheduled_at
Reject published without published_at
Link content to product
Reject invalid product FK
```

---

# 6. Migration 036 — Content Media

**File:** `20260728162156_content_media_036.sql`

## Purpose

สร้าง media metadata table

## Creates

```text
content_media
```

## Depends On

```text
content_posts
organizations
users/profiles
```

## Key Rules Implemented

```text
no binary in PostgreSQL
media metadata only
image variants
orphan cleanup candidate query support
tenant storage accounting support
```

## Must Include

```text
media_type constraint
variant constraint
file_size_bytes
mime_type
storage_bucket
storage_key
uploaded_by_user_id
attached_at
deleted_at
indexes for unattached media
```

## Must Not Include

```text
actual object storage upload logic
image processing code
native video hosting
```

## Validation

```text
Insert image metadata
Reject invalid media_type
Query unattached media older than threshold
```

---

# 7. Migration 037 — Follow / Interest

**File:** `20260728163005_follow_interest_037.sql`

## Purpose

สร้าง follow และ interest model

## Creates

```text
merchant_follows
interest_topics
customer_interests
```

## Depends On

```text
organizations
customers
users/profiles optional
```

## Key Rules Implemented

```text
Customer follows merchant
No customer-to-customer social graph
Interest separate from consent
```

## Must Include

```text
unique(organization_id, customer_id)
unique(organization_id, slug)
unique(organization_id, customer_id, interest_topic_id)
follow_status constraint
indexes for feed and audience
```

## Validation

```text
One customer follows one merchant once
Customer can update follow status
Customer can opt into interest
Interest cannot cross tenant
```

---

# 8. Migration 038 — Consent / Suppression

**File:** `20260728163536_consent_suppression_038.sql`

## Purpose

สร้าง consent center และ suppression model

## Creates

```text
customer_consents
customer_consent_events
customer_suppressions
```

## Depends On

```text
organizations
customers
users/profiles
```

## Key Rules Implemented

```text
Consent by channel/purpose
Unknown means not allowed for marketing
Consent event history append-only by application rule
Suppression overrides consent
```

## Must Include

```text
channel constraint
purpose constraint
consent status constraint
suppression type constraint
unique current consent key
indexes for dispatch-time lookup
append event table
```

## Must Not Include

```text
automatic marketing send
campaign dispatch
provider logic
```

## Validation

```text
Grant consent
Revoke consent
Insert consent event
Find active suppression by channel/destination/customer
```

---

# 9. Migration 039 — Content Events

**File:** `039_content_events.sql`

## Purpose

สร้าง high-volume event table สำหรับ feed/content engagement

## Creates

```text
content_events
```

## Depends On

```text
organizations
customers
content_posts
products
marketing_campaigns optional not yet created
message_jobs optional not yet created
```

## Dependency Note

เพราะ `marketing_campaigns` และ `message_jobs` ยังไม่ถูกสร้างในลำดับนี้ มี 2 ทางเลือก:

### Option A — Create nullable uuid columns without FK now

```text
campaign_id uuid nullable
message_job_id uuid nullable
```

แล้วค่อย add FK ภายหลังใน migration 043/044

### Option B — Move content_events after campaign/message

ข้อเสนอ V2:

```text
Use Option A
```

เพื่อให้ Feed tracking ใช้ได้ก่อน Campaign

## Must Include

```text
event_type constraint
occurred_at
organization_id
content_post_id nullable
customer_id nullable
anonymous_id nullable
indexes
partition-ready comment
```

## Validation

```text
Insert view/click event
Query by content
Query by customer
Query by org/time
```

---

# 10. Migration 040 — Retention Metrics

**File:** `20260728164249_retention_metrics_040.sql`

## Purpose

สร้าง projection table สำหรับ customer retention

## Creates

```text
customer_retention_metrics
```

## Depends On

```text
organizations
customers
orders only as source read, not FK required
```

## Key Rules Implemented

```text
RFM projection
Retention segment
Rebuildable metrics
```

## Must Include

```text
unique(organization_id, customer_id)
lifetime_value
order_count
rfm_score
retention_segment constraint
score range checks
indexes for segment/audience
```

## Must Not Include

```text
order mutation
financial mutation
```

## Validation

```text
Insert/update metrics
Query at-risk customers
Query high lifetime value customers
```

---

# 11. Migration 041 — Audience Segments

**File:** `20260728165559_audience_041.sql`

## Purpose

สร้าง segment, rule, static members, snapshot model

## Creates

```text
audience_segments
audience_segment_rules
audience_static_members
audience_snapshots
audience_snapshot_members
```

## Depends On

```text
organizations
customers
users/profiles
customer_retention_metrics optional
```

## Key Rules Implemented

```text
STATIC / DYNAMIC_RULE / SNAPSHOT
Snapshot required for campaign
Snapshot stores frozen members
Rule JSON is data, not executable SQL
```

## Must Include

```text
segment_type constraint
snapshot source_type constraint
unique static member
unique snapshot member
criteria_hash
member_count
indexes
```

## Must Not Include

```text
dynamic SQL execution from rule_json
campaign dispatch
consent freeze
```

## Validation

```text
Create dynamic segment definition
Create audience snapshot
Insert snapshot members
Verify duplicate member rejected
```

---

# 12. Migration 042 — Campaign Core

**File:** `20260728170527_campaign_core_042.sql`

## Purpose

สร้าง campaign definition และ campaign run

## Creates

```text
marketing_campaigns
campaign_runs
```

## Depends On

```text
organizations
users/profiles
content_posts
audience_segments
audience_snapshots
```

## Key Rules Implemented

```text
campaign lifecycle
audience snapshot required before preparing/running
purpose required
channel optional/primary
```

## Must Include

```text
campaign status constraint
purpose constraint
channel constraint
timestamp fields
audience_snapshot_id
campaign run counters
indexes
```

## Must Not Include

```text
message provider calls
message jobs
actual dispatch
```

## Validation

```text
Create draft campaign
Reject preparing without audience_snapshot_id
Create campaign run
```

---

# 13. Migration 043 — Message Dispatch

**File:** `20260728171400_message_dispatch_043.sql`

## Purpose

สร้าง message job และ delivery attempts

## Creates

```text
message_jobs
message_delivery_attempts
```

## Depends On

```text
organizations
customers
content_posts
marketing_campaigns
campaign_runs
```

## Key Rules Implemented

```text
every outbound message has job
idempotency key
delivery attempt history
provider adapter support
bulk dispatch via queue/worker
```

## Must Include

```text
message job status constraint
channel constraint
purpose constraint
idempotency unique index
attempt unique(message_job_id, attempt_no)
indexes for worker polling
```

## Must Not Include

```text
provider credentials table unless already approved
actual provider send logic
```

## Validation

```text
Create pending message job
Reject duplicate idempotency key
Record attempt 1
Record attempt 2
Query pending jobs by schedule
```

---

# 14. Migration 044 — Attribution / Live Reminder

**File:** `20260728172100_attribution_live_reminder_044.sql`

## Purpose

สร้าง attribution event และ live reminder request

## Creates

```text
attribution_events
live_reminder_requests
```

## Depends On

```text
organizations
customers
content_posts
content_live_links
marketing_campaigns
campaign_runs
message_jobs
orders
```

## Key Rules Implemented

```text
last-click attribution support
campaign/content/message/order chain
live reminder explicit request
```

## Must Include

```text
attribution event type constraint
live reminder status constraint
unique reminder request key
indexes for order/campaign/customer lookup
```

## Must Not Include

```text
mutating order revenue
automation engine
```

## Validation

```text
Insert campaign click attribution event
Insert order attributed event
Create live reminder request
Reject duplicate reminder request
```

---

# 15. Migration 045 — Guarded Attribution Service Boundary

**File:** `20260728172741_attribution_guarded_service_boundary_045.sql`

## Purpose

เพิ่ม server/service-role-only boundary สำหรับบันทึก attribution event

## Creates

```text
api_record_attribution_event
```

## Key Rules Implemented

```text
service-role-only execution
event/source/identity validation
audit-backed idempotency
append-only attribution history
```

## Must Not Include

```text
customer reminder submission
reminder scheduling
provider calls
new permission seed
order/payment mutation
```

## Validation

```text
initial event record
idempotent retry
conflicting request rejection
append-only update denial
authenticated direct denial
```

---

# 16. Migration 046 — Usage Meter Boundary

**File:** `20260728174238_usage_meter_boundary_046.sql`

## Purpose

รองรับ V1 aggregate usage metering ของ Track B ผ่าน metered feature seeds และ service-role-only guarded upsert RPC โดย reuse `subscription_usage` และ `organization_entitlements`

## Approved Implementation Scope

ใช้ `subscription_usage` เป็น aggregate store และ seed usage type ต่อไปนี้แบบ idempotent:

```text
CUSTOMERS
POSTS
MEDIA_STORAGE_BYTES
MEDIA_UPLOADS
FEED_EVENTS
CAMPAIGN_RECIPIENTS
LINE_MESSAGES
SMS_MESSAGES
EMAIL_MESSAGES
AUDIENCE_SNAPSHOTS
RETENTION_REFRESHES
```

## Implemented Boundary

`api_record_usage_meter` ทำ atomic period upsert, audit-backed idempotency, unit/period/source validation และ high-cost fail-closed quota checks โดยปิด direct browser/authenticated DML และ RPC

## Deferred Non-Scope

ยังไม่สร้าง `usage_meter_events`, billing, provider settlement หรือ Admin usage controls

## Recommendation

Prefer existing SaaS usage model if flexible enough

## Validation

```text
Record POST usage
Record SMS_MESSAGES usage
Query monthly org usage
```

---

# 17. Migration 047 — RLS Policies

**File:** `047_content_retention_rls.sql`

## Purpose

เพิ่ม RLS policies ให้ Track B tables

## Depends On

```text
all Track B tables
existing RLS helper functions
existing membership model
```

## Must Include RLS For

```text
content_posts
content_media
content_product_links
content_promotion_links deferred until promotions master is verified
content_live_links

merchant_follows
interest_topics
customer_interests

customer_consents
customer_consent_events
customer_suppressions

content_events
customer_retention_metrics

audience_segments
audience_segment_rules
audience_static_members
audience_snapshots
audience_snapshot_members

marketing_campaigns
campaign_runs
message_jobs
message_delivery_attempts

attribution_events
live_reminder_requests
usage_meter_events if created
```

## RLS Groups

```text
merchant staff read/write within organization
customer self read/write limited
public published content read
service worker controlled access
```

## Important

If service worker uses service role, application code must still enforce tenant and operation scope.

## Validation

```text
Org A cannot read Org B content
Org A cannot update Org B campaign
Public can read only public published content
Public cannot read audience/message/consent tables
Customer can update own preference only where allowed
```

---

# 17. Migration 047 — Permissions Seed

**File:** `047_content_retention_permissions_seed.sql`

## Purpose

เพิ่ม permission keys สำหรับ Track B

## Permission Keys

```text
content.manage
content.publish
media.upload
audience.manage
campaign.manage
campaign.send
consent.view
consent.manage
retention.view
settings.messaging
```

## Must Use

Existing permission seed pattern

## Must Not

```text
grant campaign.send broadly by default
grant consent.manage broadly by default
grant settings.messaging broadly by default
```

## Validation

```text
Permissions exist
Default roles have only approved permissions
Restricted user cannot publish/send if not granted
```

---

# 18. Migration 048 — Validation / Comments / Index Review

**File:** `048_content_retention_validation.sql`

## Purpose

Optional migration or SQL validation script to assert objects exist and comments are added.

Recommended as:

```text
docs/testing/content_retention_validation.sql
```

rather than production migration if it only validates.

## Includes

```text
table existence checks
constraint existence checks
index existence checks
RLS enabled checks
permission seed checks
```

## Recommendation

Keep production schema migrations separate from validation scripts.

---

# 19. Cross-Migration Dependency Map

```text
035 content core
   ├── 036 media
   ├── 039 content events
   ├── 042 campaign
   ├── 044 attribution/live reminder
   └── 046 RLS

037 follow/interest
   ├── 041 audience
   ├── feed API later
   └── 046 RLS

038 consent/suppression
   ├── 043 message dispatch service logic
   └── 046 RLS

040 retention metrics
   └── 041 audience

041 audience
   └── 042 campaign

042 campaign
   └── 043 message dispatch
       └── 044 attribution

045 usage
   └── 046 RLS if new table

046 RLS
   └── requires all tables

047 permissions
   └── requires existing permission seed model
```

---

# 20. SQL Generation Rules for AI

When generating each migration, AI must:

```text
1. Read ACOS_AI_CODING_CONSTITUTION.md
2. Read BUSINESS_RULES_CONTENT_RETENTION_V1.md
3. Read ER_DIAGRAM_V2_CONTENT_RETENTION.md
4. Inspect current supabase/migrations directory
5. Inspect actual core schema table names
6. Use existing conventions
7. Generate one migration at a time
8. Include validation notes
9. Update ACOS_IMPLEMENTATION_STATUS.md
```

AI must not:

```text
Generate all SQL without repository verification
Edit migration 001–034
Invent core table names
Invent permission model
Disable RLS to pass tests
Create duplicate customer/product/order tables
Store media binary in PostgreSQL
Bypass consent
```

---

# 21. Recommended Task Breakdown for AI Coding

## MIG-PLAN-001

```text
Verify repository migration baseline and core table names
```

## MIG-035

```text
Generate 035_content_core.sql
```

## MIG-036

```text
Generate 036_content_media.sql
```

## MIG-037

```text
Generate 037_follow_interest.sql
```

## MIG-038

```text
Generate 038_consent_suppression.sql
```

## MIG-039

```text
Generate 039_content_events.sql
```

## MIG-040

```text
Generate 040_retention_metrics.sql
```

## MIG-041

```text
Generate 041_audience_segments.sql
```

## MIG-042

```text
Generate 042_campaign_core.sql
```

## MIG-043

```text
Generate 043_message_dispatch.sql
```

## MIG-044

```text
Generate 044_attribution_live_reminder.sql
```

## MIG-045

```text
Evaluate existing usage table and generate usage extension if needed
```

## MIG-046

```text
Generate RLS policies using existing helper functions
```

## MIG-047

```text
Seed permissions using existing seed pattern
```

## MIG-VALIDATE-001

```text
Create validation SQL/test suite and replay 001→latest
```

---

# 22. Required Validation After Each Migration

After each migration:

```text
supabase db reset / fresh replay equivalent
schema diff review
constraint test
FK test
basic insert test
cross-tenant consideration
```

After final migration:

```text
full fresh replay 001→latest
RLS negative tests
permission tests
campaign consent dispatch dry-run test
high-volume index review
```

---

# 23. Testing Plan

## Database Tests

```text
Table exists
Column exists
Constraint works
FK works
Unique constraints work
Check constraints work
Soft delete behavior query works
```

## RLS Tests

```text
Org A denied Org B
Public denied private tables
Public allowed public published content only
Customer self access limited
Merchant permission enforced
```

## Campaign Safety Tests

```text
Campaign cannot prepare without snapshot
Message job cannot duplicate idempotency key
Consent revoked customer skipped
Suppressed customer skipped
Cancelled campaign stops unsent jobs
```

## Scale-Oriented Tests

```text
Content list by org
Public content page query
Feed candidate query
Audience snapshot member insert
Message job worker poll query
Content event insert throughput
```

---

# 24. Rollback / Repair Policy

## Development

During local/dev before production:

```text
migration can be adjusted before merge if not shared
```

## Shared Branch / Main

Once merged/shared:

```text
do not edit historical migration
create forward repair migration
```

## Production

Production repair must:

```text
preserve data
be forward-only
include backup/restore consideration
include risk note
include validation
```

---

# 25. Risk Register

| Risk | Area | Mitigation |
|---|---|---|
| Wrong core FK names | SQL generation | repository verification first |
| RLS leak | Security | RLS tests / negative tests |
| Content public leak | Feed/Public page | strict status/visibility filter |
| Duplicate customer model | Architecture | FK to Core customer only |
| Message duplicates | Messaging | idempotency key |
| Consent bypass | Campaign | dispatch-time consent check |
| Feed fan-out explosion | Feed | no customer×post fanout |
| Event table growth | Analytics | retention/partition-ready |
| SMS cost spike | Usage | quota/spend guardrail |
| Provider lock-in | Messaging | adapter contract |
| Historical migration edits | Governance | forward-only policy |

---

# 26. Implementation Status Update Required

After adding this file to repository, update:

```text
docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
```

Expected status updates:

```text
MIGRATION_PLAN_CONTENT_RETENTION_V2.md:
READY FOR SQL DRAFTING AFTER REPOSITORY VERIFICATION

ENG-DB-035 to ENG-DB-044:
READY AFTER MIG-PLAN-001

ENG-DB-046 RLS:
READY AFTER TABLE MIGRATIONS

ENG-DB-047 permissions:
READY AFTER PERMISSION PATTERN VERIFICATION

Repository verification:
MIG-PLAN-001 VALIDATED on 2026-07-28; see `MIGRATION_PLAN_REPOSITORY_VERIFICATION_2026-07-28.md`
```

---

# 27. AI Handoff Prompt for Migration Work

Use this prompt when sending migration work to AI Coding Agent:

```text
You are working on ADORA Commerce OS (ACOS).

Read and obey:
1. docs/governance/ACOS_AI_CODING_CONSTITUTION.md
2. docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
3. docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
4. docs/business-rules/BUSINESS_RULES_CONTENT_RETENTION_V1.md
5. docs/er/ER_DIAGRAM_V2_CONTENT_RETENTION.md
6. docs/migrations/MIGRATION_PLAN_CONTENT_RETENTION_V2.md
7. current supabase/migrations directory
8. existing database schema conventions

TASK:
<MIG-xxx>

Do not edit migrations 001–034.
Do not invent core table names.
Do not create duplicate Customer/Product/Order source of truth.
Do not write provider integration code.
Do not bypass RLS.

If exact FK target, helper function, or permission pattern is unclear,
return STATUS: BLOCKED and identify the required decision.
```

---

# 28. Current Final Position

```text
Business Rules:
FROZEN FOR ER V2 / MIGRATION PLANNING

ER V2:
FROZEN FOR MIGRATION PLANNING

Migration Plan V2:
MIGRATIONS 035-046 VALIDATED; USAGE METER V1 AGGREGATE BOUNDARY IMPLEMENTED

Next Required Work:
Integrate the guarded Usage Meter boundary with approved Track B service workflows and review the quota read model

Then:
Generate the next actual timestamped migration one file at a time after approval
```

---

**END — MIGRATION_PLAN_CONTENT_RETENTION_V2**

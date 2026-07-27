# ADORA Commerce OS (ACOS)
# AI CODING CONSTITUTION V1

**Project Name:** ADORA Commerce OS
**Short Name:** ACOS
**Repository Slug:** `adora-commerce-os`
**Document:** `ACOS_AI_CODING_CONSTITUTION.md`
**Status:** MANDATORY AI EXECUTION CONTRACT
**Applies To:** AI Vibe Coding Agents, Coding Assistants, Human Developers using AI-generated changes
**Authority:** Must be read together with the latest approved Roadmap, Business Rules, Frozen ER/Schema, Migration Status, and relevant Module/API Contracts.

---

# 1. PURPOSE

เอกสารนี้กำหนดกติกาบังคับสำหรับ AI ที่ทำงานกับ ACOS

เป้าหมายคือป้องกัน:

- AI สร้าง Architecture ใหม่เอง
- Schema drift
- Migration conflict
- Duplicate source of truth
- Cross-tenant data leakage
- Permission bypass
- Consent bypass
- Financial rule hallucination
- Cross-module coupling
- Scope drift
- Hidden destructive changes
- Provider lock-in
- Non-idempotent background work
- Implementation ก่อน Business Rule / Schema freeze

AI ต้องถือว่าเอกสารนี้เป็น **Execution Guardrail** ไม่ใช่คำแนะนำทั่วไป

---

# 2. CANONICAL PROJECT IDENTITY

```text
Project Name: ADORA Commerce OS
Short Name: ACOS
Repository: adora-commerce-os
Architecture Style: Modular Monolith
Primary Database: PostgreSQL / Supabase
Tenant Boundary: organization_id
```

ห้ามเปลี่ยนชื่อโปรเจกต์, slug, architectural style หรือ tenant model โดยไม่ได้รับอนุมัติอย่างชัดเจน

---

# 3. PRIMARY DEVELOPMENT TRACKS

ACOS มี 2 Development Tracks หลักที่พัฒนาได้พร้อมกัน

## TRACK A — COMMERCE CORE

```text
Organization
Auth
RBAC
Product
Inventory
Customer
Conversation
Live
Cart
Purchase Session
Order
Promotion
Payment
Credit
Loyalty
Fulfillment
Warehouse QC
Shipping
Return
Notification
Audit
SaaS Entitlement
Usage
```

## TRACK B — CUSTOMER ENGAGEMENT

```text
Content
Media
Follow
Interest
Customer Feed
Consent
Audience
Retention
Campaign
Messaging
Attribution
Automation
```

Track B เป็น Module ของ ACOS ไม่ใช่ Product ที่มี Customer/Product/Order database แยกของตัวเอง

---

# 4. SOURCE-OF-TRUTH RULES

AI ห้ามสร้าง source-of-truth ซ้ำ

## Customer

Canonical:

```text
customers
```

ห้ามสร้าง `content_customers`, `marketing_customers`, `campaign_customers`, `retention_customers`, `feed_customers` เพื่อแทน Customer Master

## Product

Canonical Product Catalog อยู่ใน Commerce Core

Content สามารถ link Product ได้ แต่ห้าม duplicate catalog เพียงเพื่อทำ Content Feed

## Order

Canonical Order อยู่ใน Commerce Core

Retention / Attribution อ่านข้อมูล Order ได้ แต่ห้าม rewrite historical order เพื่อทำให้ Campaign Attribution ดูถูกต้อง

## Organization / Tenant

Canonical tenant คือ Organization

Tenant-owned data ต้องผูก `organization_id` ตาม schema และ RLS rule ที่ approved

---

# 5. REQUIRED DOCUMENT READING ORDER

ก่อนเริ่ม Task AI ต้องอ่านเอกสารตามลำดับ:

```text
1. ACOS_AI_CODING_CONSTITUTION.md
2. ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
3. Latest approved Business Rules ของ Module
4. Latest Frozen ER / Database Schema
5. Current Migration Status
6. Relevant Module Contract / API Contract
7. Relevant Security / RLS rules
8. Task specification
```

ถ้าเอกสารขัดกัน:

```text
STOP
→ REPORT CONFLICT
→ MARK BLOCKED
```

ห้ามเลือกเวอร์ชันเองโดยเดา

---

# 6. TASK ENVELOPE — REQUIRED INPUT

ทุกงานที่ส่งให้ AI Coding ต้องมีหรือ AI ต้องสรุปก่อนเริ่มว่า:

```text
PROJECT
TRACK
MODULE
PHASE
TASK ID

OBJECTIVE
SOURCE DOCUMENTS
DEPENDENCIES

ALLOWED FILES
ALLOWED TABLES
ALLOWED MODULES

FORBIDDEN FILES
FORBIDDEN TABLES
FORBIDDEN BEHAVIOR

EXPECTED OUTPUT
ACCEPTANCE CRITERIA
TEST REQUIREMENTS
```

ตัวอย่าง:

```text
PROJECT: ADORA Commerce OS
TRACK: B
MODULE: Content
PHASE: B4
TASK ID: CONTENT-004

OBJECTIVE:
Create draft product post.

DEPENDENCIES:
organization
auth membership
product read contract

ALLOWED TABLES:
content_posts
content_product_links

FORBIDDEN:
UPDATE customers
UPDATE products
UPDATE orders
Direct LINE API call

DONE WHEN:
cross-tenant denied
invalid product denied
draft not publicly visible
tests pass
```

---

# 7. NO INVENTION POLICY

AI ห้ามสร้างเองเมื่อไม่มีใน approved documents:

```text
New Database Table
New Column
New Enum
New Status
New Permission
New Role
New Financial Formula
New Consent Purpose
New Cancellation Rule
New Refund Rule
New Retry Rule
New Provider Contract
New Attribution Model
New Loyalty Rule
New Tax Rule
New Tenant Boundary
```

ถ้าจำเป็นต่อ implementation ให้ตอบ `BLOCKED` พร้อมแจ้ง:

1. ข้อมูลที่ขาด
2. จุดที่ต้องตัดสินใจ
3. ผลกระทบ
4. ทางเลือกที่เป็นไปได้

ห้ามเลือกแทน Project Owner

---

# 8. MIGRATION CONSTITUTION

## Current Baseline

```text
Migration 001–034
= Historical Commerce Core baseline
```

ห้าม AI แก้ไฟล์ migration เก่าโดยพลการ

## Forward-only Rule

Schema ใหม่ต้องสร้าง migration ใหม่ เช่น `035_xxx.sql`, `036_xxx.sql`, ...

**เลขจริงต้องเป็นเลขถัดจาก repository state ปัจจุบัน** ห้าม hardcode จาก Roadmap โดยไม่เช็ก migration directory ล่าสุด

Migration ใหม่ต้อง:

- replay บน fresh database ได้
- respect dependency order
- include required constraints
- include indexes ที่ justified
- include tenant / RLS implications
- avoid destructive data loss
- avoid hidden privilege escalation
- update schema documentation
- include verification SQL/test where appropriate

---

# 9. DATABASE OWNERSHIP RULE

แต่ละ Module มี tables ที่ตัวเองเป็น owner

ตัวอย่าง:

```text
Content owns:
content_posts
content_media
content_product_links
```

Module อื่นห้าม update internal table ของ Content โดยตรง ถ้า contract ไม่อนุญาต

ให้ใช้:

```text
Application Contract
Service
Read Model
Event
Explicit Public API
```

ตาม design ที่ approved

---

# 10. CROSS-MODULE WRITE RULE

หลัก:

```text
Read across module boundaries:
Allowed only through approved contract/read model.

Write across module boundaries:
Forbidden by default.
```

ตัวอย่างถูกต้อง:

```text
Campaign
   ↓
Messaging Service
   ↓
Provider Adapter
```

---

# 11. TENANT ISOLATION RULE

ทุก feature ต้อง assume ว่า ACOS เป็น Multi-tenant SaaS

AI ต้องตรวจ:

```text
organization_id
membership
authorization
RLS
ownership
```

ก่อน return/modify tenant-owned data

อย่างน้อยต้องมี negative test:

```text
User from Organization A
tries to access Organization B resource
→ DENIED
```

ห้ามถือว่า UI filtering คือ security

---

# 12. AUTHORIZATION RULE

Auth ≠ Authorization

AI ต้องแยก:

```text
Authentication
Membership
Role
Permission
Resource Ownership
Tenant Scope
```

ห้าม rely เฉพาะ client-side condition

---

# 13. RLS RULE

ถ้า table ถูกกำหนดให้ใช้ RLS:

- ห้าม disable เพื่อแก้ bug
- ห้าม service-role bypass โดยไม่มีเหตุผลที่ approved
- ห้ามใช้ overly broad policy
- ห้าม policy ที่ cross-tenant leak ได้
- ต้องมี negative tests

---

# 14. CONSENT CONSTITUTION

Marketing eligibility:

```text
Audience Membership
≠
Permission To Send
```

ก่อน dispatch marketing communication ต้องตรวจ:

```text
Current Consent
Current Suppression
Channel Eligibility
Purpose Eligibility
Tenant Quota
Provider Readiness
```

Audience Snapshot เป็น historical targeting record แต่ Consent ต้องตรวจอีกครั้ง ณ dispatch time

```text
Customer in snapshot
↓
customer revokes SMS
↓
campaign dispatch
↓
SMS MUST NOT SEND
```

---

# 15. MESSAGING CONSTITUTION

Campaign Module ห้ามเรียก LINE API / SMS API / Email API โดยตรง

ต้องผ่าน:

```text
Messaging Orchestrator
        ↓
Provider Adapter
```

เมื่อเหมาะสมต้องรองรับ:

```text
Idempotency
Retry
Backoff
Delivery State
Provider Error Mapping
Dead-letter Handling
Quota
Audit
Cost/Usage Metering
```

---

# 16. EXTERNAL PROVIDER RULE

Provider-specific logic ต้องอยู่ใน adapter/integration boundary

ตัวอย่าง:

```text
LINE Messaging Adapter
SMS Provider Adapter
Email Provider Adapter
Payment Adapter
Shipping Adapter
```

Business Core ต้องใช้ canonical internal model

---

# 17. IDEMPOTENCY RULE

Operations ที่สามารถถูก retry ต้องออกแบบให้ retry-safe เช่น:

```text
Payment webhook
Shipping webhook
Campaign dispatch
Message send
Event consumer
Automation step
Order creation from external event
```

ห้ามสร้าง duplicate financial/order/message effects จาก retry

---

# 18. BACKGROUND JOB RULE

งานหนัก/ช้า/มี external network dependency ห้ามผูกกับ synchronous HTTP request โดยไม่จำเป็น

Candidate:

```text
Campaign Dispatch
Bulk Messaging
Media Processing
Retention Refresh
Audience Materialization
Event Aggregation
Large Import
Large Export
```

ใช้ queue/worker ตาม architecture ที่ approved

---

# 19. FEED CONSTITUTION

ห้ามสร้าง feed row แบบ `Every Customer × Every Post` ตอน publish

Feed V1 ต้องใช้:

```text
Follow
Interest
Purchase/Category Signals
Recency
Content Priority
```

ผ่าน query/read model/projection ที่ควบคุมได้

---

# 20. EVENT DATA RULE

High-volume event data เช่น:

```text
IMPRESSION
OPEN
CLICK
PRODUCT_CLICK
FEED_VIEW
```

ต้องคิดเรื่อง:

```text
Retention
Aggregation
Partition readiness
Archive
Index growth
Privacy
Cost
```

ห้ามเก็บ event ตลอดไปแบบไม่มี policy โดย default

---

# 21. MEDIA RULE

Binary media ไม่ควรเก็บใน PostgreSQL เว้นแต่มีเหตุผลที่ approved

Pattern:

```text
PostgreSQL
→ Metadata / Object Key

Object Storage
→ Actual Image/File
```

Required:

```text
MIME validation
Size limit
Tenant quota
Filename sanitization
Image dimensions
Abuse protection
Orphan cleanup
```

---

# 22. SECURITY RULES

AI ต้องพิจารณาอย่างน้อย:

```text
Authentication
Authorization
RLS
Tenant Isolation
Input Validation
Output Encoding
XSS
CSRF where applicable
SQL Injection
File Upload Abuse
Rate Limiting
Webhook Verification
Secret Management
Audit
DoS / Resource Exhaustion
```

ห้ามแก้ security failure ด้วยการลด security control

---

# 23. DoS / RESOURCE PROTECTION RULE

Public/API/Upload/Campaign features ต้องมี guardrail ตามความเสี่ยง เช่น:

```text
Per-IP rate limit
Per-user rate limit
Per-tenant rate limit
Upload limit
Storage quota
Campaign recipient quota
Worker concurrency
API quota
Message quota
Spend alert
Kill switch
```

ห้ามสร้าง endpoint bulk ที่ไม่มี upper bound

---

# 24. COST-AWARE ENGINEERING RULE

ทุก feature ที่สร้าง variable cost ต้องระบุ cost owner เช่น:

```text
SMS
LINE
Email
AI
Storage
Bandwidth
Media Processing
External API
```

เมื่อเหมาะสมต้อง meter ด้วย:

```text
organization_id
usage_type
quantity
period
```

---

# 25. NO UNLIMITED USAGE ASSUMPTION

AI ห้ามออกแบบ package/business behavior ว่า:

```text
Unlimited SMS
Unlimited LINE
Unlimited Email
Unlimited Storage
Unlimited AI
```

โดยไม่มี approved commercial rule

---

# 26. FINANCIAL SAFETY RULE

AI ห้ามเดา behavior ที่เกี่ยวกับ:

```text
Payment
Refund
Credit
Wallet
Discount
Tax
Shipping charge
Commission
Revenue attribution
Balance adjustment
```

ต้องอ้าง approved Business Rule

Financial mutation ต้องมี Audit, Idempotency, Authorization และ Immutable history เมื่อ rule กำหนด

---

# 27. HISTORICAL DATA RULE

ข้อมูลประวัติสำคัญไม่ควรถูก rewrite เพียงเพื่อสะดวกในการ query

ตัวอย่าง:

```text
Order price snapshot
Promotion snapshot
Payment transaction
Consent event
Delivery attempt
Audit event
```

ใช้ append-only/event/snapshot strategy ตาม schema

---

# 28. FRONTEND RULES

Frontend ต้องมีอย่างน้อย:

```text
Loading state
Empty state
Error state
Permission state
Validation
Responsive behavior
Destructive confirmation
```

Frontend ห้ามถือว่า hidden button = authorization

---

# 29. DIRECT DATABASE ACCESS RULE

Browser/client ห้ามเขียน sensitive business table โดยตรงเพียงเพราะ Supabase client รองรับ

Sensitive flow ควรผ่าน Service / Server Action / API / RPC / Application Layer ตาม architecture

---

# 30. API CONTRACT RULE

API/Service contract ต้องชัดเรื่อง:

```text
Input
Output
Validation
Authorization
Error code
Idempotency
Tenant scope
Side effects
```

ห้าม silently change response shape ที่ module อื่นพึ่งอยู่

---

# 31. STATUS / STATE MACHINE RULE

ถ้า entity มี lifecycle AI ต้องใช้ state machine ที่ approved

ห้ามเพิ่ม transition ใหม่เอง

ห้าม update status ข้าม illegal transition

---

# 32. DELETE RULE

AI ต้อง distinguish:

```text
Soft Delete
Archive
Revoke
Cancel
Hard Delete
Anonymize
```

ห้ามใช้ DELETE เป็นคำตอบ default โดยเฉพาะ Customer, Order, Payment, Consent, Campaign, Audit

---

# 33. PRIVACY RULE

Customer data ถือเป็น sensitive business data

AI ต้อง:

- minimize exposure
- avoid logging full secrets/PII unnecessarily
- respect deletion/anonymization rules
- apply consent rules
- avoid exposing cross-tenant identity links

---

# 34. SECRET MANAGEMENT RULE

ห้าม:

```text
Hardcode API key
Commit provider secret
Expose service-role key to client
Log full secret
Store plaintext secret if encrypted storage is required
```

---

# 35. OBSERVABILITY RULE

Critical flows ต้อง instrument ตามความเหมาะสม เช่น:

```text
request_id
organization_id
user_id
module
operation
campaign_id
message_job_id
provider
error_code
duration
```

ห้าม log password/token/full sensitive payload โดยไม่จำเป็น

---

# 36. ERROR-HANDLING RULE

ห้าม `catch error → ignore`

Critical failure ต้อง return controlled error, log appropriately, retry if safe, dead-letter if required และ alert หาก operationally significant

---

# 37. RETRY RULE

Retry ใช้เมื่อ operation มีโอกาสสำเร็จภายหลัง

ห้าม retry blindly กับ:

```text
Validation Error
Permission Error
Invalid Consent
Permanent Provider Rejection
Illegal State Transition
```

---

# 38. TESTING CONSTITUTION

ขั้นต่ำตาม task:

```text
Unit Test
Integration Test
Authorization Test
Tenant Isolation Test
RLS Test
Contract Test
```

เพิ่มเมื่อ relevant:

```text
Concurrency Test
Idempotency Test
Load Test
Webhook Replay Test
Queue Failure Test
Provider Failure Test
Migration Replay Test
```

---

# 39. DEFINITION OF DONE — DATABASE

Database task ยังไม่ Done จนกว่า:

- migration runs
- fresh replay passes
- constraints checked
- indexes reviewed
- RLS reviewed
- tenant isolation tested
- documentation updated
- no historical migration corrupted

---

# 40. DEFINITION OF DONE — BACKEND

Backend task ต้อง:

- validate input
- authenticate
- authorize
- scope tenant
- handle error
- protect secrets
- audit where required
- test
- update contract

---

# 41. DEFINITION OF DONE — FRONTEND

Frontend task ต้อง:

- render correct state
- respect permission
- validate input
- handle API failure
- be responsive
- not bypass server security
- respect entitlement/feature flag

---

# 42. DEFINITION OF DONE — CAMPAIGN

Campaign feature ต้อง:

- define audience
- freeze snapshot
- recheck consent
- apply suppression
- check quota
- estimate usage where required
- dispatch idempotently
- record provider status
- audit
- support defined cancel/retry behavior

---

# 43. RELEASE GATES

AI ห้ามเรียก feature Production Ready จนผ่าน gates ที่ roadmap กำหนด

Production-level system ต้องพิจารณา:

```text
Fresh Migration Replay
RLS
Cross-Tenant
Backup Restore
Rate Limit
Load
Queue Failure
Provider Failure
Consent Revoke
Cost Guardrail
Observability
```

---

# 44. ALLOWED PARALLEL DEVELOPMENT

Track A และ Track B พัฒนา parallel ได้เมื่อ:

- ไม่แก้ source-of-truth contract
- ไม่แก้ shared schema โดยพลการ
- ไม่ใช้ dependency ที่ยังไม่ approved
- integration ผ่าน approved boundary

---

# 45. BLOCKED CONDITIONS

AI ต้องหยุด affected task และตอบ `BLOCKED` เมื่อพบอย่างน้อยหนึ่งกรณี:

```text
01 Business Rule missing
02 Business Rule conflict
03 Frozen ER conflict
04 Migration conflict
05 Requires editing protected historical migration
06 Duplicate source of truth required
07 Cross-tenant behavior unclear
08 Permission unclear
09 Consent behavior unclear
10 Financial behavior unclear
11 State transition unclear
12 Provider contract unclear
13 Dependency gate not passed
14 Required field/status not approved
15 Required cross-module write has no contract
16 Destructive data operation unclear
17 Task scope conflicts with Master Roadmap
```

---

# 46. BLOCKED RESPONSE FORMAT

```text
STATUS: BLOCKED

TASK:
<task id>

BLOCKER:
<exact issue>

SOURCE CONFLICT:
<documents / code / schema>

WHY IT MATTERS:
<risk>

DECISION REQUIRED:
<question that owner must resolve>

SAFE WORK COMPLETED:
<any work that does not depend on blocked decision>
```

ห้ามแก้ปัญหาด้วย assumption ที่ไม่อนุมัติ

---

# 47. SAFE ASSUMPTIONS

AI สามารถตัดสินใจ implementation detail ที่ไม่เปลี่ยน Business Contract เช่น:

```text
Local variable name
Pure helper function structure
Test fixture naming
Internal refactor
Formatting
Non-contract UI spacing
```

ตราบใดที่ไม่เปลี่ยน Schema, Business Rule, Permission, Financial behavior, Consent, External Contract, State Machine หรือ Tenant Scope

---

# 48. REFACTOR RULE

Refactor ต้องรักษา behavior เดิม

ถ้า refactor เปลี่ยน public contract / schema / state / permission จะถือเป็น feature/change request และต้อง review

---

# 49. SCOPE RULE

AI ต้อง implement เฉพาะ Task ID ที่ได้รับ

ห้ามถือโอกาสเพิ่ม extra tables, feature, status, role, endpoint หรือ dependency โดยไม่จำเป็น

---

# 50. DEPENDENCY RULE

ก่อนเพิ่ม package/library ใหม่ต้องพิจารณา:

```text
Need
Security
Maintenance
Bundle/Runtime Cost
License
Existing Alternative
```

---

# 51. PERFORMANCE RULE

Optimize เมื่อมี Known query pattern, Measured bottleneck, Scale requirement หรือ Cost requirement

ห้าม premature distributed architecture แต่ต้องหลีกเลี่ยง obvious unbounded pattern เช่น:

```text
N+1 query
full-table scan per request
unbounded list
synchronous million-recipient send
feed fan-out explosion
```

---

# 52. SCALE RULE

Architecture ต้องสามารถ evolve จาก:

```text
10 merchants
→ 1,000 merchants
→ 10,000 merchants
```

แต่ implementation ไม่ต้อง build infrastructure ของ 10,000 merchants ตั้งแต่วันแรก

ใช้ `Scale-ready boundaries + Measured scaling`

---

# 53. SERVICE EXTRACTION RULE

Candidate ที่สามารถแยกออกภายหลัง:

```text
Campaign Dispatch
Event Ingestion
Media Processing
Analytics Aggregation
Feed Ranking
```

ไม่ extract โดย default

---

# 54. DOCUMENT UPDATE RULE

เมื่อ implementation เปลี่ยน approved contract ต้อง update เอกสารที่เกี่ยวข้องใน task เดียวกัน

```text
Business Rule change
→ Business Rules
→ ER if affected
→ Migration if affected
→ API Contract
→ Tests
→ Roadmap Status
```

ห้ามให้ Code กลายเป็น source of truth ที่ขัดกับ docs

---

# 55. FILE CHANGE DISCIPLINE

ก่อนแก้ไฟล์ AI ต้อง:

1. ระบุไฟล์ที่เกี่ยวข้อง
2. จำกัด change set
3. หลีกเลี่ยง unrelated rewrite
4. ไม่ format repository ทั้งหมดโดยไม่จำเป็น
5. ไม่ลบ code ที่ไม่เกี่ยวข้อง
6. preserve public interfaces เว้นแต่ task กำหนด

---

# 56. DATABASE CHANGE DISCIPLINE

ก่อนสร้าง migration AI ต้องตรวจ:

```text
current latest migration number
existing table/column
FK dependency
enum/type
RLS
permissions
indexes
seed dependency
```

Repository state ล่าสุดคือ authority ของเลข migration ถัดไป

---

# 57. CHANGESET EXPECTATION

หนึ่ง task ควรเป็น atomic logical change เท่าที่ทำได้

Summary ควรบอก:

```text
What changed
Why
Files
Migration
Tests
Known limitations
Next dependency
```

---

# 58. AI HANDOFF TEMPLATE

```text
You are working on ADORA Commerce OS (ACOS).

MANDATORY READ ORDER:
1. ACOS_AI_CODING_CONSTITUTION.md
2. ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
3. Latest approved Business Rules for this module
4. Latest Frozen ER / Schema
5. Current Migration Status
6. Relevant API / Module Contract

TASK:
<Project / Track / Module / Phase / Task ID>

OBJECTIVE:
<exact objective>

ALLOWED SCOPE:
<files/modules/tables>

FORBIDDEN:
<files/modules/tables/behaviors>

DEPENDENCIES:
<approved dependencies>

ACCEPTANCE CRITERIA:
<testable outcomes>

TESTS REQUIRED:
<tests>

Do not invent schema, statuses, permissions, financial rules,
consent behavior, state transitions, or cross-module writes.

If required information is missing or conflicts with frozen documents,
return BLOCKED using the ACOS Blocked Response Format.
```

---

# 59. AI COMPLETION RESPONSE FORMAT

```text
STATUS: COMPLETED

TASK:
<task id>

CHANGES:
- ...

FILES:
- ...

DATABASE:
- none / migration xxx

TESTS:
- ...

SECURITY:
- ...

TENANT/RLS:
- ...

KNOWN LIMITATIONS:
- ...

NEXT DEPENDENCY:
- ...
```

---

# 60. PROJECT OWNER DECISIONS RESERVED FOR HUMAN REVIEW

AI ห้าม finalize เอง:

```text
Business Model
Pricing
Plan Limits
Refund Policy
Consent Purpose
Marketing Policy
Tax Rules
Role Authority
Financial Approval Limits
Data Retention Policy
Deletion Policy
Attribution Model
Major Architecture Change
Microservice Extraction
Provider Change affecting contract
```

AI วิเคราะห์และเสนอทางเลือกได้ แต่ไม่ freeze decision เอง

---

# 61. PROTECTED CORE

ส่วนนี้ถือเป็น Protected Core จนกว่า Roadmap ระบุว่าเปลี่ยนได้:

```text
Canonical Project Identity
Tenant Model
Customer Source of Truth
Product Source of Truth
Order Source of Truth
Historical Commerce Migrations
Core Permission Strategy
Core Audit Strategy
```

---

# 62. CURRENT DEVELOPMENT BASELINE

```text
Project:
ADORA Commerce OS

Architecture:
Modular Monolith

Commerce Core:
Architecture approved
Business Rules baseline approved
Schema frozen baseline
Migration 001–034 complete
Fresh DB validation required

Customer Engagement:
Architecture direction approved
Module boundary approved direction
ER extension proposed
Migration 035+ not yet generated
Business Rule Review is next gate
```

AI ต้อง verify repository state ก่อนลงมือจริง

---

# 63. GOLDEN RULE

เมื่อมีความขัดแย้งระหว่าง “เร็ว” กับ “ถูกต้อง” ในเรื่องต่อไปนี้ ให้เลือก **ถูกต้อง**:

```text
Data Integrity
Security
Tenant Isolation
Consent
Financial Logic
Migration Safety
```

---

# 64. FINAL CONSTITUTION

AI ทำหน้าที่:

```text
Implement Approved Decisions
Validate Constraints
Detect Conflicts
Report Blockers
Protect Architecture
Protect Data
Protect Tenant Isolation
Protect Historical Integrity
```

AI ไม่ทำหน้าที่:

```text
Invent Product Rules
Invent Financial Rules
Invent Consent Rules
Invent Schema Contracts
Bypass Security
Rewrite Architecture Without Approval
```

---

**END — ACOS AI CODING CONSTITUTION V1**

# ADORA Commerce OS (ACOS)
# BUSINESS RULES — CONTENT + CUSTOMER FEED + RETENTION V1

**Project Name:** ADORA Commerce OS  
**Short Name:** ACOS  
**Repository Slug:** `adora-commerce-os`  
**Document:** `BUSINESS_RULES_CONTENT_RETENTION_V1.md`  
**Status:** FROZEN FOR ER V2 / MIGRATION PLANNING
**Track:** Track B — Customer Engagement Platform  
**Scope:** Content, Media, Follow, Interest, Customer Feed, Consent, Suppression, Retention, Audience, Campaign, Messaging, Attribution, Usage/Quota  
**Out of Scope V1:** Native video hosting, social graph, public comments, customer-to-customer DM, creator marketplace, ML recommendation, automation engine production release

---

# 0. Purpose

เอกสารนี้กำหนด Business Rules สำหรับโมดูลใหม่ของ ACOS ที่รวม:

```text
Content
Customer Feed
Customer Retention
Audience
Campaign
Messaging
```

เป้าหมายคือทำให้ ACOS มีระบบสื่อสารและรักษาลูกค้าเก่าที่ธุรกิจเป็นเจ้าของเอง โดยไม่ต้องพึ่ง Facebook Retargeting เป็นช่องทางหลักเพียงอย่างเดียว

เอกสารนี้ใช้เป็น input สำหรับ:

```text
ER_DIAGRAM_V2_CONTENT_RETENTION.md
Migration 035+
API Contract
Service Contract
Test Case
AI Coding Task
```

---

# 1. Architectural Position

## BR-ARCH-001 — Track B เป็น Module ของ ACOS

Track B ต้องเป็นส่วนหนึ่งของ ACOS

ไม่ใช่ระบบแยกที่มีฐานข้อมูลลูกค้า สินค้า หรือคำสั่งซื้อของตัวเอง

**Status:** APPROVED

---

## BR-ARCH-002 — Modular Monolith First

Track B ต้องพัฒนาในรูปแบบ Modular Monolith ก่อน

ห้ามแยกเป็น microservices ตั้งแต่ V1

**Status:** APPROVED

---

## BR-ARCH-003 — Shared Core Source of Truth

Track B ต้องใช้ source of truth จาก Commerce Core:

```text
customers
products / variants
orders
organizations
users / memberships
promotions / coupons
loyalty
```

**Status:** APPROVED

---

## BR-ARCH-004 — No Duplicate Customer Master

ห้ามสร้าง customer master ใหม่สำหรับ marketing/content/retention

อนุญาตให้สร้าง projection/metrics เช่น:

```text
customer_retention_metrics
customer_consents
merchant_follows
customer_interests
```

แต่ต้องอ้าง `customer_id` จาก Core

**Status:** APPROVED

---

## BR-ARCH-005 — Tenant Boundary Required

ทุกข้อมูลของร้านค้าต้องมี `organization_id` เว้นแต่เป็น global reference table ที่ได้รับอนุมัติเป็นพิเศษ

**Status:** APPROVED

---

# 2. Content Rules

## BR-CONTENT-001 — Content Module Purpose

Content Module ทำหน้าที่ให้ Merchant สร้างเนื้อหาเพื่อสื่อสารกับลูกค้า เช่น:

```text
สินค้าใหม่
โปรโมชั่น
ประกาศ Live
บทความ
ประกาศร้าน
```

ไม่ใช่ social network แบบ Facebook

**Status:** APPROVED

---

## BR-CONTENT-002 — Supported Content Types V1

V1 รองรับ content type ดังนี้:

```text
GENERAL_POST
PRODUCT_POST
PROMOTION_POST
LIVE_ANNOUNCEMENT
ARTICLE
ANNOUNCEMENT
```

**Status:** APPROVED

---

## BR-CONTENT-003 — Content Types Deferred

V1 ยังไม่รองรับ:

```text
NATIVE_VIDEO
REELS
STORY
PUBLIC_COMMENT_THREAD
CUSTOMER_POST
CUSTOMER_REPOST
CREATOR_MARKETPLACE_POST
```

**Status:** DEFERRED

---

## BR-CONTENT-004 — Content Lifecycle

Content ต้องมี lifecycle ดังนี้:

```text
DRAFT
SCHEDULED
PUBLISHED
ARCHIVED
DELETED
```

**Status:** APPROVED

---

## BR-CONTENT-005 — Legal State Transitions

Allowed transitions:

```text
DRAFT → SCHEDULED
DRAFT → PUBLISHED
DRAFT → ARCHIVED
SCHEDULED → DRAFT
SCHEDULED → PUBLISHED
SCHEDULED → ARCHIVED
PUBLISHED → ARCHIVED
ARCHIVED → DRAFT
ARCHIVED → DELETED
```

Not allowed:

```text
DELETED → any state
PUBLISHED → DELETED directly
SCHEDULED → DELETED directly
```

**Status:** APPROVED

---

## BR-CONTENT-006 — Soft Delete by Default

Content deletion must be soft delete or archived first

Hard delete is allowed only for:

```text
draft cleanup
test data
admin-supervised privacy/legal requirement
```

**Status:** APPROVED

---

## BR-CONTENT-007 — Public Visibility

A published content item can be public if visibility is:

```text
PUBLIC
```

Public content can be opened without customer login

**Status:** APPROVED

---

## BR-CONTENT-008 — Member Visibility

Content can require customer identity if visibility is:

```text
MEMBER_ONLY
FOLLOWER_ONLY
SEGMENT_ONLY
```

**Status:** APPROVED

---

## BR-CONTENT-009 — Supported Visibility Modes V1

Supported visibility modes:

```text
PUBLIC
MEMBER_ONLY
FOLLOWER_ONLY
SEGMENT_ONLY
PRIVATE_PREVIEW
```

**Status:** APPROVED

---

## BR-CONTENT-010 — Segment Visibility

If visibility is `SEGMENT_ONLY`, content must reference an approved audience segment or audience snapshot

**Status:** APPROVED

---

## BR-CONTENT-011 — Draft Not Public

Draft content must never be visible on public or customer feed endpoints

**Status:** APPROVED

---

## BR-CONTENT-012 — Scheduled Content Not Public Before Publish Time

Scheduled content must not be publicly visible before `scheduled_at`

**Status:** APPROVED

---

## BR-CONTENT-013 — Published Content Requires Published Timestamp

When content becomes `PUBLISHED`, system must set:

```text
published_at
```

**Status:** APPROVED

---

## BR-CONTENT-014 — Merchant Ownership

Content belongs to exactly one organization

A merchant user can manage only content inside their organization according to permission

**Status:** APPROVED

---

## BR-CONTENT-015 — Content Author

Content must record author information:

```text
created_by_user_id
updated_by_user_id
```

ถ้ามีระบบ service account ภายหลัง ต้องแยก actor type

**Status:** APPROVED

---

## BR-CONTENT-016 — Product Linked Content

`PRODUCT_POST` สามารถ link กับ product หรือ variant ได้หลายรายการ

แต่ product data ไม่ถูกคัดลอกมาเป็น source of truth ใหม่

**Status:** APPROVED

---

## BR-CONTENT-017 — Product Snapshot for Display

อนุญาตให้เก็บ display snapshot บางส่วนใน content เช่น:

```text
product_name_snapshot
price_snapshot
thumbnail_snapshot
```

เพื่อ audit/display history

แต่ snapshot นี้ห้ามถือเป็น product source of truth

**Status:** APPROVED

---

## BR-CONTENT-018 — Promotion Linked Content

`PROMOTION_POST` สามารถ link กับ promotion/coupon ของ Commerce Core ได้

ถ้า promotion หมดอายุ post ยังเปิดดูได้ แต่ CTA ต้องแสดงสถานะหมดอายุ

**Status:** APPROVED

---

## BR-CONTENT-019 — Live Announcement Content

`LIVE_ANNOUNCEMENT` ต้องสามารถระบุ:

```text
live_starts_at
live_url
reminder_enabled
related_products optional
```

**Status:** APPROVED

---

## BR-CONTENT-020 — Article Content

`ARTICLE` รองรับ body แบบ rich text/markdown-safe structure

V1 ยังไม่ต้องรองรับ collaborative editing

**Status:** APPROVED

---

## BR-CONTENT-021 — Content Moderation V1

V1 ยังไม่มี public comment moderation

แต่ content ที่ merchant สร้างต้องสามารถถูก admin archive/suspend ได้ใน SaaS mode

**Status:** APPROVED

---

## BR-CONTENT-022 — Content Audit

Content lifecycle change ต้องมี audit log เมื่อเป็น action สำคัญ:

```text
publish
archive
delete
schedule
visibility change
```

**Status:** APPROVED

---

# 3. Media Rules

## BR-MEDIA-001 — Media Storage

Binary media must not be stored in PostgreSQL

PostgreSQL stores metadata/object key only

**Status:** APPROVED

---

## BR-MEDIA-002 — Supported Media V1

V1 รองรับ:

```text
IMAGE
DOCUMENT optional
```

Native hosted video is not supported in V1

**Status:** APPROVED

---

## BR-MEDIA-003 — Native Video Hosting

Native video hosting is deferred

ร้านค้าสามารถใส่ external video URL ได้ เช่น Facebook, YouTube, TikTok

**Status:** DEFERRED

---

## BR-MEDIA-004 — Image Variants

ระบบต้องรองรับ image variant อย่างน้อย:

```text
original
thumbnail
feed
large
```

**Status:** APPROVED

---

## BR-MEDIA-005 — Media Validation

ทุก media upload ต้อง validate:

```text
mime_type
file_size
extension
image_dimensions
organization_id
uploader permission
```

**Status:** APPROVED

---

## BR-MEDIA-006 — File Size Limit V1

Default limit V1:

```text
image <= 10 MB
document <= 20 MB
```

ค่าเหล่านี้สามารถ override ตาม plan/entitlement ได้

**Status:** APPROVED

---

## BR-MEDIA-007 — Media Quota

ทุก organization ต้องมี storage quota

Media upload ต้อง reject เมื่อเกิน quota เว้นแต่ระบบอนุญาต overage

**Status:** APPROVED

---

## BR-MEDIA-008 — Orphan Media Cleanup

Media ที่ upload แล้วไม่ถูก attach กับ content ภายในเวลาที่กำหนดต้องเข้าสู่ cleanup process

Default candidate:

```text
unattached > 24 hours
```

**Status:** APPROVED

---

## BR-MEDIA-009 — Media Abuse Protection

ระบบต้องมี:

```text
rate limit
file count limit
size limit
mime whitelist
virus/malware scan optional
```

Malware scan can be deferred for internal pilot but required before SaaS public beta

**Status:** APPROVED

---

# 4. Follow Rules

## BR-FOLLOW-001 — Follow Purpose

Follow คือความสัมพันธ์ระหว่าง customer กับ merchant เพื่อรับ feed/notification preference

ไม่ใช่ social graph ระหว่างลูกค้าด้วยกัน

**Status:** APPROVED

---

## BR-FOLLOW-002 — Follow Entity

Follow relationship:

```text
customer_id
organization_id
```

หนึ่ง customer สามารถ follow หลาย organization ได้

**Status:** APPROVED

---

## BR-FOLLOW-003 — Follow Status

Supported follow status:

```text
FOLLOWING
UNFOLLOWED
BLOCKED
```

**Status:** APPROVED

---

## BR-FOLLOW-004 — Unfollow Behavior

Unfollow ต้องหยุด follower-only feed eligibility

แต่ไม่จำเป็นต้อง revoke ทุก marketing consent โดยอัตโนมัติ

**Status:** APPROVED

---

## BR-FOLLOW-005 — Block Behavior

ถ้า customer block merchant/system channel ต้องสร้าง suppression สำหรับ channel ที่เกี่ยวข้อง

**Status:** APPROVED

---

## BR-FOLLOW-006 — Follow Audit

Follow/unfollow/block should be recorded as event

**Status:** APPROVED

---

# 5. Interest Rules

## BR-INTEREST-001 — Interest Purpose

Interest ใช้เพื่อให้ลูกค้าระบุหัวข้อที่สนใจ เช่น:

```text
กระเป๋า
เครื่องประดับ
Live
โปรโมชั่น
สินค้าใหม่
```

เพื่อใช้ feed ranking และ audience targeting

**Status:** APPROVED

---

## BR-INTEREST-002 — Interest Ownership

Interest topic can be:

```text
organization-owned
system/global optional
```

V1 ให้เริ่มจาก organization-owned เป็นหลัก

**Status:** APPROVED

---

## BR-INTEREST-003 — Customer Interest

Customer can opt in/out from interest topics

Interest must belong to the same organization context

**Status:** APPROVED

---

## BR-INTEREST-004 — Interest and Consent Are Separate

Interest ไม่ใช่ consent

ลูกค้าสนใจกระเป๋าไม่ได้แปลว่าส่ง SMS โปรโมชั่นได้

**Status:** APPROVED

---

# 6. Customer Feed Rules

## BR-FEED-001 — Feed Purpose

Customer Feed คือพื้นที่ให้ลูกค้าเห็น content ของร้านที่ตนติดตาม/มีสิทธิ์เห็น

ไม่ใช่ social feed สาธารณะแบบ discovery network

**Status:** APPROVED

---

## BR-FEED-002 — Feed V1 Sources

Feed V1 สามารถดึง content จาก:

```text
followed merchant
public merchant page
interest-matched content
member-only eligible content
segment-only eligible content
```

**Status:** APPROVED

---

## BR-FEED-003 — No Full Fan-out

ห้ามสร้าง feed row ล่วงหน้าทุก customer × post ตอน publish

**Status:** APPROVED

---

## BR-FEED-004 — Feed Ranking V1

Feed ranking V1 เป็น deterministic rule-based

ใช้สัญญาณ:

```text
published_at recency
follow relationship
interest match
product category match
content priority
live content priority
```

**Status:** APPROVED

---

## BR-FEED-005 — No ML Ranking V1

ห้ามเริ่มด้วย ML recommendation ใน V1

**Status:** DEFERRED

---

## BR-FEED-006 — Cursor Pagination

Feed endpoint ต้องใช้ cursor pagination ไม่ใช่ unbounded offset สำหรับ production feed

**Status:** APPROVED

---

## BR-FEED-007 — Visibility Enforcement

Feed query ต้อง enforce:

```text
organization scope
content status
visibility mode
customer eligibility
segment eligibility
```

**Status:** APPROVED

---

## BR-FEED-008 — Public Feed

Public merchant page สามารถแสดงเฉพาะ content:

```text
status = PUBLISHED
visibility = PUBLIC
```

**Status:** APPROVED

---

## BR-FEED-009 — Feed Events

V1 รองรับ feed/content events:

```text
IMPRESSION
VIEW
CLICK
PRODUCT_CLICK
CTA_CLICK
REMINDER_CLICK
SHARE_CLICK
```

**Status:** APPROVED

---

## BR-FEED-010 — Event Retention

Raw feed events are high volume

V1 default:

```text
raw events retained 180 days
aggregated events retained longer
```

ค่า retention สามารถปรับตาม plan/compliance ภายหลัง

**Status:** APPROVED

---

# 7. Consent Rules

## BR-CONSENT-001 — Consent Purpose

Consent Center ใช้ควบคุมว่าลูกค้ายินยอมให้สื่อสารผ่าน channel/purpose ใด

**Status:** APPROVED

---

## BR-CONSENT-002 — Supported Channels V1

Supported channels:

```text
LINE
SMS
EMAIL
PHONE
```

**Status:** APPROVED

---

## BR-CONSENT-003 — Supported Purposes V1

Supported purposes:

```text
ORDER_UPDATE
LIVE_NOTIFICATION
PROMOTION
NEW_PRODUCT
LOYALTY
CONTENT_UPDATE
```

**Status:** APPROVED

---

## BR-CONSENT-004 — Operational vs Marketing Purpose

`ORDER_UPDATE` เป็น operational communication

ส่วน:

```text
PROMOTION
NEW_PRODUCT
LIVE_NOTIFICATION
CONTENT_UPDATE
LOYALTY
```

ถือเป็น marketing/engagement purpose เว้นแต่กฎหมาย/นโยบายกำหนดละเอียดกว่านี้ภายหลัง

**Status:** APPROVED

---

## BR-CONSENT-005 — Consent Status

Supported consent status:

```text
GRANTED
REVOKED
UNKNOWN
```

**Status:** APPROVED

---

## BR-CONSENT-006 — Unknown Means Not Allowed for Marketing

ถ้า consent status เป็น `UNKNOWN` ห้ามส่ง marketing message

**Status:** APPROVED

---

## BR-CONSENT-007 — Consent Grant

Consent grant ต้องบันทึก:

```text
customer_id
organization_id
channel
purpose
status
source
policy_version
granted_at
actor/customer identifier
```

**Status:** APPROVED

---

## BR-CONSENT-008 — Consent Revoke

Revoke ต้องมีผลกับ dispatch ทันทีเท่าที่ระบบทำได้

message job ที่ยังไม่ส่งต้องตรวจ consent ใหม่ก่อนส่ง

**Status:** APPROVED

---

## BR-CONSENT-009 — Consent Event Log

Consent change ต้องบันทึก event history แบบ append-only

**Status:** APPROVED

---

## BR-CONSENT-010 — Consent and Follow Are Separate

Follow merchant ไม่เท่ากับ consent marketing

Consent ต้องแยกจาก follow เสมอ

**Status:** APPROVED

---

## BR-CONSENT-011 — Consent Self-Service

Customer ต้องสามารถดู/แก้ preference ได้ผ่าน customer portal หรือ LINE-linked portal

**Status:** APPROVED

---

## BR-CONSENT-012 — Dispatch-Time Check

ก่อนส่ง message ทุกครั้ง ต้องตรวจ:

```text
current consent
suppression
channel availability
purpose
tenant quota
```

**Status:** APPROVED

---

# 8. Suppression Rules

## BR-SUPPRESSION-001 — Suppression Purpose

Suppression ใช้หยุดการส่งข้อความแม้ consent ยังมีอยู่ เช่น bounce, block, complaint, manual suppression

**Status:** APPROVED

---

## BR-SUPPRESSION-002 — Suppression Types V1

Supported types:

```text
BOUNCED
COMPLAINED
BLOCKED
UNSUBSCRIBED
MANUAL_SUPPRESS
INVALID_DESTINATION
```

**Status:** APPROVED

---

## BR-SUPPRESSION-003 — Suppression Precedence

Suppression overrides consent for affected channel/purpose

**Status:** APPROVED

---

## BR-SUPPRESSION-004 — Suppression Scope

Suppression can be scoped by:

```text
organization
customer
channel
destination
purpose optional
```

**Status:** APPROVED

---

# 9. Retention Rules

## BR-RETENTION-001 — Retention Purpose

Retention Module คำนวณพฤติกรรมลูกค้าเพื่อช่วยเพิ่มยอดซื้อซ้ำ

ไม่ใช่แหล่งแก้ไข order history

**Status:** APPROVED

---

## BR-RETENTION-002 — Metrics V1

Supported customer metrics V1:

```text
first_purchase_at
last_purchase_at
order_count
lifetime_value
average_order_value
recency_days
frequency_score
monetary_score
rfm_score
last_engagement_at
engagement_score
churn_risk_score optional
```

**Status:** APPROVED

---

## BR-RETENTION-003 — RFM Calculation

RFM V1 เป็น rule-based scoring

ช่วงคะแนน default:

```text
1–5 for Recency
1–5 for Frequency
1–5 for Monetary
```

**Status:** APPROVED

---

## BR-RETENTION-004 — Segment Labels V1

Default retention segments:

```text
CHAMPION
LOYAL
POTENTIAL_LOYALIST
NEW_CUSTOMER
AT_RISK
LOST
DORMANT
```

**Status:** APPROVED

---

## BR-RETENTION-005 — Segment Definition Must Be Configurable Later

V1 สามารถ hardcode default rule ได้ในระดับแรก แต่ schema ต้องไม่ปิดทางให้ปรับ segment rule ภายหลัง

**Status:** APPROVED

---

## BR-RETENTION-006 — Retention Refresh

Retention metrics can be refreshed:

```text
scheduled batch
event-driven projection later
manual refresh for admin
```

V1 ใช้ scheduled batch ก่อน

**Status:** APPROVED

---

## BR-RETENTION-007 — Retention Metrics Are Projection

Retention metrics เป็น projection จาก order/event data

ถ้าคำนวณผิด สามารถ rebuild ได้

**Status:** APPROVED

---

# 10. Audience Rules

## BR-AUDIENCE-001 — Audience Purpose

Audience Module ใช้เลือกกลุ่มลูกค้าสำหรับ feed visibility, campaign, analytics

**Status:** APPROVED

---

## BR-AUDIENCE-002 — Segment Types V1

Supported segment types:

```text
STATIC
DYNAMIC_RULE
SNAPSHOT
```

**Status:** APPROVED

---

## BR-AUDIENCE-003 — Dynamic Segment Rule

Dynamic rule สามารถใช้ criteria เช่น:

```text
customer attributes
follow status
interest
purchase category
order count
lifetime value
last purchase date
retention segment
engagement behavior
consent eligibility optional preview only
```

**Status:** APPROVED

---

## BR-AUDIENCE-004 — Audience Preview

ระบบต้องรองรับ preview count ก่อนสร้าง campaign

**Status:** APPROVED

---

## BR-AUDIENCE-005 — Audience Snapshot Required for Campaign

Campaign dispatch ต้องใช้ audience snapshot

ห้ามส่ง campaign จาก dynamic query โดยไม่ freeze snapshot

**Status:** APPROVED

---

## BR-AUDIENCE-006 — Snapshot Membership

Audience snapshot ต้องบันทึก member ที่ evaluate ได้ ณ เวลานั้น

**Status:** APPROVED

---

## BR-AUDIENCE-007 — Consent Not Frozen in Snapshot

Snapshot บอกว่าลูกค้าเข้าเงื่อนไข audience ณ เวลานั้น

แต่ consent ต้องตรวจซ้ำตอน dispatch

**Status:** APPROVED

---

## BR-AUDIENCE-008 — Snapshot Audit

Snapshot ต้องเก็บ:

```text
segment_id/rule_reference
created_at
created_by
member_count
criteria_hash/version
```

**Status:** APPROVED

---

# 11. Campaign Rules

## BR-CAMPAIGN-001 — Campaign Purpose

Campaign ใช้ส่ง content/message ไปยัง audience ที่เลือกอย่างมี control, consent, audit และ usage tracking

**Status:** APPROVED

---

## BR-CAMPAIGN-002 — Campaign States

Supported states V1:

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

**Status:** APPROVED

---

## BR-CAMPAIGN-003 — Campaign State Transitions

Allowed:

```text
DRAFT → SCHEDULED
DRAFT → PREPARING
SCHEDULED → PREPARING
SCHEDULED → CANCELLED
PREPARING → RUNNING
PREPARING → FAILED
RUNNING → PAUSED
RUNNING → COMPLETED
RUNNING → FAILED
PAUSED → RUNNING
PAUSED → CANCELLED
FAILED → DRAFT optional
```

Not allowed:

```text
COMPLETED → RUNNING
CANCELLED → RUNNING
```

**Status:** APPROVED

---

## BR-CAMPAIGN-004 — Campaign Channels V1

Supported campaign channels:

```text
LINE
SMS
EMAIL
```

Phone call list is deferred as a generated task/list, not automated calling

**Status:** APPROVED

---

## BR-CAMPAIGN-005 — Campaign Must Reference Purpose

Campaign must have communication purpose:

```text
PROMOTION
NEW_PRODUCT
LIVE_NOTIFICATION
CONTENT_UPDATE
LOYALTY
```

**Status:** APPROVED

---

## BR-CAMPAIGN-006 — Audience Snapshot Required

Campaign cannot enter `PREPARING` without audience snapshot

**Status:** APPROVED

---

## BR-CAMPAIGN-007 — Dry Run Required Before Send

Campaign must support preview/dry-run showing:

```text
audience count
estimated eligible recipients by channel
estimated usage/cost where available
missing consent count
suppressed count
```

**Status:** APPROVED

---

## BR-CAMPAIGN-008 — Cancel Behavior

Campaign can be cancelled before dispatch completion

Already sent messages cannot be unsent

Unsent message jobs must be cancelled if campaign is cancelled

**Status:** APPROVED

---

## BR-CAMPAIGN-009 — Retry Behavior

Retry must be idempotent

Permanent failures must not be retried endlessly

**Status:** APPROVED

---

## BR-CAMPAIGN-010 — Campaign Audit

Campaign lifecycle changes must be audited

**Status:** APPROVED

---

# 12. Messaging Rules

## BR-MSG-001 — Messaging Orchestrator Required

Campaign must send messages through Messaging Orchestrator

Campaign must not call LINE/SMS/Email APIs directly

**Status:** APPROVED

---

## BR-MSG-002 — Message Job

Every outbound message must have message job record

**Status:** APPROVED

---

## BR-MSG-003 — Message Job States

Supported states:

```text
PENDING
QUEUED
SENDING
SENT
DELIVERED
FAILED
CANCELLED
SUPPRESSED
SKIPPED_NO_CONSENT
```

**Status:** APPROVED

---

## BR-MSG-004 — Provider Adapter

Each provider must implement adapter contract

```text
LINE adapter
SMS adapter
Email adapter
```

**Status:** APPROVED

---

## BR-MSG-005 — Provider Credentials

Provider credentials belong to organization configuration and must be encrypted or stored in secure secret management

**Status:** APPROVED

---

## BR-MSG-006 — Merchant-Owned Provider Accounts

V1 direction: merchant should connect/use own provider account where appropriate, especially LINE OA

ACOS handles orchestration and usage tracking

**Status:** APPROVED

---

## BR-MSG-007 — Delivery Attempt

Each send attempt must be recorded with:

```text
message_job_id
provider
attempt_no
status
provider_message_id optional
error_code optional
error_message safe summary optional
attempted_at
```

**Status:** APPROVED

---

## BR-MSG-008 — Retry Policy

Transient provider errors may retry with backoff

Permanent errors must mark failed/suppressed according to error type

**Status:** APPROVED

---

## BR-MSG-009 — Idempotency

Message send must have idempotency key to avoid duplicate sends from retry

**Status:** APPROVED

---

## BR-MSG-010 — Queue Required for Bulk Messaging

Bulk message dispatch must go through queue/worker

No synchronous loop sending large campaigns inside HTTP request

**Status:** APPROVED

---

# 13. LINE Rules

## BR-LINE-001 — LINE Role

LINE is primary engagement channel for Thai commerce use case

**Status:** APPROVED

---

## BR-LINE-002 — LINE Identity Linking

System should support linking customer identity with LINE user identity

V1 can support link through OTP/member login/account linking strategy depending on provider capability

**Status:** APPROVED

---

## BR-LINE-003 — LINE Consent

Having LINE user ID does not automatically grant marketing consent

Consent must still be checked by channel/purpose

**Status:** APPROVED

---

## BR-LINE-004 — LINE Block Handling

If LINE webhook indicates user blocked/unfollowed OA, system should create/update suppression for LINE

**Status:** APPROVED

---

# 14. Email Rules

## BR-EMAIL-001 — Email Consent

Marketing email requires consent/purpose eligibility unless explicitly treated as operational

**Status:** APPROVED

---

## BR-EMAIL-002 — Unsubscribe Required

Marketing email must provide unsubscribe/preference path

**Status:** APPROVED

---

## BR-EMAIL-003 — Bounce/Complaint Handling

Bounce/complaint must create/update suppression

**Status:** APPROVED

---

# 15. SMS Rules

## BR-SMS-001 — SMS Consent

Marketing SMS requires explicit eligibility and no suppression

**Status:** APPROVED

---

## BR-SMS-002 — SMS Cost Guardrail

SMS campaign must show estimated usage/cost where provider pricing is available

**Status:** APPROVED

---

## BR-SMS-003 — SMS Hard Limit

Tenant must have SMS quota/spend guardrail before production SaaS use

**Status:** APPROVED

---

# 16. Live Reminder Rules

## BR-LIVE-REM-001 — Live Reminder Purpose

Live reminder lets customer request notification before live event

**Status:** APPROVED

---

## BR-LIVE-REM-002 — Customer Action Required

Customer should explicitly click/request reminder for personalized reminder

**Status:** APPROVED

---

## BR-LIVE-REM-003 — Reminder Offsets V1

Default reminder offsets:

```text
24 hours before
1 hour before
10 minutes before
```

Merchant can choose enabled offsets

**Status:** APPROVED

---

## BR-LIVE-REM-004 — Reminder Dispatch Consent

Live reminder dispatch must check consent for:

```text
LIVE_NOTIFICATION
```

on selected channel

**Status:** APPROVED

---

# 17. Attribution Rules

## BR-ATTR-001 — Attribution Purpose

Attribution links campaign/content engagement to order/revenue

**Status:** APPROVED

---

## BR-ATTR-002 — Attribution Model V1

V1 uses last-click attribution within defined window

Default attribution window:

```text
7 days
```

**Status:** APPROVED

---

## BR-ATTR-003 — Attribution Event Chain

Attribution should support chain:

```text
content
campaign
message
click
session/customer
order
revenue
```

**Status:** APPROVED

---

## BR-ATTR-004 — Revenue Source

Revenue must come from Order/Payment source of truth

Attribution cannot rewrite order totals

**Status:** APPROVED

---

## BR-ATTR-005 — ROI Calculation

Campaign ROI V1:

```text
attributed_revenue / campaign_variable_cost
```

If cost is zero/unknown, ROI must be shown as unavailable, not infinite

**Status:** APPROVED

---

## BR-ATTR-006 — Cost Components

Campaign variable cost may include:

```text
LINE message usage
SMS cost
Email cost
AI generation cost optional
media processing optional
```

**Status:** APPROVED

---

# 18. Usage / Quota Rules

## BR-USAGE-001 — Usage Meter Required

SaaS usage must be measurable per organization

**Status:** APPROVED

---

## BR-USAGE-002 — Usage Types V1

Usage types:

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

**Status:** APPROVED

---

## BR-USAGE-003 — No Unlimited Messaging Default

ห้าม default unlimited สำหรับ:

```text
LINE
SMS
EMAIL
AI
STORAGE
```

**Status:** APPROVED

---

## BR-USAGE-004 — Quota Enforcement

Quota can enforce by:

```text
hard block
soft warning
overage billing
manual approval
```

V1 internal pilot can start with soft warning but SaaS beta requires hard guardrail for high-cost usage

**Status:** APPROVED

---

## BR-USAGE-005 — Cost Attribution

Variable cost must be traceable by organization where feasible

**Status:** APPROVED

---

# 19. Security / Privacy Rules

## BR-SEC-001 — RLS Required

Tenant-owned tables must have RLS or equivalent server-side enforcement

**Status:** APPROVED

---

## BR-SEC-002 — Cross-Tenant Negative Test

Every major module must have cross-tenant negative test

**Status:** APPROVED

---

## BR-SEC-003 — Public Endpoints

Public endpoints must enforce:

```text
visibility
status
rate limit
safe output
no private customer data exposure
```

**Status:** APPROVED

---

## BR-SEC-004 — PII Logging

Do not log full PII unless required and approved

**Status:** APPROVED

---

## BR-SEC-005 — Customer Data Export/Delete

Detailed export/delete/anonymization rules are required before SaaS GA

For V1 pilot, do not hard delete customer/order/consent history without approved process

**Status:** IN_REVIEW

---

# 20. Admin Permission Rules

## BR-PERM-001 — Required Permission Areas

Track B requires permission areas:

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

**Status:** APPROVED FOR ER/RBAC REVIEW

---

## BR-PERM-002 — Publish Permission

Creating draft and publishing content should be separate permissions

**Status:** APPROVED

---

## BR-PERM-003 — Campaign Send Permission

Creating campaign and sending campaign should be separate permissions

**Status:** APPROVED

---

# 21. Out of Scope V1

The following are explicitly out of scope for V1 implementation:

```text
Native video hosting
Public comments
Customer-to-customer messaging
Customer social graph
Creator marketplace
Reels/TikTok clone
ML recommendation engine
Automation engine production use
Mobile native app
Unlimited message plan
```

**Status:** APPROVED

---

# 22. ER V2 Impact Summary

This Business Rule set implies the following table groups for ER V2:

```text
content_posts
content_media
content_product_links
content_promotion_links
content_live_links optional

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
audience_snapshots
audience_snapshot_members

marketing_campaigns
campaign_runs

message_jobs
message_delivery_attempts

attribution_events
usage_meter_events optional/extension
```

Exact table names may be adjusted in ER V2, but source-of-truth rules must not be violated

---

# 23. Migration Impact Summary

Track B migration must start after current migration baseline:

```text
035+
```

Migration generation is now allowed only after ER V2 review confirms:

```text
PK
FK
organization_id
RLS
indexes
state enums
audit fields
retention policy
usage meter integration
```

---

# 24. Implementation Gate

After this file is accepted:

```text
Business Rules:
FROZEN FOR ER V2 / MIGRATION PLANNING

Next:
ER_DIAGRAM_V2_CONTENT_RETENTION.md

Still blocked:
Production SQL migration
Production implementation
Campaign dispatch
Provider integration
```

Track B implementation remains blocked until:

```text
ER V2 is frozen
Migration 035+ is generated
Fresh replay 001→latest passes
```

---

# 25. AI Coding Instruction

AI Coding Agents must treat this document as Business Rule authority for Track B

If implementation requires a rule not listed here:

```text
STATUS: BLOCKED
```

Do not invent rules silently

---

# 26. Version History

| Version | Date | Status | Notes |
|---|---|---|---|
| V1 | 2026-07-28 | FROZEN FOR ER V2 / MIGRATION PLANNING | Owner freeze confirmation; initial Content + Customer Feed + Retention business rules |

---

**END — BUSINESS_RULES_CONTENT_RETENTION_V1**

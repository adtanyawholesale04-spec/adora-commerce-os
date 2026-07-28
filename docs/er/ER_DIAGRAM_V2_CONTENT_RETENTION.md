# ADORA Commerce OS (ACOS)
# ER DIAGRAM V2 — CONTENT + CUSTOMER FEED + RETENTION

**Project Name:** ADORA Commerce OS  
**Short Name:** ACOS  
**Repository Slug:** `adora-commerce-os`  
**Document:** `ER_DIAGRAM_V2_CONTENT_RETENTION.md`  
**Status:** FROZEN FOR MIGRATION PLANNING  
**Track:** Track B — Customer Engagement Platform  
**Depends On:** `BUSINESS_RULES_CONTENT_RETENTION_V1.md`  
**Migration Target:** `035+`  
**Primary Rule:** Track B extends ACOS. It must not create duplicate Customer, Product, Order, or Organization source of truth.

---

# 0. Purpose

เอกสารนี้กำหนด ER V2 สำหรับโมดูล:

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
Usage hooks
```

ใช้เป็น source สำหรับ:

```text
Migration 035+
RLS policy design
Index design
API contract
Service contract
AI coding tasks
Integration tests
```

---

# 1. Design Principles

## ER-PRIN-001 — Extend, Do Not Duplicate

Track B ต้องอ้าง Core tables ของ ACOS:

```text
organizations
users / profiles / memberships
customers
products
product_variants
orders
order_items
promotions / coupons
loyalty entities
audit logs
subscription / usage entities
```

ห้ามสร้าง Customer/Product/Order master ซ้ำ

---

## ER-PRIN-002 — Tenant-Owned Tables Require organization_id

ทุก table ที่เป็นข้อมูลของ merchant ต้องมี:

```text
organization_id uuid not null
```

และต้องมี RLS / server-side tenant enforcement

---

## ER-PRIN-003 — Append-Only Where History Matters

ข้อมูลที่ต้อง audit/trace เช่น:

```text
consent events
delivery attempts
campaign runs
content events
attribution events
```

ควรเป็น append-only หรือแก้ไขจำกัดมาก

---

## ER-PRIN-004 — Snapshot for Audit

Campaign ต้องใช้ audience snapshot

Dynamic segment rule ห้ามถูกใช้ส่ง campaign ตรง ๆ โดยไม่ freeze snapshot

---

## ER-PRIN-005 — Consent Checked at Dispatch

Audience snapshot เป็น targeting history

แต่ message dispatch ต้องตรวจ current consent และ suppression อีกครั้ง

---

## ER-PRIN-006 — No Full Feed Fan-out

ห้ามสร้าง feed rows แบบ:

```text
customer_count × post_count
```

ตอน publish content

---

# 2. External Core References

ER V2 อ้างตาราง Core ต่อไปนี้เป็น source of truth

> ชื่อตารางจริงต้องยืนยันกับ Frozen Schema V1 ก่อนสร้าง migration

| Logical Entity | Core Source | Usage in Track B |
|---|---|---|
| Organization | `organizations` | tenant owner |
| User / Staff | `users` / `profiles` / `memberships` | author, actor, permission |
| Customer | `customers` | recipient, follower, retention subject |
| Product | `products` | content product link, purchase behavior |
| Variant | `product_variants` | product-linked content |
| Category | `categories` / product category table | interest/product matching |
| Order | `orders` | retention and attribution |
| Order Item | `order_items` | product/category purchase signals |
| Promotion/Coupon | `promotions` / `coupons` | promotion-linked content |
| Live Session | `live_sessions` if present | live announcement link |
| Subscription Usage | `subscription_usage` or equivalent | usage metering hook |
| Audit | `audit_logs` or equivalent | lifecycle audit |

ถ้าชื่อจริงไม่ตรง ให้ migration ใช้ชื่อจริงจาก Frozen Schema

---

# 3. High-Level ER Map

```text
organizations
   │
   ├── content_posts
   │       │
   │       ├── content_media
   │       ├── content_product_links ───── products / product_variants
   │       ├── content_promotion_links ─── promotions / coupons
   │       └── content_live_links ──────── live_sessions optional
   │
   ├── interest_topics
   │       └── customer_interests ──────── customers
   │
   ├── merchant_follows ───────────────── customers
   │
   ├── customer_consents ──────────────── customers
   │       └── customer_consent_events
   │
   ├── customer_suppressions ──────────── customers
   │
   ├── content_events ─────────────────── customers/content_posts
   │
   ├── customer_retention_metrics ─────── customers
   │
   ├── audience_segments
   │       ├── audience_segment_rules
   │       └── audience_snapshots
   │              └── audience_snapshot_members ─ customers
   │
   ├── marketing_campaigns
   │       └── campaign_runs
   │              ├── audience_snapshots
   │              └── message_jobs
   │                     └── message_delivery_attempts
   │
   └── attribution_events ─────────────── content/campaign/message/order/customer
```

---

# 4. Enum / Status Catalog

Migration can implement these as PostgreSQL enums or constrained text.  
Recommendation: use constrained text in early modular evolution unless existing ACOS convention prefers enums.

## content_type

```text
GENERAL_POST
PRODUCT_POST
PROMOTION_POST
LIVE_ANNOUNCEMENT
ARTICLE
ANNOUNCEMENT
```

## content_status

```text
DRAFT
SCHEDULED
PUBLISHED
ARCHIVED
DELETED
```

## content_visibility

```text
PUBLIC
MEMBER_ONLY
FOLLOWER_ONLY
SEGMENT_ONLY
PRIVATE_PREVIEW
```

## media_type

```text
IMAGE
DOCUMENT
```

## media_variant

```text
original
thumbnail
feed
large
```

## follow_status

```text
FOLLOWING
UNFOLLOWED
BLOCKED
```

## consent_channel

```text
LINE
SMS
EMAIL
PHONE
```

## consent_purpose

```text
ORDER_UPDATE
LIVE_NOTIFICATION
PROMOTION
NEW_PRODUCT
LOYALTY
CONTENT_UPDATE
```

## consent_status

```text
GRANTED
REVOKED
UNKNOWN
```

## suppression_type

```text
BOUNCED
COMPLAINED
BLOCKED
UNSUBSCRIBED
MANUAL_SUPPRESS
INVALID_DESTINATION
```

## content_event_type

```text
IMPRESSION
VIEW
CLICK
PRODUCT_CLICK
CTA_CLICK
REMINDER_CLICK
SHARE_CLICK
```

## retention_segment

```text
CHAMPION
LOYAL
POTENTIAL_LOYALIST
NEW_CUSTOMER
AT_RISK
LOST
DORMANT
```

## audience_segment_type

```text
STATIC
DYNAMIC_RULE
SNAPSHOT
```

## campaign_status

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

## campaign_channel

```text
LINE
SMS
EMAIL
```

## message_job_status

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

## attribution_event_type

```text
CONTENT_VIEW
CAMPAIGN_CLICK
MESSAGE_CLICK
ORDER_PLACED
ORDER_PAID
ATTRIBUTED_REVENUE
```

## usage_type extension

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

---

# 5. Table Group A — Content

---

## 5.1 content_posts

Purpose: เก็บ content หลักของร้าน

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | FK organizations |
| content_type | text | yes | constrained |
| status | text | yes | default `DRAFT` |
| visibility | text | yes | default `PUBLIC` or `PRIVATE_PREVIEW` by rule |
| title | text | no | required for ARTICLE maybe |
| short_text | text | no | short caption |
| body | jsonb/text | no | rich text/markdown-safe body |
| excerpt | text | no | preview text |
| priority | integer | yes | default 0 |
| scheduled_at | timestamptz | no | required when status `SCHEDULED` |
| published_at | timestamptz | no | set when published |
| archived_at | timestamptz | no | set when archived |
| deleted_at | timestamptz | no | soft delete |
| created_by_user_id | uuid | yes | FK users/profiles |
| updated_by_user_id | uuid | no | FK users/profiles |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto update |

### Constraints

```text
status in content_status
content_type in content_type
visibility in content_visibility

if status = SCHEDULED then scheduled_at is not null
if status = PUBLISHED then published_at is not null
if status = DELETED then deleted_at is not null
```

### Indexes

```text
(organization_id, status, published_at desc)
(organization_id, content_type, status)
(organization_id, visibility, status)
(organization_id, scheduled_at) where status = 'SCHEDULED'
```

### RLS

Merchant staff can access rows only for own `organization_id` and permission.

Public read allowed only through controlled endpoint for:

```text
status = PUBLISHED
visibility = PUBLIC
deleted_at is null
```

---

## 5.2 content_media

Purpose: media metadata/object key; actual binary อยู่ใน object storage

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | FK organizations |
| content_post_id | uuid | no | FK content_posts; nullable during upload draft |
| media_type | text | yes | IMAGE/DOCUMENT |
| variant | text | yes | original/thumbnail/feed/large |
| storage_bucket | text | yes | provider bucket |
| storage_key | text | yes | object key |
| public_url | text | no | optional/cached |
| mime_type | text | yes | validated |
| file_size_bytes | bigint | yes | validated |
| width | integer | no | images |
| height | integer | no | images |
| checksum | text | no | optional |
| alt_text | text | no | accessibility |
| sort_order | integer | yes | default 0 |
| upload_status | text | yes | default `UPLOADED`; optional constrained |
| uploaded_by_user_id | uuid | yes | FK users/profiles |
| attached_at | timestamptz | no | set when linked to content |
| created_at | timestamptz | yes | default now |
| deleted_at | timestamptz | no | soft delete/object cleanup |

### Indexes

```text
(organization_id, content_post_id, sort_order)
(organization_id, created_at desc)
(organization_id, attached_at) where attached_at is null
```

### Notes

A single logical image may have multiple rows by variant, or a parent-child relation can be added later. V1 can keep rows per variant with shared `checksum` or `original_media_id` if needed.

---

## 5.3 content_product_links

Purpose: link content with product/variant

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| content_post_id | uuid | yes | FK content_posts |
| product_id | uuid | yes | FK products |
| product_variant_id | uuid | no | FK product_variants |
| product_name_snapshot | text | no | display snapshot |
| price_snapshot | numeric | no | optional |
| thumbnail_snapshot | text | no | optional |
| sort_order | integer | yes | default 0 |
| created_at | timestamptz | yes | default now |

### Constraints

```text
unique(content_post_id, product_id, product_variant_id)
```

### Indexes

```text
(organization_id, product_id)
(content_post_id, sort_order)
```

---

## 5.4 content_promotion_links

Purpose: link content to promotion/coupon

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| content_post_id | uuid | yes | FK content_posts |
| promotion_id | uuid | no | FK promotions if exists |
| coupon_id | uuid | no | FK coupons if exists |
| label_snapshot | text | no | display |
| starts_at_snapshot | timestamptz | no | display |
| ends_at_snapshot | timestamptz | no | display |
| created_at | timestamptz | yes | default now |

### Constraints

At least one of:

```text
promotion_id
coupon_id
```

must be not null.

---

## 5.5 content_live_links

Purpose: link live announcement to live session/external URL

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| content_post_id | uuid | yes | FK content_posts |
| live_session_id | uuid | no | FK live_sessions if exists |
| live_starts_at | timestamptz | yes |  |
| live_url | text | no | external URL |
| reminder_enabled | boolean | yes | default false |
| created_at | timestamptz | yes | default now |

### Constraint

`content_post_id` should reference post with `content_type = LIVE_ANNOUNCEMENT` by application rule or DB trigger.

---

# 6. Table Group B — Follow / Interest

---

## 6.1 merchant_follows

Purpose: relationship customer follows merchant

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | followed merchant |
| customer_id | uuid | yes | FK customers |
| status | text | yes | FOLLOWING/UNFOLLOWED/BLOCKED |
| followed_at | timestamptz | no | set when following |
| unfollowed_at | timestamptz | no | set when unfollowed |
| blocked_at | timestamptz | no | set when blocked |
| source | text | no | LINE/web/import |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, customer_id)
```

### Indexes

```text
(organization_id, status)
(customer_id, status)
(organization_id, customer_id)
```

---

## 6.2 interest_topics

Purpose: organization-owned interest topics

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| name | text | yes | display |
| slug | text | yes | stable |
| description | text | no |  |
| is_active | boolean | yes | default true |
| sort_order | integer | yes | default 0 |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, slug)
```

### Indexes

```text
(organization_id, is_active, sort_order)
```

---

## 6.3 customer_interests

Purpose: customer opted interest topics

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| customer_id | uuid | yes | FK customers |
| interest_topic_id | uuid | yes | FK interest_topics |
| opted_in | boolean | yes | default true |
| source | text | no | customer/admin/import |
| opted_in_at | timestamptz | no |  |
| opted_out_at | timestamptz | no |  |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, customer_id, interest_topic_id)
```

### Indexes

```text
(organization_id, customer_id, opted_in)
(organization_id, interest_topic_id, opted_in)
```

---

# 7. Table Group C — Consent / Suppression

---

## 7.1 customer_consents

Purpose: current consent state by customer/channel/purpose

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| customer_id | uuid | yes | FK customers |
| channel | text | yes | LINE/SMS/EMAIL/PHONE |
| purpose | text | yes | consent_purpose |
| status | text | yes | GRANTED/REVOKED/UNKNOWN |
| destination | text | no | phone/email/line identity ref optional |
| source | text | no | import/web/line/admin |
| policy_version | text | no | privacy/consent version |
| granted_at | timestamptz | no |  |
| revoked_at | timestamptz | no |  |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, customer_id, channel, purpose, coalesce(destination,''))
```

Implementation note: PostgreSQL unique with nullable destination may need expression index.

### Indexes

```text
(organization_id, customer_id, channel, purpose)
(organization_id, channel, purpose, status)
```

---

## 7.2 customer_consent_events

Purpose: append-only consent history

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| customer_id | uuid | yes | FK customers |
| consent_id | uuid | no | FK customer_consents |
| channel | text | yes |  |
| purpose | text | yes |  |
| previous_status | text | no |  |
| new_status | text | yes |  |
| destination | text | no |  |
| source | text | no |  |
| policy_version | text | no |  |
| actor_type | text | yes | CUSTOMER/USER/SYSTEM/IMPORT |
| actor_user_id | uuid | no | FK users/profiles |
| occurred_at | timestamptz | yes | default now |
| metadata | jsonb | no | safe metadata |

### Indexes

```text
(organization_id, customer_id, occurred_at desc)
(organization_id, channel, purpose, occurred_at desc)
```

### Rule

Append-only by application rule. Updates should be prohibited except admin repair workflow.

---

## 7.3 customer_suppressions

Purpose: stop message delivery despite consent

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| customer_id | uuid | no | FK customers; nullable if destination-only suppression |
| channel | text | yes | LINE/SMS/EMAIL/PHONE |
| purpose | text | no | optional |
| destination | text | no | phone/email/line id |
| suppression_type | text | yes | constrained |
| reason | text | no | safe summary |
| source | text | no | provider/admin/system |
| starts_at | timestamptz | yes | default now |
| ends_at | timestamptz | no | null = active indefinitely |
| created_at | timestamptz | yes | default now |
| created_by_user_id | uuid | no | FK users/profiles |

### Indexes

```text
(organization_id, customer_id, channel)
(organization_id, channel, destination)
(organization_id, suppression_type, starts_at desc)
```

### Active Logic

Suppression is active when:

```text
starts_at <= now()
and (ends_at is null or ends_at > now())
```

---

# 8. Table Group D — Content Events / Feed Events

---

## 8.1 content_events

Purpose: high-volume engagement events

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid/bigint | yes | PK; bigint may be better at scale |
| organization_id | uuid | yes | tenant |
| content_post_id | uuid | no | FK content_posts |
| customer_id | uuid | no | FK customers; nullable public visitor |
| anonymous_id | text | no | visitor/session id |
| event_type | text | yes | constrained |
| campaign_id | uuid | no | FK marketing_campaigns |
| message_job_id | uuid | no | FK message_jobs |
| product_id | uuid | no | FK products |
| occurred_at | timestamptz | yes | default now |
| session_id | text | no |  |
| user_agent_hash | text | no | avoid raw UA if not needed |
| ip_hash | text | no | avoid raw IP if not needed |
| metadata | jsonb | no | safe metadata |

### Indexes

```text
(organization_id, occurred_at desc)
(organization_id, content_post_id, occurred_at desc)
(organization_id, customer_id, occurred_at desc)
(organization_id, campaign_id, occurred_at desc)
```

### Retention

Raw events default retention: 180 days.  
Aggregation table can be added later if needed.

### Scale Note

Partition-ready by `occurred_at` and/or `organization_id`.

---

# 9. Table Group E — Retention

---

## 9.1 customer_retention_metrics

Purpose: customer-level retention projection

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| customer_id | uuid | yes | FK customers |
| first_purchase_at | timestamptz | no | from orders |
| last_purchase_at | timestamptz | no | from orders |
| order_count | integer | yes | default 0 |
| lifetime_value | numeric | yes | default 0 |
| average_order_value | numeric | yes | default 0 |
| recency_days | integer | no |  |
| frequency_score | integer | no | 1–5 |
| monetary_score | integer | no | 1–5 |
| rfm_score | text | no | e.g. 555 |
| retention_segment | text | no | constrained |
| last_engagement_at | timestamptz | no | from events |
| engagement_score | integer | no | 0–100 optional |
| churn_risk_score | integer | no | 0–100 optional |
| calculated_at | timestamptz | yes | default now |
| calculation_version | text | no | version of rule |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, customer_id)
frequency_score between 1 and 5
monetary_score between 1 and 5
engagement_score between 0 and 100
churn_risk_score between 0 and 100
```

### Indexes

```text
(organization_id, retention_segment)
(organization_id, last_purchase_at)
(organization_id, lifetime_value desc)
(organization_id, rfm_score)
```

### Rule

Projection can be rebuilt from order/event sources.

---

# 10. Table Group F — Audience

---

## 10.1 audience_segments

Purpose: named reusable segment definition

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| name | text | yes |  |
| description | text | no |  |
| segment_type | text | yes | STATIC/DYNAMIC_RULE/SNAPSHOT |
| status | text | yes | ACTIVE/ARCHIVED draft if needed |
| created_by_user_id | uuid | yes | FK users/profiles |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |
| archived_at | timestamptz | no |  |

### Indexes

```text
(organization_id, status)
(organization_id, segment_type)
```

---

## 10.2 audience_segment_rules

Purpose: store dynamic segment criteria

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| audience_segment_id | uuid | yes | FK audience_segments |
| rule_json | jsonb | yes | validated rule DSL |
| rule_version | text | yes | e.g. v1 |
| criteria_hash | text | yes | for audit/snapshot |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(audience_segment_id)
```

### Notes

Rule JSON must be validated by application layer.  
Do not execute arbitrary SQL from this JSON.

---

## 10.3 audience_static_members

Purpose: members for STATIC segment

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| audience_segment_id | uuid | yes | FK audience_segments |
| customer_id | uuid | yes | FK customers |
| added_by_user_id | uuid | no | FK users/profiles |
| added_at | timestamptz | yes | default now |
| removed_at | timestamptz | no | soft remove |

### Constraints

```text
unique(organization_id, audience_segment_id, customer_id)
```

### Indexes

```text
(organization_id, customer_id)
(audience_segment_id, removed_at)
```

---

## 10.4 audience_snapshots

Purpose: frozen audience evaluation used by campaign/content visibility

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| audience_segment_id | uuid | no | FK audience_segments |
| name | text | no | optional |
| source_type | text | yes | SEGMENT/RULE/MANUAL |
| criteria_hash | text | no |  |
| criteria_json | jsonb | no | snapshot of criteria |
| member_count | integer | yes | default 0 |
| created_by_user_id | uuid | yes | FK users/profiles |
| created_at | timestamptz | yes | default now |

### Indexes

```text
(organization_id, created_at desc)
(organization_id, audience_segment_id)
```

---

## 10.5 audience_snapshot_members

Purpose: members in frozen snapshot

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| audience_snapshot_id | uuid | yes | FK audience_snapshots |
| customer_id | uuid | yes | FK customers |
| eligibility_reason | jsonb | no | optional summary |
| created_at | timestamptz | yes | default now |

### Constraints

```text
unique(organization_id, audience_snapshot_id, customer_id)
```

### Indexes

```text
(audience_snapshot_id)
(organization_id, customer_id)
```

---

# 11. Table Group G — Campaign

---

## 11.1 marketing_campaigns

Purpose: campaign definition

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| name | text | yes |  |
| description | text | no |  |
| status | text | yes | campaign_status |
| purpose | text | yes | consent_purpose excluding ORDER_UPDATE for marketing |
| primary_channel | text | no | LINE/SMS/EMAIL |
| content_post_id | uuid | no | FK content_posts |
| audience_segment_id | uuid | no | FK audience_segments |
| audience_snapshot_id | uuid | no | FK audience_snapshots |
| scheduled_at | timestamptz | no |  |
| started_at | timestamptz | no |  |
| completed_at | timestamptz | no |  |
| cancelled_at | timestamptz | no |  |
| failed_at | timestamptz | no |  |
| created_by_user_id | uuid | yes | FK users/profiles |
| approved_by_user_id | uuid | no | future |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
status in campaign_status
purpose in consent_purpose
if status in PREPARING/RUNNING/COMPLETED then audience_snapshot_id is not null
```

### Indexes

```text
(organization_id, status, scheduled_at)
(organization_id, created_at desc)
(organization_id, audience_snapshot_id)
```

---

## 11.2 campaign_runs

Purpose: actual execution attempt of campaign

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| marketing_campaign_id | uuid | yes | FK marketing_campaigns |
| audience_snapshot_id | uuid | yes | FK audience_snapshots |
| status | text | yes | PREPARING/RUNNING/COMPLETED/CANCELLED/FAILED |
| run_no | integer | yes | 1..n |
| total_recipients | integer | yes | default 0 |
| eligible_recipients | integer | yes | default 0 |
| suppressed_count | integer | yes | default 0 |
| no_consent_count | integer | yes | default 0 |
| sent_count | integer | yes | default 0 |
| failed_count | integer | yes | default 0 |
| started_at | timestamptz | no |  |
| completed_at | timestamptz | no |  |
| created_at | timestamptz | yes | default now |
| metadata | jsonb | no | safe summary |

### Constraints

```text
unique(marketing_campaign_id, run_no)
```

### Indexes

```text
(organization_id, marketing_campaign_id)
(organization_id, status, created_at desc)
```

---

# 12. Table Group H — Messaging

---

## 12.1 message_jobs

Purpose: one outbound message job per recipient/channel/content

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| campaign_run_id | uuid | no | FK campaign_runs |
| marketing_campaign_id | uuid | no | FK marketing_campaigns |
| customer_id | uuid | yes | FK customers |
| channel | text | yes | LINE/SMS/EMAIL |
| purpose | text | yes | consent purpose |
| destination | text | no | phone/email/line id or reference |
| status | text | yes | message_job_status |
| idempotency_key | text | yes | unique per send intent |
| content_post_id | uuid | no | FK content_posts |
| template_key | text | no | optional |
| payload | jsonb | no | sanitized payload |
| scheduled_at | timestamptz | no |  |
| queued_at | timestamptz | no |  |
| sent_at | timestamptz | no |  |
| delivered_at | timestamptz | no |  |
| failed_at | timestamptz | no |  |
| cancelled_at | timestamptz | no |  |
| failure_code | text | no | canonical |
| failure_reason | text | no | safe summary |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, idempotency_key)
status in message_job_status
channel in campaign_channel
```

### Indexes

```text
(organization_id, status, scheduled_at)
(organization_id, customer_id, created_at desc)
(organization_id, marketing_campaign_id)
(campaign_run_id)
```

### Rule

Before sending worker transitions to SENDING, it must check:

```text
current consent
active suppression
tenant quota
provider readiness
```

---

## 12.2 message_delivery_attempts

Purpose: append-only provider attempts

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| message_job_id | uuid | yes | FK message_jobs |
| provider | text | yes | LINE/SMS provider/EMAIL provider |
| attempt_no | integer | yes | 1..n |
| status | text | yes | SENT/FAILED/etc |
| provider_message_id | text | no |  |
| provider_error_code | text | no |  |
| provider_error_message | text | no | safe summary only |
| attempted_at | timestamptz | yes | default now |
| response_metadata | jsonb | no | sanitized |

### Constraints

```text
unique(message_job_id, attempt_no)
```

### Indexes

```text
(organization_id, message_job_id)
(organization_id, provider, attempted_at desc)
```

---

# 13. Table Group I — Attribution

---

## 13.1 attribution_events

Purpose: connect content/campaign/message/customer/order/revenue

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid/bigint | yes | PK |
| organization_id | uuid | yes | tenant |
| event_type | text | yes | attribution_event_type |
| customer_id | uuid | no | FK customers |
| anonymous_id | text | no | if anonymous |
| content_post_id | uuid | no | FK content_posts |
| marketing_campaign_id | uuid | no | FK marketing_campaigns |
| campaign_run_id | uuid | no | FK campaign_runs |
| message_job_id | uuid | no | FK message_jobs |
| order_id | uuid | no | FK orders |
| attributed_revenue | numeric | no | from order/payment source |
| attribution_model | text | no | e.g. LAST_CLICK_7D |
| occurred_at | timestamptz | yes | default now |
| metadata | jsonb | no | safe metadata |

### Indexes

```text
(organization_id, occurred_at desc)
(organization_id, customer_id, occurred_at desc)
(organization_id, marketing_campaign_id, occurred_at desc)
(organization_id, order_id)
```

### Rule

Attribution cannot mutate order totals.

---

# 14. Table Group J — Live Reminder

V1 can use existing content/campaign/message tables rather than dedicated table if simple.  
However, explicit reminder request history is useful.

---

## 14.1 live_reminder_requests

Purpose: record customer requests to be reminded before a live event

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| customer_id | uuid | yes | FK customers |
| content_post_id | uuid | yes | FK content_posts |
| live_link_id | uuid | no | FK content_live_links |
| channel | text | yes | LINE/SMS/EMAIL |
| reminder_offset_minutes | integer | yes | e.g. 1440, 60, 10 |
| status | text | yes | REQUESTED/CANCELLED/SCHEDULED/SENT/FAILED |
| requested_at | timestamptz | yes | default now |
| scheduled_message_job_id | uuid | no | FK message_jobs |
| cancelled_at | timestamptz | no |  |
| created_at | timestamptz | yes | default now |
| updated_at | timestamptz | yes | auto |

### Constraints

```text
unique(organization_id, customer_id, content_post_id, channel, reminder_offset_minutes)
```

### Indexes

```text
(organization_id, content_post_id)
(organization_id, customer_id)
(organization_id, status)
```

---

# 15. Usage Meter Integration

If existing `subscription_usage` supports arbitrary usage types, reuse it.

If not, add an append-only usage event table.

---

## 15.1 usage_meter_events optional

Purpose: append-only usage records for Track B if current SaaS usage table is insufficient

### Columns

| Column | Type | Required | Notes |
|---|---|---:|---|
| id | uuid | yes | PK |
| organization_id | uuid | yes | tenant |
| usage_type | text | yes | constrained |
| quantity | numeric | yes |  |
| unit | text | yes | message/byte/event/etc |
| source_module | text | yes | CONTENT/MEDIA/CAMPAIGN/etc |
| source_id | uuid | no | related id |
| occurred_at | timestamptz | yes | default now |
| billing_period | text | no | YYYY-MM |
| metadata | jsonb | no | safe |

### Rule

Only create this table if existing SaaS usage schema cannot support required usage granularity.

---

# 16. Suggested Migration Sequence

Final numbering must check repository state first.

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
045_usage_meter_extension.sql optional
046_content_retention_rls.sql
047_content_retention_permissions_seed.sql
048_content_retention_indexes_review.sql optional
```

Do not generate SQL until this ER is accepted in repository.

---

# 17. RLS Policy Direction

Every tenant-owned table must enforce:

```text
row.organization_id in current user's allowed organization set
```

Recommended RLS groups:

```text
merchant_staff_read
merchant_staff_write
merchant_admin_manage
customer_self_read
customer_self_write_limited
public_published_content_read
service_worker_controlled
```

## Public Read Exception

Only for:

```text
content_posts where status = PUBLISHED and visibility = PUBLIC and deleted_at is null
content_media linked to public published content where allowed
```

Public read must not expose:

```text
customer data
audience membership
consent data
campaign internal data
message jobs
delivery attempts
retention metrics
```

---

# 18. Permission Impact

Add or map permissions:

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

Permission seed migration must not grant dangerous permissions broadly by default.

---

# 19. Index Review Checklist

Before production, review high-risk queries:

```text
merchant public content page
customer feed query
content search/list admin
scheduled publish worker
audience preview
audience snapshot creation
campaign job enqueue
message job worker poll
content event ingestion
retention metrics refresh
attribution lookup
```

---

# 20. High-Volume Tables

High-volume candidates:

```text
content_events
message_delivery_attempts
attribution_events
usage_meter_events
audience_snapshot_members
message_jobs
```

These need scale review before 1,000+ merchants.

---

# 21. Data Retention Direction

| Data | V1 Retention |
|---|---|
| content_posts | retained unless archived/deleted |
| content_media | retained while linked; orphan cleanup after 24h candidate |
| customer_consents | current retained |
| customer_consent_events | append history retained |
| customer_suppressions | retained while active/history |
| content_events raw | 180 days default |
| aggregated content metrics | longer |
| message_jobs | retained for audit/reporting |
| delivery_attempts | retained for audit/debug |
| attribution_events | retained for reporting |
| retention_metrics | current projection; rebuildable |
| audience_snapshots | retained for campaign audit |

---

# 22. ER Validation Gates

ER V2 is ready for migration planning when:

```text
Business Rules V1 exists
Core table names verified
organization_id applied
FK dependencies reviewed
RLS direction reviewed
Indexes drafted
High-volume tables identified
Consent dispatch model preserved
Audience snapshot model preserved
No duplicate source of truth
```

Status of this document:

```text
FROZEN FOR MIGRATION PLANNING
```

But migration SQL still requires:

```text
Repository migration directory check
Core schema exact table name verification
Existing enum/type convention check
Existing RLS helper function check
Existing permission seed model check
```

---

# 23. AI Coding Constraints

AI Coding Agent must not:

```text
Generate migration before checking latest migration number
Create duplicate customers/products/orders
Bypass consent dispatch check
Fan-out feed rows for every customer/post
Call LINE/SMS/Email provider directly from Campaign
Store binary media in PostgreSQL
Expose private tenant data publicly
```

If exact Core FK table name is unclear:

```text
STATUS: BLOCKED
```

Do not guess.

---

# 24. Implementation Status Update Required

After adding this file to repository, update:

```text
docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
```

Expected changes:

```text
ENG-ER-001 to ENG-ER-009:
FROZEN FOR MIGRATION PLANNING or APPROVED

ENG-ER-010 RLS review:
READY

ENG-ER-011 Index review:
READY

ENG-DB-035+:
READY FOR MIGRATION DRAFT after core schema verification
```

---

# 25. Final ER Position

```text
Business Rules:
FROZEN FOR ER V2 / MIGRATION PLANNING

ER V2:
FROZEN FOR MIGRATION PLANNING

Next:
Migration 035+ draft planning

Still required before SQL:
- verify exact existing Core table names
- verify existing RLS helper conventions
- verify current migration latest number
- verify permission seed pattern
```

---

**END — ER_DIAGRAM_V2_CONTENT_RETENTION**

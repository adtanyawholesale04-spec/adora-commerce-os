# DATABASE_SCHEMA_TECHNICAL_REVIEW_V1.md

Project: Conversational Commerce Platform  
Database: PostgreSQL / Supabase  
Review Scope: DATABASE_SCHEMA_V1.md  
Status: TECHNICAL REVIEW COMPLETE

---

# 1. Review Summary

ผลการตรวจ:

```text
Relational model        PASS
Domain boundaries       PASS
Ledger strategy         PASS
Promotion model         PASS
Commerce flow           PASS
RLS concept             PASS WITH CHANGE
Enum strategy           CHANGE RECOMMENDED
Membership model        CHANGE REQUIRED
Polymorphic references  CHANGE RECOMMENDED
Append-only enforcement CHANGE REQUIRED
Migration ordering      DEFINED
```

ก่อนสร้าง Migration SQL ควรแก้ 5 เรื่องหลัก:

1. เปลี่ยน `profiles.organization_id` เป็น membership model
2. ลดการใช้ PostgreSQL ENUM กับ status ที่อาจเปลี่ยน
3. กำหนด polymorphic references ให้ชัดเจน
4. เพิ่ม DB enforcement สำหรับ append-only ledger
5. เพิ่ม helper functions สำหรับ RLS / updated_at / organization context

---

# 2. Multi-Organization Membership Model

## Problem

Schema ปัจจุบัน:

```text
profiles
- organization_id
- auth_user_id
```

ทำให้ User หนึ่งคนอยู่ได้ Organization เดียว

แต่ SaaS Multi-tenant ที่ดีควรรองรับ:

```text
User
  ├─ Organization A
  ├─ Organization B
  └─ Organization C
```

ตัวอย่าง:
เจ้าของร้านมีหลายแบรนด์
Accountant ดูหลายร้าน
Agency/Admin ดูหลาย tenant

## Decision

เปลี่ยนเป็น:

```text
profiles
organization_memberships
```

### profiles

```text
id
auth_user_id
display_name
status
created_at
updated_at
```

ไม่มี `organization_id`

### organization_memberships

```text
id
organization_id
profile_id
status
is_default
joined_at
created_at
```

Constraint:

```sql
unique (organization_id, profile_id)
```

Partial unique:

```sql
unique index one_default_org_per_profile
on organization_memberships(profile_id)
where is_default = true
and status = 'ACTIVE';
```

### role assignment

เดิม:

```text
profile_roles
profile_id
role_id
```

ควรเปลี่ยนเป็น:

```text
membership_roles
membership_id
role_id
```

เหตุผล:
Role ต้องผูกกับสิทธิ์ใน Organization นั้น

---

# 3. RLS Organization Context

## Decision

ไม่ควรใช้ `profiles.organization_id`

Recommended helpers:

```sql
is_org_member(org_id uuid)
```

และ:

```sql
has_org_permission(org_id uuid, permission_code text)
```

หลักการ:

```text
auth.uid()
  ↓
profiles.auth_user_id
  ↓
organization_memberships
  ↓
organization_id
```

RLS example:

```sql
using (
  is_org_member(organization_id)
)
```

สำหรับ sensitive action:
ใช้ function หรือ RPC ที่ตรวจ permission เพิ่ม

---

# 4. ENUM Strategy

## Problem

Status จำนวนมากในระบบมีโอกาส evolve:

```text
order_status
fulfillment_status
promotion status
return status
notification status
integration status
```

PostgreSQL ENUM แก้ไข/rollback migration ยากกว่า varchar + check

## Decision

### Use varchar + CHECK for most business statuses

ตัวอย่าง:

```sql
status varchar(30) not null
check (status in (...))
```

### Use ENUM only for truly stable system primitives

Optional examples:
- message direction
- actor type

แต่เพื่อ consistency ใน v1:
แนะนำใช้ `varchar + check` ทั้งระบบ

เหตุผล:
- migration ง่าย
- evolve ง่าย
- Supabase/Postgres tooling ง่าย
- ลด enum dependency ordering

---

# 5. FK Dependency Review

## Circular-risk relationships

### Order ↔ Payment / Refund / Return

ต้องสร้างตามลำดับ:

```text
orders
↓
order_items
↓
payments
↓
payment_transactions
↓
returns
↓
refunds
```

`refunds.return_id` สามารถเพิ่ม FK หลังสร้าง returns ด้วย ALTER TABLE

### Integration Event → Messages

messages.raw_event_id references integration_events

ดังนั้น:
สร้าง integration_events ก่อน messages
หรือเพิ่ม FK ภายหลัง

Recommended:
สร้าง integration foundation ก่อน conversation tables

### Shipment → COD Settlement

cod_settlement_items references shipments

สร้าง shipments ก่อน cod settlement items

### Promotion Applied Benefits

ต้องสร้าง:
orders/order_items
promotion definitions
ก่อน promotion_applied_benefits

---

# 6. Polymorphic References

Schema มี pattern:

```text
reference_type
reference_id
```

เช่น:
- inventory_movements
- audit_logs
- notifications
- external_references
- purchase_session_events

## Problem

PostgreSQL ไม่สามารถ FK `reference_id` ไปหลายตารางได้โดยตรง

## Decision

ใช้ polymorphic references เฉพาะ audit/event/integration contexts

เหมาะกับ:
- audit_logs
- notification references
- integration mappings
- generic event logs

ไม่ควรใช้กับ core financial/inventory relationship ถ้ามี FK จริงได้

ตัวอย่าง:

Inventory Movement:
ถ้า reference_type=ORDER
ยังคง generic ได้เพื่อ ledger flexibility

แต่ critical traceability ควรมี typed nullable FKs หาก query บ่อย:

```text
order_id
return_id
fulfillment_id
adjustment_id
```

Recommendation v1:
คง `reference_type/reference_id`
แต่เพิ่ม explicit FK เฉพาะ relationship ที่ critical ใน implementation phase

---

# 7. Append-Only Enforcement

ต้อง enforce ที่ DB ไม่ใช่แค่ application

Tables:

```text
inventory_movements
customer_credit_transactions
loyalty_transactions
audit_logs
tracking_events
```

## Recommended trigger

สร้าง reusable trigger function:

```sql
prevent_update_delete()
```

แล้ว:

```sql
before update or delete
on inventory_movements
for each row
execute function prevent_update_delete();
```

เหมือนกันกับ:
- customer_credit_transactions
- loyalty_transactions
- audit_logs

Tracking events:
อาจอนุญาต delete โดย retention job ภายหลัง
ดังนั้น v1 ไม่ต้อง strict เท่า financial ledger

---

# 8. updated_at Trigger

หลาย table มี:

```text
updated_at
```

ควรมี function กลาง:

```sql
set_updated_at()
```

Trigger:

```sql
before update
on <table>
for each row
execute function set_updated_at();
```

ใช้กับ:
- organizations
- profiles
- products
- variants
- customers
- conversations
- carts
- orders
- campaigns
- fulfillments
- shipments
- notifications
etc.

---

# 9. Human-readable Code Generation

Fields เช่น:

```text
order_number
session_number
fulfillment_number
return_number
shipment_number
consolidation_number
refund_number
```

ไม่ควร generate ด้วย:

```text
select max(number) + 1
```

เพราะ race condition

## Recommended

ใช้ organization-scoped sequence table:

```text
document_sequences
```

Fields:

```text
organization_id
document_type
prefix
current_value
reset_policy
updated_at
```

และ PostgreSQL function:

```text
next_document_number(...)
```

ต้อง lock row `FOR UPDATE`

ตัวอย่าง:

```text
ORD-202607-000123
```

---

# 10. Sale Code Uniqueness

`active_from/active_until` ทำให้ "active uniqueness" ซับซ้อน

Postgres partial unique index ไม่สามารถตรวจ time overlap ด้วย `now()` ได้อย่างปลอดภัย

## Recommended

สำหรับ v1:

### Live Session
ใช้:

```sql
unique (organization_id, live_session_id, sale_code)
```

เพราะ Live Session เป็น finite context

### Channel
ใช้ unique เฉพาะ ACTIVE record
แต่ application ต้อง deactivate old record ก่อนสร้างใหม่

### Global
ใช้:

```sql
unique (organization_id, sale_code)
where context_type='GLOBAL'
and status='ACTIVE'
```

ไม่ใช้ time-window overlap constraint ใน v1

---

# 11. Product Variant Option Integrity

Current junction:

```text
product_variant_option_values
variant_id
option_value_id
```

ต้องป้องกัน Variant มี:
- Color=Black
- Color=White

พร้อมกัน

## Recommended

เพิ่ม `option_id` ลง junction:

```text
product_variant_option_values
- variant_id
- option_id
- option_value_id
```

Constraint:

```sql
unique (variant_id, option_id)
```

และ FK composite/value validation ผ่าน trigger/service หรือ normalized key

นี่ง่ายกว่าพึ่ง application อย่างเดียว

---

# 12. Inventory Balance Strategy

Decision validated:

```text
Ledger = Source of Truth
Projection = Fast read
```

แต่ต้อง transactionally update projection

## Recommended DB function boundary

ใช้ PostgreSQL function/RPC สำหรับ:

```text
reserve_inventory()
release_reservation()
convert_reservation_to_allocation()
post_inventory_movement()
```

ไม่ให้ frontend insert ledger/projection แยกเอง

---

# 13. Credit Balance Strategy

เช่นเดียวกัน:

```text
customer_credit_transactions = truth
customer_credit_lots = lot state
customer_credit_accounts.available_balance = projection
```

Use RPC:

```text
apply_store_credit()
issue_store_credit()
reverse_store_credit()
```

เพื่อ lock account + lots

---

# 14. Loyalty Balance Strategy

Use RPC:

```text
earn_loyalty_points()
redeem_loyalty_points()
reverse_loyalty_points()
```

Update ledger + account projection ใน transaction เดียว

---

# 15. Monetary Precision Review

Current:

```text
numeric(14,2)
```

PASS สำหรับ THB retail

Quantity:

```text
numeric(14,3)
```

PASS

Loyalty points:
`numeric(14,3)` is flexible

Percent:
ใช้:

```text
numeric(7,4)
```

และเก็บเป็น percent units เช่น:
`10.0000 = 10%`

ต้อง document ไม่ให้บาง serviceใช้ 0.10 และบาง serviceใช้ 10

---

# 16. Cost Price Security

`product_variants.cost_price`

ควร:
- select restricted by permission
- not exposed in public/client APIs
- audit update

Sensitive permissions:

```text
product.cost.view
product.cost.edit
```

Promotion simulator อาจใช้ margin warning ผ่าน secure server-side function

---

# 17. Promotion Versioning Review

PASS

Required change:
ทุก definition child table ต้อง reference:

```text
campaign_version_id
```

ไม่ควรพึ่ง campaign_id เพียงอย่างเดียว

`promotion_actions.rule_id`
ต้อง verify rule belongs same campaign_version

enforce via application/service หรือ composite FK if normalized further

---

# 18. Promotion Condition Genericity

`reference_type/reference_id` remains acceptable

แต่ common types เช่น:
- category
- product tag
- customer tier

จะ query จำนวนมาก

Recommended indexes:

```text
(condition_type, reference_id)
```

พร้อม organization/version prefix

---

# 19. Payment Aggregate Review

Current:

```text
payments one per order
payment_transactions many
```

PASS

But `orders.amount_paid` and `payments.amount_received` are duplicate projections

Decision:
เก็บได้เพื่อ performance
แต่ต้อง update transactionally

Authoritative:
successful `payment_transactions`

Projection:
- payments.amount_received
- orders.amount_paid
- orders.amount_due
- orders.payment_status

---

# 20. Refund/Credit Interaction

Refund to Store Credit:

```text
refund
↓
refund_transaction or resolution
↓
credit lot
↓
credit transaction
```

ต้องมี trace

Recommended:
`customer_credit_transactions.source_type = REFUND`
`source_id = refunds.id`

---

# 21. Notification Model Review

PASS

Recommended split:

```text
notifications
= business task/event

notification_recipients
= inbox/read state

notification_delivery_attempts
= transport state
```

Google Calendar Sync:
future adapter only

---

# 22. Integration Event Ordering

Recommended foundation tables should be created early:

```text
organizations
profiles
memberships
channel_accounts
integration_events
```

Then messages/live events can FK raw event

Webhook ingestion:
service-role only
not direct authenticated client insert

---

# 23. Storage References

Fields currently using:

```text
label_url
profile_image_url
storage_path
```

Recommendation:
Store Supabase Storage object path/key, not signed URL

Example:

```text
shipping-labels/org-id/shipment-id/label.pdf
```

Signed URLs should be generated dynamically

Change suggested:
`label_storage_path`
not `label_url`

Similar:
`profile_image_storage_path` if internally hosted

---

# 24. Deletion & Retention

Financial/business ledger:
never normal hard-delete

Potential retention tables:
- raw integration events
- message media
- notification delivery attempts
- tracking raw payload

Need configurable retention later

Not blocker for migration v1

---

# 25. Migration Ordering

Recommended SQL migration modules:

```text
001_extensions_helpers.sql

002_organizations_auth.sql
003_roles_permissions.sql

004_integration_foundation.sql

005_product_catalog.sql
006_product_options_tags.sql
007_sale_codes.sql

008_inventory.sql

009_customers.sql
010_conversations_live.sql

011_carts.sql
012_purchase_sessions.sql

013_orders.sql
014_order_adjustments_holds.sql
015_order_consolidations.sql

016_promotion_core.sql
017_promotion_bundles_rewards.sql
018_coupons.sql

019_payments.sql
020_credit.sql
021_loyalty.sql

022_fulfillment_shipping.sql
023_returns.sql

024_notifications.sql
025_audit.sql

026_functions_transactions.sql
027_append_only_triggers.sql
028_updated_at_triggers.sql

029_rls_helpers.sql
030_rls_policies.sql

031_indexes.sql
032_seed_permissions.sql
```

---

# 26. SQL Extension Requirements

Enable:

```sql
pgcrypto
```

for `gen_random_uuid()`

Potential future:
- pg_trgm for fuzzy search
- unaccent for search
- citext if email normalization requires it

Recommendation v1:
enable:
- pgcrypto
- pg_trgm
- unaccent

---

# 27. Search Strategy

Product/customer search should not rely only on tsvector

Thai tokenization in PostgreSQL `simple` text search is limited

Recommended:
- exact/prefix indexes for codes
- pg_trgm for names
- normalized phone
- external search later if needed

Indexes:

```sql
gin (name gin_trgm_ops)
```

instead of relying solely on `to_tsvector('simple', name)`

---

# 28. Phone / Email Normalization

Add optional normalized columns:

Customers:

```text
phone_normalized
email_normalized
```

Customer identities may store raw provider info

Application normalizes:
Thailand example:
`0812345678` → canonical format policy

Do not use these as automatic merge uniqueness by default

---

# 29. Organization-Owned FK Consistency

Risk:
row references another tenant's entity

Example:
Order organization A references customer organization B

Normal FK alone doesn't prevent this

## Recommended strategy

For critical tables use composite uniqueness:

Parent:

```sql
unique (organization_id, id)
```

Child FK:

```sql
foreign key (organization_id, customer_id)
references customers (organization_id, id)
```

Apply progressively to critical relationships:

- product → category
- variant → product
- cart → customer
- order → customer
- order_item → order
- inventory → warehouse/variant
- payment → order

This strengthens tenant integrity in DB

Recommendation:
use composite tenant-aware FKs for core business tables

---

# 30. Technical Decisions to Apply Before Migration

## REQUIRED

### TR-001
Introduce `organization_memberships`

### TR-002
Replace `profile_roles` with `membership_roles`

### TR-003
Use varchar + CHECK rather than PostgreSQL ENUM in v1

### TR-004
Add append-only triggers for financial/inventory ledgers

### TR-005
Add `set_updated_at()` trigger function

### TR-006
Add `document_sequences` + atomic number generator

### TR-007
Improve variant option junction with option_id

### TR-008
Use Supabase Storage paths rather than persistent signed URLs

### TR-009
Use tenant-aware composite FK for critical tables

### TR-010
Use pg_trgm for Thai-friendly name search support

---

# 31. Technical Review Status

```text
DATABASE_SCHEMA_TECHNICAL_REVIEW_V1
===================================

RELATIONAL DESIGN       PASS
MULTI-TENANCY           PASS WITH REQUIRED CHANGE
LEDGER DESIGN           PASS
PROMOTION DESIGN        PASS
FINANCIAL DESIGN        PASS
INVENTORY DESIGN        PASS
RLS DESIGN              PASS WITH REQUIRED CHANGE
MIGRATION ORDER         DEFINED

STATUS:
APPROVED WITH REQUIRED TECHNICAL CHANGES
```

Next step:

1. Apply TR-001 → TR-010 to `DATABASE_SCHEMA_V1`
2. Create `DATABASE_SCHEMA_V1_FROZEN.md`
3. Generate modular Supabase migrations

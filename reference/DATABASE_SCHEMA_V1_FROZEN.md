# DATABASE_SCHEMA_V1.md

Project: Conversational Commerce Platform  
Database: PostgreSQL / Supabase  
Version: v1 Draft  
Status: IN PROGRESS  
Source: ER Diagram v1.1 Frozen V2 + Business Rules BR-001 → BR-123

---

# 0. Database Conventions

## 0.1 Primary Keys

ใช้ UUID สำหรับ Primary Key ของทุก business entity

```sql
id uuid primary key default gen_random_uuid()
```

เหตุผล:
- เหมาะกับ multi-tenant
- ปลอดภัยกว่าการ expose running integer
- รองรับ distributed creation / integrations
- ใช้กับ Supabase ได้ตรง

---

## 0.2 Multi-Tenant Rule

Business-owned tables ต้องมี:

```sql
organization_id uuid not null
```

และ FK:

```sql
references organizations(id)
```

RLS จะใช้ `organization_id` เป็น tenant boundary หลัก

---

## 0.3 Timestamp Standard

ใช้:

```sql
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Field วันที่ธุรกิจ เช่น `paid_at`, `confirmed_at`, `shipped_at` ใช้ `timestamptz`

---

## 0.4 Money Standard

ใช้:

```sql
numeric(14,2)
```

ห้ามใช้ `float` / `double precision` สำหรับเงิน

ตัวอย่าง:

```sql
base_price numeric(14,2) not null default 0
```

---

## 0.5 Quantity Standard

สินค้าทั่วไป:

```sql
numeric(14,3)
```

เพื่อรองรับอนาคตสินค้าที่มีหน่วยทศนิยม

สำหรับธุรกิจชิ้น/ตัว สามารถใส่จำนวนเต็มได้ตามปกติ

---

## 0.6 Currency

ใช้:

```sql
currency_code varchar(3) not null default 'THB'
```

รองรับ ISO 4217

---

## 0.7 Soft Delete / Archive

Business entity สำคัญไม่ Hard Delete จาก UI

ใช้:

```sql
status
archived_at timestamptz null
```

Hard delete ใช้เฉพาะ privacy / retention workflow ที่กำหนด

---

## 0.8 Human-readable Codes

UUID = internal identity

Business code = user-facing reference

ตัวอย่าง:

```text
products.id             = UUID
products.product_code   = P000001

product_variants.id     = UUID
product_variants.stock_code = AD-SUM-BLK-M
```

---

# 1. Organization & Security

## 1.1 organizations

Purpose:
Tenant / บริษัท / ร้านค้า

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| name | varchar(200) | NO | ชื่อร้าน/องค์กร |
| slug | varchar(120) | NO | unique slug |
| status | varchar(30) | NO | ACTIVE/SUSPENDED/ARCHIVED |
| timezone | varchar(80) | NO | default Asia/Bangkok |
| currency_code | varchar(3) | NO | default THB |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Constraints:

```sql
unique (slug)
```

Indexes:

```sql
index organizations_status_idx (status)
```

---

## 1.2 profiles

Purpose:
Application profile เชื่อม Supabase Auth

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | FK organizations |
| auth_user_id | uuid | NO | Supabase auth.users.id |
| display_name | varchar(200) | NO | |
| status | varchar(30) | NO | ACTIVE/INACTIVE |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Constraints:

```sql
unique (organization_id, auth_user_id)
```

Indexes:

```sql
index profiles_org_idx (organization_id)
index profiles_auth_user_idx (auth_user_id)
```

---

## 1.3 roles

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(60) | NO |
| name | varchar(120) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 1.4 permissions

System-level permission catalog

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| code | varchar(100) | NO |
| name | varchar(200) | NO |
| description | text | YES |

Constraint:

```sql
unique (code)
```

---

## 1.5 role_permissions

| Column | Type |
|---|---|
| role_id | uuid |
| permission_id | uuid |

PK:

```sql
primary key (role_id, permission_id)
```

---

## 1.6 profile_roles

| Column | Type |
|---|---|
| profile_id | uuid |
| role_id | uuid |

PK:

```sql
primary key (profile_id, role_id)
```

---

# 2. Product Domain

## 2.1 categories

Purpose:
หมวดสินค้าแบบ hierarchy

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| parent_id | uuid | YES | self FK |
| code | varchar(80) | NO | |
| name | varchar(200) | NO | |
| status | varchar(30) | NO | ACTIVE/INACTIVE |
| sort_order | integer | NO | default 0 |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Constraints:

```sql
unique (organization_id, code)
check (parent_id is null or parent_id <> id)
```

Indexes:

```sql
index categories_org_parent_idx (organization_id, parent_id)
index categories_org_status_idx (organization_id, status)
```

---

## 2.2 brands

Purpose:
Brand catalog

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(200) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 2.3 products

Purpose:
Product Parent / สินค้าแม่

ตัวอย่าง:
`เสื้อ ADORA Summer`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| product_code | varchar(100) | NO | รหัสสินค้าแม่ |
| name | varchar(255) | NO | |
| description | text | YES | |
| category_id | uuid | YES | |
| brand_id | uuid | YES | |
| status | varchar(30) | NO | DRAFT/ACTIVE/INACTIVE/ARCHIVED |
| created_by | uuid | YES | profile FK |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |
| archived_at | timestamptz | YES | |

Constraints:

```sql
unique (organization_id, product_code)
```

Indexes:

```sql
index products_org_status_idx (organization_id, status)
index products_org_category_idx (organization_id, category_id)
index products_org_brand_idx (organization_id, brand_id)
index products_name_search_idx on products using gin (to_tsvector('simple', name))
```

Notes:
- `product_code` เป็น Parent-level reference
- ไม่ใช้เป็น Stock identity
- ระบบสามารถ Auto-generate ได้

---

## 2.4 product_variants

Purpose:
หน่วยสินค้าที่ขายและควบคุม Stock จริง

ตัวอย่าง:
`เสื้อ ADORA Summer / Black / M`

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK / authoritative variant identity |
| organization_id | uuid | NO | |
| product_id | uuid | NO | FK products |
| stock_code | varchar(120) | NO | รหัสหลังบ้าน |
| barcode | varchar(100) | YES | |
| variant_name | varchar(255) | NO | display name เช่น Black / M |
| base_price | numeric(14,2) | NO | default selling price |
| cost_price | numeric(14,2) | NO | cost snapshot source |
| minimum_selling_price | numeric(14,2) | YES | optional promotion guard |
| weight_grams | integer | YES | |
| width_cm | numeric(10,2) | YES | |
| length_cm | numeric(10,2) | YES | |
| height_cm | numeric(10,2) | YES | |
| status | varchar(30) | NO | ACTIVE/INACTIVE/ARCHIVED |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |
| archived_at | timestamptz | YES | |

Constraints:

```sql
unique (organization_id, stock_code)

check (base_price >= 0)
check (cost_price >= 0)
check (minimum_selling_price is null or minimum_selling_price >= 0)
check (weight_grams is null or weight_grams >= 0)
```

Recommended barcode rule:

ไม่บังคับ unique ใน v1 เพราะบาง merchant อาจใช้ barcode vendor ซ้ำ/ไม่สะอาด

แต่สามารถเพิ่ม partial unique ต่อ organization ภายหลังหาก business require

Indexes:

```sql
index product_variants_org_product_idx (organization_id, product_id)
index product_variants_org_status_idx (organization_id, status)
index product_variants_stock_code_idx (organization_id, stock_code)
index product_variants_barcode_idx (organization_id, barcode)
```

Important:
- ห้ามมี `stock` column
- ห้ามมี `promotion_price` column
- Promotion ไม่แก้ `base_price`

---

# 3. Product Options / Variant Structure

## 3.1 product_options

ตัวอย่าง:
- Color
- Size

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| product_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(120) | NO |
| sort_order | integer | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (product_id, code)
```

---

## 3.2 product_option_values

ตัวอย่าง:
Color → Black / White
Size → M / L

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| option_id | uuid | NO |
| code | varchar(80) | NO |
| value | varchar(120) | NO |
| sort_order | integer | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (option_id, code)
```

---

## 3.3 product_variant_option_values

เชื่อม Variant กับ Option Value

| Column | Type |
|---|---|
| variant_id | uuid |
| option_value_id | uuid |

PK:

```sql
primary key (variant_id, option_value_id)
```

Business rule:
Variant หนึ่งตัวไม่ควรมีมากกว่า 1 value ต่อ option เดียวกัน

ต้อง enforce ผ่าน validation/service และอาจเพิ่ม DB trigger ใน migration phase

---

# 4. Product Tags & Promotion Classes

## 4.1 product_tags

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(120) | NO |
| status | varchar(30) | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 4.2 product_variant_tag_links

| Column | Type |
|---|---|
| variant_id | uuid |
| tag_id | uuid |

PK:

```sql
primary key (variant_id, tag_id)
```

---

## 4.3 product_promotion_classes

ตัวอย่าง:
- FASHION
- BRAND
- PREMIUM

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(120) | NO |
| description | text | YES |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 4.4 product_variant_promotion_classes

| Column | Type | Null |
|---|---|---:|
| variant_id | uuid | NO |
| promotion_class_id | uuid | NO |
| is_primary | boolean | NO |

PK:

```sql
primary key (variant_id, promotion_class_id)
```

Recommended v1 policy:
Variant มี Primary Promotion Class ได้สูงสุด 1 ตัว

Enforce:
partial unique index:

```sql
unique index one_primary_promotion_class_per_variant
on product_variant_promotion_classes (variant_id)
where is_primary = true;
```

---

# 5. Sale Code / Live Code

## 5.1 sales_code_assignments

Purpose:
Mapping รหัสที่แม่ค้าใช้ขาย เช่น `A01` ไปยัง Variant

Sale Code ไม่ใช่ Stock Code

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| sale_code | varchar(80) | NO | เช่น A01 |
| variant_id | uuid | NO | FK product_variants |
| context_type | varchar(30) | NO | GLOBAL/CHANNEL/LIVE_SESSION/PURCHASE_SESSION |
| channel_account_id | uuid | YES | |
| live_session_id | uuid | YES | |
| purchase_session_id | uuid | YES | |
| active_from | timestamptz | YES | |
| active_until | timestamptz | YES | |
| status | varchar(30) | NO | ACTIVE/INACTIVE/EXPIRED |
| created_by | uuid | YES | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Checks:

```sql
check (length(trim(sale_code)) > 0)

check (
  active_until is null
  or active_from is null
  or active_until > active_from
)
```

Context validation:

```text
GLOBAL
→ context FK ทุกตัว null

CHANNEL
→ channel_account_id required

LIVE_SESSION
→ live_session_id required

PURCHASE_SESSION
→ purchase_session_id required
```

Recommended:
enforceด้วย DB CHECK เมื่อ schema domains พร้อมครบ

### Uniqueness

ไม่ Unique ทั้ง Organization

ต้อง Unique ภายใน Active Sales Context

ตัวอย่างสำหรับ Live:

```sql
unique (organization_id, live_session_id, sale_code)
```

สำหรับ GLOBAL:

```sql
partial unique index
(organization_id, sale_code)
where context_type = 'GLOBAL'
and status = 'ACTIVE'
```

สำหรับ CHANNEL:

```sql
partial unique index
(organization_id, channel_account_id, sale_code)
where context_type = 'CHANNEL'
and status = 'ACTIVE'
```

### Parser resolution priority

```text
1. LIVE_SESSION
2. CHANNEL
3. GLOBAL
4. stock_code fallback (optional)
```

หากพบ ambiguity:
ระบบห้ามเดา

---

# 6. Inventory Domain

## 6.1 warehouses

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(200) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 6.2 inventory_movements

Authoritative Stock Ledger

Append-only

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| warehouse_id | uuid | NO | |
| variant_id | uuid | NO | |
| movement_type | varchar(40) | NO | |
| quantity_delta | numeric(14,3) | NO | signed quantity |
| reference_type | varchar(60) | YES | ORDER/RETURN/ADJUSTMENT/... |
| reference_id | uuid | YES | |
| reversal_of_movement_id | uuid | YES | |
| reason | text | YES | |
| created_by | uuid | YES | |
| created_at | timestamptz | NO | |

movement_type examples:

```text
OPENING_BALANCE
PURCHASE_RECEIPT
SALE_FULFILLMENT
RETURN_RESTOCK
TRANSFER_IN
TRANSFER_OUT
ADJUSTMENT_IN
ADJUSTMENT_OUT
DAMAGE
LOSS
REVERSAL
```

Checks:

```sql
check (quantity_delta <> 0)
```

Indexes:

```sql
index inventory_movements_variant_warehouse_idx
(organization_id, warehouse_id, variant_id, created_at)

index inventory_movements_reference_idx
(organization_id, reference_type, reference_id)
```

Business rule:
ห้าม UPDATE quantity_delta หลัง insert
Correction ใช้ compensating movement

---

## 6.3 inventory_reservations

Temporary stock hold

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| warehouse_id | uuid | NO |
| variant_id | uuid | NO |
| cart_id | uuid | YES |
| order_id | uuid | YES |
| quantity | numeric(14,3) | NO |
| status | varchar(30) | NO |
| reserved_at | timestamptz | NO |
| expires_at | timestamptz | YES |
| released_at | timestamptz | YES |
| created_at | timestamptz | NO |

Statuses:

```text
ACTIVE
CONVERTED
EXPIRED
RELEASED
CANCELLED
```

Checks:

```sql
check (quantity > 0)
```

Indexes:

```sql
index inventory_reservations_active_idx
(organization_id, warehouse_id, variant_id)
where status = 'ACTIVE';

index inventory_reservations_expires_idx
(expires_at)
where status = 'ACTIVE';
```

---

## 6.4 inventory_allocations

Stock assigned to confirmed Order

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| warehouse_id | uuid | NO |
| variant_id | uuid | NO |
| order_id | uuid | NO |
| order_item_id | uuid | NO |
| quantity | numeric(14,3) | NO |
| status | varchar(30) | NO |
| allocated_at | timestamptz | NO |
| released_at | timestamptz | YES |
| created_at | timestamptz | NO |

Statuses:

```text
ACTIVE
FULFILLED
RELEASED
CANCELLED
```

Check:

```sql
check (quantity > 0)
```

Indexes:

```sql
index inventory_allocations_variant_idx
(organization_id, warehouse_id, variant_id)
where status = 'ACTIVE';

index inventory_allocations_order_idx
(organization_id, order_id);
```

Important:
PAID + ON_HOLD Order ยังคง Allocation ACTIVE

---

## 6.5 inventory_balances

Performance Projection

ไม่ใช่ Source of Truth

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| warehouse_id | uuid | NO |
| variant_id | uuid | NO |
| on_hand | numeric(14,3) | NO |
| reserved | numeric(14,3) | NO |
| allocated | numeric(14,3) | NO |
| available | numeric(14,3) | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, warehouse_id, variant_id)
```

Recommended formula:

```text
available = on_hand - reserved - allocated
```

Projection ต้อง rebuild/reconcile จาก authoritative sources ได้

---

# 7. Product Creation Workflow

เมื่อ Admin สร้างสินค้า:

```text
1. Create Product Parent
2. Define Options (ถ้ามี)
3. Generate/Create Variants
4. Assign stock_code
5. Set base_price / cost_price
6. Assign Product Tags
7. Assign Promotion Class
8. Optional Sale Code Assignment
9. Optional Opening Stock
```

Opening Stock:

ห้าม:

```text
UPDATE product_variants SET stock = 100
```

ต้อง:

```text
INSERT inventory_movements
movement_type = OPENING_BALANCE
quantity_delta = 100
```

แล้ว update/rebuild `inventory_balances`

---

# 8. Product Form — Recommended UI Fields

## 8.1 Product Parent

Required:

```text
Product Name *
Product Code *
Category
Status
```

Optional:

```text
Brand
Description
Product Tags
```

---

## 8.2 Variant Options

ตัวอย่าง:

```text
Color
Size
```

Admin กำหนด values:

```text
Color: Black, White
Size: M, L
```

ระบบสามารถ Generate:

```text
Black / M
Black / L
White / M
White / L
```

---

## 8.3 Variant Row

```text
Variant Name
Stock Code *
Barcode
Base Price *
Cost Price
Minimum Selling Price
Promotion Class
Weight
Dimensions
Status
```

---

## 8.4 Sale / Live Code

แยกจาก Variant master form ได้

```text
Sale Code
Context
Channel / Live Session
Active From
Active Until
```

เหตุผล:
Sale Code เป็น Sales Context ไม่ใช่ core identity ของ Variant

---

# 9. Critical Product Constraints Summary

## MUST

```text
products.product_code
unique per organization

product_variants.stock_code
unique per organization

variant_id
authoritative FK

sale_code
NOT globally unique

sale_code
unique within active context

inventory
references variant_id
```

## MUST NOT

```text
products.stock
product_variants.stock

products.promotion_price
product_variants.current_discount

sale_code as inventory identity
```

---

# 10. Schema Roadmap

Completed in this draft:

```text
01 Organization & Security
02 Product
03 Variant Options
04 Product Tags / Promotion Class
05 Sale Code
06 Inventory
```

Next sections:

```text
07 Customer
08 Conversation / Live
09 Cart
10 Purchase Session
11 Order / Hold / Consolidation
12 Promotion
13 Payment
14 Credit
15 Loyalty
16 Fulfillment / Shipping
17 Return / RTO
18 Notification
19 Integration / Audit
20 RLS / Index Strategy
```

---

# 11. Current Status

`DATABASE_SCHEMA_V1.md`

Status:

```text
FOUNDATION COMPLETE
PRODUCT DOMAIN COMPLETE
INVENTORY DOMAIN COMPLETE
REMAINING DOMAINS IN PROGRESS
```

Next recommended schema section:

`Customer + Conversation + Cart`


---

# 12. Customer Domain

## 12.1 customers

Purpose:
Customer Master หนึ่งคนต่อหนึ่งระเบียนหลัก

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | tenant |
| customer_code | varchar(100) | NO | human-readable code |
| first_name | varchar(150) | YES | |
| last_name | varchar(150) | YES | |
| display_name | varchar(200) | YES | canonical display |
| phone | varchar(50) | YES | normalized separately in app |
| email | varchar(320) | YES | |
| status | varchar(30) | NO | ACTIVE/MERGED/BLOCKED/ARCHIVED |
| merged_into_customer_id | uuid | YES | self FK |
| created_by | uuid | YES | profile FK |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |
| archived_at | timestamptz | YES | |

Constraints:

```sql
unique (organization_id, customer_code)

check (
  merged_into_customer_id is null
  or merged_into_customer_id <> id
)
```

Important:
- ไม่ Unique ชื่อ
- ไม่ Unique phone/email โดย default
- ห้าม auto-merge จาก display name/avatar เท่านั้น

Indexes:

```sql
index customers_org_status_idx
(organization_id, status);

index customers_org_phone_idx
(organization_id, phone);

index customers_org_email_idx
(organization_id, email);
```

---

## 12.2 customer_identities

Purpose:
ผูก Customer เดียวกับตัวตนในหลาย Channel

ตัวอย่าง:
- LINE user id
- Facebook PSID
- TikTok customer id

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| customer_id | uuid | NO | FK customers |
| provider | varchar(50) | NO | LINE/FACEBOOK/TIKTOK/... |
| channel_account_id | uuid | YES | provider account |
| external_user_id | varchar(255) | NO | provider user identity |
| display_name | varchar(255) | YES | provider display |
| profile_image_url | text | YES | |
| verification_status | varchar(30) | NO | UNVERIFIED/VERIFIED/MANUAL |
| first_seen_at | timestamptz | NO | |
| last_seen_at | timestamptz | NO | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Recommended uniqueness:

```sql
unique (
  organization_id,
  provider,
  channel_account_id,
  external_user_id
)
```

Indexes:

```sql
index customer_identities_customer_idx
(customer_id);

index customer_identities_lookup_idx
(organization_id, provider, external_user_id);
```

---

## 12.3 customer_addresses

Purpose:
Address Book ของลูกค้า

Order จะ snapshot address แยกอีกชุด

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| customer_id | uuid | NO |
| label | varchar(100) | YES |
| recipient_name | varchar(200) | NO |
| phone | varchar(50) | NO |
| address_line1 | text | NO |
| address_line2 | text | YES |
| subdistrict | varchar(150) | YES |
| district | varchar(150) | YES |
| province | varchar(150) | YES |
| postal_code | varchar(20) | YES |
| country_code | varchar(2) | NO |
| is_default | boolean | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Recommended partial unique:

```sql
unique index one_default_address_per_customer
on customer_addresses (customer_id)
where is_default = true
and status = 'ACTIVE';
```

---

## 12.4 customer_tags

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(120) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 12.5 customer_tag_links

| Column | Type |
|---|---|
| customer_id | uuid |
| tag_id | uuid |
| created_at | timestamptz |

PK:

```sql
primary key (customer_id, tag_id)
```

---

## 12.6 customer_merge_history

Purpose:
เก็บประวัติ merge ลูกค้าแบบไม่ทำลายหลักฐาน

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| source_customer_id | uuid | NO |
| target_customer_id | uuid | NO |
| merged_by | uuid | YES |
| reason | text | YES |
| created_at | timestamptz | NO |

Check:

```sql
check (source_customer_id <> target_customer_id)
```

---

# 13. Conversation & Live Commerce Domain

## 13.1 channel_accounts

Purpose:
บัญชี Channel ที่ร้านเชื่อมต่อ

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| provider | varchar(50) | NO | LINE/FACEBOOK/INSTAGRAM/TIKTOK/... |
| external_account_id | varchar(255) | NO | |
| display_name | varchar(255) | YES | |
| status | varchar(30) | NO | ACTIVE/INACTIVE/ERROR |
| capabilities_json | jsonb | YES | provider capability matrix |
| connected_at | timestamptz | YES | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Constraint:

```sql
unique (
  organization_id,
  provider,
  external_account_id
)
```

---

## 13.2 conversations

Purpose:
Canonical conversation ใน Unified Inbox

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| channel_account_id | uuid | NO |
| customer_id | uuid | YES |
| external_conversation_id | varchar(255) | NO |
| status | varchar(30) | NO |
| assigned_profile_id | uuid | YES |
| assigned_team_id | uuid | YES |
| opened_at | timestamptz | NO |
| last_message_at | timestamptz | YES |
| resolved_at | timestamptz | YES |
| closed_at | timestamptz | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Statuses:

```text
OPEN
PENDING
WAITING_CUSTOMER
RESOLVED
CLOSED
```

Constraint:

```sql
unique (
  organization_id,
  channel_account_id,
  external_conversation_id
)
```

Indexes:

```sql
index conversations_org_status_idx
(organization_id, status, last_message_at desc);

index conversations_assignee_idx
(organization_id, assigned_profile_id, status);
```

---

## 13.3 messages

Purpose:
Canonical message storage

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| conversation_id | uuid | NO | |
| external_message_id | varchar(255) | YES | provider id |
| direction | varchar(20) | NO | INBOUND/OUTBOUND |
| sender_type | varchar(30) | NO | CUSTOMER/STAFF/SYSTEM |
| message_type | varchar(40) | NO | TEXT/IMAGE/VIDEO/AUDIO/FILE/STICKER/EVENT |
| content_text | text | YES | |
| raw_event_id | uuid | YES | integration event FK |
| sent_at | timestamptz | YES | |
| received_at | timestamptz | YES | |
| unsent_at | timestamptz | YES | provider unsend |
| deleted_at | timestamptz | YES | retention/privacy |
| created_at | timestamptz | NO | |

Recommended uniqueness:

```sql
unique (
  organization_id,
  conversation_id,
  external_message_id
)
```

โดย `external_message_id is not null`

Indexes:

```sql
index messages_conversation_time_idx
(conversation_id, created_at);

index messages_org_external_idx
(organization_id, external_message_id);
```

---

## 13.4 conversation_assignments

Purpose:
assignment history

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| conversation_id | uuid | NO |
| assigned_profile_id | uuid | YES |
| assigned_team_id | uuid | YES |
| assigned_by | uuid | YES |
| assigned_at | timestamptz | NO |
| unassigned_at | timestamptz | YES |

---

## 13.5 conversation_notes

Internal only

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| conversation_id | uuid | NO |
| profile_id | uuid | NO |
| note | text | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

---

## 13.6 conversation_orders

Many-to-many link

| Column | Type |
|---|---|
| conversation_id | uuid |
| order_id | uuid |
| created_at | timestamptz |

PK:

```sql
primary key (conversation_id, order_id)
```

---

## 13.7 live_sessions

Purpose:
Public Live Commerce session

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| channel_account_id | uuid | NO |
| external_live_id | varchar(255) | YES |
| title | varchar(255) | YES |
| status | varchar(30) | NO |
| payment_due_at | timestamptz | YES |
| started_at | timestamptz | YES |
| ended_at | timestamptz | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Statuses:

```text
DRAFT
SCHEDULED
LIVE
ENDED
CLOSED
CANCELLED
```

Recommended uniqueness:

```sql
unique (
  organization_id,
  channel_account_id,
  external_live_id
)
```

when external_live_id is not null

---

## 13.8 live_events

Purpose:
normalized public/live event stream

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| live_session_id | uuid | NO |
| external_event_id | varchar(255) | YES |
| event_type | varchar(40) | NO |
| external_user_id | varchar(255) | YES |
| customer_identity_id | uuid | YES |
| content_text | text | YES |
| payload_json | jsonb | YES |
| event_at | timestamptz | NO |
| created_at | timestamptz | NO |

event_type examples:

```text
COMMENT
REACTION
JOIN
PURCHASE_SIGNAL
SYSTEM
```

Important:
live_events เป็น stream แยกจาก messages

---

# 14. Cart Domain

## 14.1 carts

Purpose:
Mutable commerce container

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| customer_id | uuid | YES | |
| conversation_id | uuid | YES | |
| live_session_id | uuid | YES | |
| source | varchar(30) | NO | MANUAL/LINE/FACEBOOK/LIVE/WEB/TIKTOK/... |
| status | varchar(30) | NO | |
| currency_code | varchar(3) | NO | |
| payment_due_at | timestamptz | YES | |
| reserved_until | timestamptz | YES | |
| subtotal | numeric(14,2) | NO | projection |
| discount_total | numeric(14,2) | NO | projection |
| shipping_estimate | numeric(14,2) | NO | projection |
| grand_total | numeric(14,2) | NO | projection |
| created_by | uuid | YES | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Statuses:

```text
OPEN
READY
RESERVED
CONVERTED
ABANDONED
EXPIRED
CANCELLED
```

Checks:

```sql
check (subtotal >= 0)
check (discount_total >= 0)
check (shipping_estimate >= 0)
check (grand_total >= 0)
```

Indexes:

```sql
index carts_customer_status_idx
(organization_id, customer_id, status);

index carts_live_status_idx
(organization_id, live_session_id, status);
```

Important:
ไม่มี `live_carts` table แยก

---

## 14.2 cart_items

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| cart_id | uuid | NO | |
| variant_id | uuid | NO | |
| requested_quantity | numeric(14,3) | NO | |
| reserved_quantity | numeric(14,3) | NO | default 0 |
| original_unit_price | numeric(14,2) | NO | |
| calculated_unit_price | numeric(14,2) | NO | |
| line_discount_total | numeric(14,2) | NO | default 0 |
| line_total | numeric(14,2) | NO | projection |
| source_sale_code_assignment_id | uuid | YES | trace CF code |
| pricing_snapshot_json | jsonb | YES | pre-order explanation |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Checks:

```sql
check (requested_quantity > 0)
check (reserved_quantity >= 0)
check (reserved_quantity <= requested_quantity)
check (original_unit_price >= 0)
check (calculated_unit_price >= 0)
check (line_discount_total >= 0)
check (line_total >= 0)
```

Recommended uniqueness v1:

ไม่บังคับ unique `(cart_id, variant_id)`

เหตุผล:
อนาคต Variant เดียวกันอาจมาจาก promotion/reward/context คนละ line

Application อาจ aggregate line เฉพาะกรณีที่ pricing context ตรงกัน

Indexes:

```sql
index cart_items_cart_idx
(cart_id);

index cart_items_variant_idx
(organization_id, variant_id);
```

---

## 14.3 cart_events

Purpose:
audit/order-building timeline ของ Cart

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| cart_id | uuid | NO |
| event_type | varchar(50) | NO |
| actor_type | varchar(30) | NO |
| actor_id | uuid | YES |
| payload_json | jsonb | YES |
| created_at | timestamptz | NO |

Examples:

```text
ITEM_ADDED
ITEM_REMOVED
QUANTITY_CHANGED
PROMOTION_RECALCULATED
RESERVED
RESERVATION_RELEASED
CONVERTED_TO_ORDER
EXPIRED
```

---

# 15. Customer / Conversation / Cart Flow

```text
Provider
   ↓
integration_events
   ↓
messages / live_events
   ↓
customer_identities
   ↓
customers
   ↓
conversations / live_sessions
   ↓
sale_code resolution
   ↓
carts
   ↓
cart_items
   ↓
inventory_reservations
   ↓
Order
```

---

# 16. Key Constraints for These Domains

## Customer

```text
customer identity unique within provider/account
customer master not unique by name
merge history immutable
```

## Conversation

```text
one canonical conversation per provider conversation id
messages retain provider references
current assignee cached on conversations
history retained separately
```

## Live

```text
live event stream separate from normal messages
live cart reuses carts table
sale codes resolve by current sales context
```

## Cart

```text
cart mutable
order immutable commercial record
parser never confirms order directly
parser never reserves stock merely by detecting SKU
```

---

# 17. Updated Schema Roadmap

Completed:

```text
01 Organization & Security
02 Product
03 Variant Options
04 Product Tags / Promotion Class
05 Sale Code
06 Inventory
07 Customer
08 Conversation / Live
09 Cart
```

Next:

```text
10 Purchase Session
11 Order / Address Snapshot / Adjustment
12 Hold / Consolidation
13 Promotion
14 Payment
15 Credit
16 Loyalty
17 Fulfillment / Shipping
18 Return / RTO
19 Notification
20 Integration / Audit
21 RLS / Final Index Review
```

Current status:

```text
DATABASE_SCHEMA_V1
FOUNDATION COMPLETE
PRODUCT COMPLETE
INVENTORY COMPLETE
CUSTOMER COMPLETE
CONVERSATION/LIVE COMPLETE
CART COMPLETE
```


---

# 18. Purchase Session Domain

## 18.1 purchase_sessions

Purpose:
รอบการซื้อสะสมของลูกค้า ใช้ครอบหลาย Cart/Order โดยไม่แทนที่ Order

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | tenant |
| customer_id | uuid | NO | FK customers |
| session_number | varchar(100) | NO | human-readable |
| source_context | varchar(40) | YES | LIVE/CHAT/MANUAL/OMNICHANNEL |
| status | varchar(30) | NO | OPEN/PENDING_CLOSE/CLOSED/CANCELLED |
| opened_at | timestamptz | NO | |
| close_due_at | timestamptz | YES | |
| closed_at | timestamptz | YES | |
| created_by | uuid | YES | profile FK |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Constraints:

```sql
unique (organization_id, session_number)

check (
  closed_at is null
  or closed_at >= opened_at
)
```

Indexes:

```sql
index purchase_sessions_customer_status_idx
(organization_id, customer_id, status);

index purchase_sessions_due_idx
(close_due_at)
where status in ('OPEN', 'PENDING_CLOSE');
```

Important:
- ลูกค้าสามารถมีหลาย Session ได้
- Default ต่อ Live/Context ควรมี active session เดียว
- Paid Orders ภายใน Session ห้าม reprice ย้อนหลัง

---

## 18.2 purchase_session_orders

เชื่อม Order เข้ากับ Session

| Column | Type | Null |
|---|---|---:|
| purchase_session_id | uuid | NO |
| order_id | uuid | NO |
| added_by | uuid | YES |
| added_at | timestamptz | NO |

PK:

```sql
primary key (purchase_session_id, order_id)
```

Recommended unique:

```sql
unique (order_id)
```

ใน v1 ให้ Order อยู่ใน Purchase Session เดียว ณ เวลาเดียวกัน

---

## 18.3 purchase_session_events

Purpose:
timeline ของการเปิด/ปิด/เพิ่ม Order/รวมส่ง

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| purchase_session_id | uuid | NO |
| event_type | varchar(50) | NO |
| reference_type | varchar(50) | YES |
| reference_id | uuid | YES |
| actor_profile_id | uuid | YES |
| payload_json | jsonb | YES |
| created_at | timestamptz | NO |

Examples:

```text
SESSION_OPENED
ORDER_ADDED
ORDER_REMOVED
CLOSE_REQUESTED
SESSION_CLOSED
CONSOLIDATION_CREATED
PAYMENT_DUE
```

---

# 19. Order Domain

## 19.1 orders

Purpose:
Commercial record ที่เกิดจาก Cart/Checkout

Order หลัง Confirm ต้องไม่ถูกแก้ยอดแบบเงียบ ๆ

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| customer_id | uuid | NO | |
| order_number | varchar(100) | NO | human-readable |
| source | varchar(30) | NO | LIVE/LINE/FACEBOOK/MANUAL/WEB/... |
| currency_code | varchar(3) | NO | default THB |
| order_status | varchar(40) | NO | |
| payment_status | varchar(40) | NO | |
| fulfillment_status | varchar(40) | NO | |
| subtotal | numeric(14,2) | NO | item total before discounts |
| item_discount_total | numeric(14,2) | NO | |
| order_discount_total | numeric(14,2) | NO | |
| shipping_charge | numeric(14,2) | NO | |
| shipping_discount_total | numeric(14,2) | NO | |
| tax_total | numeric(14,2) | NO | |
| grand_total | numeric(14,2) | NO | |
| amount_paid | numeric(14,2) | NO | projection |
| amount_due | numeric(14,2) | NO | projection |
| payment_due_at | timestamptz | YES | |
| confirmed_at | timestamptz | YES | |
| cancelled_at | timestamptz | YES | |
| completed_at | timestamptz | YES | |
| created_by | uuid | YES | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Recommended statuses:

`order_status`
```text
DRAFT
PENDING_CONFIRMATION
CONFIRMED
PROCESSING
COMPLETED
CANCELLED
PAYMENT_EXPIRED
```

`payment_status`
```text
UNPAID
PARTIALLY_PAID
PAID
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
COD_PENDING
```

`fulfillment_status`
```text
UNFULFILLED
ON_HOLD
PARTIALLY_FULFILLED
FULFILLED
RETURN_IN_PROGRESS
RETURNED
```

Constraints:

```sql
unique (organization_id, order_number)

check (subtotal >= 0)
check (item_discount_total >= 0)
check (order_discount_total >= 0)
check (shipping_charge >= 0)
check (shipping_discount_total >= 0)
check (tax_total >= 0)
check (grand_total >= 0)
check (amount_paid >= 0)
check (amount_due >= 0)
```

Indexes:

```sql
index orders_customer_created_idx
(organization_id, customer_id, created_at desc);

index orders_order_status_idx
(organization_id, order_status, created_at desc);

index orders_payment_status_idx
(organization_id, payment_status);

index orders_fulfillment_status_idx
(organization_id, fulfillment_status);

index orders_payment_due_idx
(payment_due_at)
where payment_status in ('UNPAID', 'PARTIALLY_PAID', 'COD_PENDING');
```

---

## 19.2 order_items

Historical commercial snapshot

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| order_id | uuid | NO | |
| variant_id | uuid | YES | may remain nullable if product later removed |
| sku_snapshot | varchar(120) | YES | stock_code snapshot |
| sale_code_snapshot | varchar(80) | YES | optional live code used |
| product_name_snapshot | varchar(255) | NO | |
| variant_name_snapshot | varchar(255) | YES | |
| quantity | numeric(14,3) | NO | |
| original_unit_price | numeric(14,2) | NO | |
| applied_unit_price | numeric(14,2) | NO | |
| unit_cost_snapshot | numeric(14,2) | YES | |
| line_discount_total | numeric(14,2) | NO | |
| line_total | numeric(14,2) | NO | |
| is_reward_item | boolean | NO | default false |
| source_cart_item_id | uuid | YES | traceability |
| created_at | timestamptz | NO | |

Checks:

```sql
check (quantity > 0)
check (original_unit_price >= 0)
check (applied_unit_price >= 0)
check (unit_cost_snapshot is null or unit_cost_snapshot >= 0)
check (line_discount_total >= 0)
check (line_total >= 0)
```

Indexes:

```sql
index order_items_order_idx
(order_id);

index order_items_variant_idx
(organization_id, variant_id);
```

Important:
- Order Item price is immutable snapshot
- Product master price changes do not affect historical Order

---

## 19.3 order_addresses

Purpose:
Immutable address snapshot per Order

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| address_type | varchar(30) | NO |
| recipient_name | varchar(200) | NO |
| phone | varchar(50) | NO |
| address_line1 | text | NO |
| address_line2 | text | YES |
| subdistrict | varchar(150) | YES |
| district | varchar(150) | YES |
| province | varchar(150) | YES |
| postal_code | varchar(20) | YES |
| country_code | varchar(2) | NO |
| created_at | timestamptz | NO |

address_type examples:

```text
SHIPPING
BILLING
```

Constraint:

```sql
unique (order_id, address_type)
```

Important:
แก้ Customer Address Book ภายหลัง ต้องไม่เปลี่ยน Order Address Snapshot

---

## 19.4 order_status_history

Purpose:
แยก history ของ 3 status domains

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| status_domain | varchar(30) | NO |
| from_status | varchar(40) | YES |
| to_status | varchar(40) | NO |
| changed_by | uuid | YES |
| reason | text | YES |
| created_at | timestamptz | NO |

status_domain:

```text
ORDER
PAYMENT
FULFILLMENT
```

Index:

```sql
index order_status_history_order_idx
(order_id, created_at);
```

---

# 20. Order Adjustment / Revision

## 20.1 order_adjustments

Purpose:
การแก้ Order หลัง Confirm แบบควบคุม

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| adjustment_number | varchar(100) | NO |
| adjustment_type | varchar(40) | NO |
| status | varchar(30) | NO |
| amount | numeric(14,2) | NO |
| reason | text | NO |
| created_by | uuid | YES |
| approved_by | uuid | YES |
| created_at | timestamptz | NO |
| approved_at | timestamptz | YES |

adjustment_type:

```text
ADD_ITEM
REMOVE_ITEM
PRICE_ADJUSTMENT
SHIPPING_ADJUSTMENT
MANUAL_DISCOUNT
ADDITIONAL_CHARGE
REFUND_ADJUSTMENT
```

status:

```text
DRAFT
PENDING_APPROVAL
APPROVED
APPLIED
REJECTED
CANCELLED
```

Constraints:

```sql
unique (organization_id, adjustment_number)
```

---

## 20.2 order_adjustment_items

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| adjustment_id | uuid | NO |
| order_item_id | uuid | YES |
| variant_id | uuid | YES |
| quantity_delta | numeric(14,3) | YES |
| amount_delta | numeric(14,2) | YES |
| reason | text | YES |
| created_at | timestamptz | NO |

Business rule:
- Paid Order total ห้าม rewrite ตรง ๆ
- ใช้ Adjustment + Additional Payment / Refund

---

# 21. Order Hold Domain

## 21.1 order_holds

Purpose:
ลูกค้าชำระแล้วฝากสินค้า/เลื่อนจัดส่ง

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| order_id | uuid | NO | |
| hold_type | varchar(40) | NO | |
| status | varchar(30) | NO | |
| reason | text | YES | |
| hold_until | timestamptz | YES | review due |
| ship_not_before | timestamptz | YES | hard shipping boundary |
| reminder_at | timestamptz | YES | |
| reminder_status | varchar(30) | YES | |
| review_status | varchar(30) | YES | |
| created_by | uuid | YES | |
| released_by | uuid | YES | |
| created_at | timestamptz | NO | |
| released_at | timestamptz | YES | |

hold_type:

```text
CUSTOMER_REQUEST
WAITING_FOR_MORE_ORDERS
SCHEDULED_SHIP_DATE
MANUAL_REVIEW
```

status:

```text
ACTIVE
READY_FOR_REVIEW
RELEASED
EXPIRED_REVIEW
CANCELLED
```

review_status:

```text
PENDING
REVIEWED
ACTION_REQUIRED
```

Checks:

```sql
check (
  released_at is null
  or released_at >= created_at
)
```

Indexes:

```sql
index order_holds_active_due_idx
(hold_until)
where status in ('ACTIVE', 'READY_FOR_REVIEW');

index order_holds_order_idx
(order_id);
```

Important:
- PAID + ON_HOLD Order keeps Inventory Allocation ACTIVE
- Hold due ไม่เท่ากับ auto-ship
- Hold due สร้าง Notification/Review task

---

# 22. Order Consolidation Domain

## 22.1 order_consolidations

Purpose:
รวมหลาย Order เพื่อ Fulfillment/Shipping โดยไม่ merge Order เชิงพาณิชย์

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| customer_id | uuid | NO |
| consolidation_number | varchar(100) | NO |
| status | varchar(30) | NO |
| shipping_address_hash | varchar(128) | YES |
| shipping_charge_total_before | numeric(14,2) | NO |
| consolidated_shipping_cost | numeric(14,2) | YES |
| shipping_credit_amount | numeric(14,2) | NO |
| additional_shipping_due | numeric(14,2) | NO |
| created_by | uuid | YES |
| locked_at | timestamptz | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Statuses:

```text
OPEN
READY
LOCKED
FULFILLMENT_CREATED
SHIPPED
CANCELLED
```

Constraints:

```sql
unique (organization_id, consolidation_number)

check (shipping_charge_total_before >= 0)
check (consolidated_shipping_cost is null or consolidated_shipping_cost >= 0)
check (shipping_credit_amount >= 0)
check (additional_shipping_due >= 0)
```

Important:
shipping credit ไม่ rewrite historical payment
สร้าง Credit/Refund/Adjustment ตาม policy

---

## 22.2 order_consolidation_members

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| consolidation_id | uuid | NO |
| order_id | uuid | NO |
| added_by | uuid | YES |
| added_at | timestamptz | NO |

Constraints:

```sql
unique (consolidation_id, order_id)
```

Recommended:
Order ที่ SHIPPED แล้วห้ามเข้ากลุ่ม consolidation ใหม่

---

## 22.3 order_consolidation_events

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| consolidation_id | uuid | NO |
| event_type | varchar(50) | NO |
| reference_type | varchar(50) | YES |
| reference_id | uuid | YES |
| actor_profile_id | uuid | YES |
| payload_json | jsonb | YES |
| created_at | timestamptz | NO |

Examples:

```text
ORDER_ADDED
ORDER_REMOVED
SHIPPING_RECALCULATED
CREDIT_CREATED
ADDITIONAL_PAYMENT_REQUIRED
LOCKED
FULFILLMENT_CREATED
```

---

# 23. Purchase Session → Order → Hold → Consolidation Flow

```text
Customer
   ↓
Purchase Session
   ↓
Cart A
   ↓
Order A
PAID + ON_HOLD
   │
   ├─────────────┐
   ↓             │
Cart B           │
   ↓             │
Order B          │
UNPAID/PAID      │
   └──────┬──────┘
          ↓
Order Consolidation
          ↓
Shipping Recalculation
          ↓
Adjustment / Credit / Payment Due
          ↓
Fulfillment
```

---

# 24. Critical Rules for These Domains

## Purchase Session
- orchestration layer only
- does not replace Order
- paid Order price remains immutable
- can generate session-level reward later without mutating paid lines

## Order
- 3 independent statuses: order/payment/fulfillment
- snapshots are historical truth
- no silent rewrite after confirmation

## Hold
- payment remains paid
- allocation remains active
- due date causes review/notification, not auto shipment

## Consolidation
- operational grouping, not destructive merge
- can combine several Orders into one Fulfillment
- shipping differences handled through adjustment/credit/payment layer

---

# 25. Updated Schema Roadmap

Completed:

```text
01 Organization & Security
02 Product
03 Variant Options
04 Product Tags / Promotion Class
05 Sale Code
06 Inventory
07 Customer
08 Conversation / Live
09 Cart
10 Purchase Session
11 Order / Address Snapshot / Status History
12 Order Adjustment
13 Hold
14 Consolidation
```

Next:

```text
15 Promotion
16 Payment
17 Credit
18 Loyalty
19 Fulfillment / Shipping
20 Return / RTO
21 Notification
22 Integration / Audit
23 RLS / Final Index Review
```

Current status:

```text
DATABASE_SCHEMA_V1
COMMERCE CORE THROUGH CONSOLIDATION COMPLETE
```


---

# 26. Promotion Domain

## 26.1 promotion_campaigns

Purpose:
Identity ระดับ Campaign

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | tenant |
| code | varchar(100) | NO | business code |
| name | varchar(255) | NO | |
| description | text | YES | |
| status | varchar(30) | NO | DRAFT/ACTIVE/PAUSED/ENDED/ARCHIVED |
| scope | varchar(30) | NO | CART/ORDER/PURCHASE_SESSION/CUSTOMER_PERIOD |
| priority | integer | NO | default 0 |
| stackable | boolean | NO | |
| exclusive_group | varchar(100) | YES | |
| usage_limit | integer | YES | |
| usage_limit_per_customer | integer | YES | |
| currency_code | varchar(3) | YES | |
| created_by | uuid | YES | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Constraints:

```sql
unique (organization_id, code)

check (priority >= 0)

check (
  usage_limit is null
  or usage_limit >= 0
)

check (
  usage_limit_per_customer is null
  or usage_limit_per_customer >= 0
)
```

Indexes:

```sql
index promotion_campaigns_org_status_idx
(organization_id, status);

index promotion_campaigns_org_scope_idx
(organization_id, scope, status);
```

---

## 26.2 promotion_campaign_versions

Purpose:
Explicit versioning ของ Promotion Definition

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_id | uuid | NO |
| version_number | integer | NO |
| status | varchar(30) | NO |
| effective_from | timestamptz | YES |
| effective_until | timestamptz | YES |
| published_at | timestamptz | YES |
| published_by | uuid | YES |
| created_at | timestamptz | NO |

Statuses:

```text
DRAFT
VALIDATING
PUBLISHED
ACTIVE
RETIRED
CANCELLED
```

Constraints:

```sql
unique (campaign_id, version_number)

check (version_number > 0)

check (
  effective_until is null
  or effective_from is null
  or effective_until > effective_from
)
```

Important:
ACTIVE/PUBLISHED version ห้ามแก้ definition in-place

---

## 26.3 promotion_condition_groups

Purpose:
Nested AND / OR / NOT

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | NO |
| parent_group_id | uuid | YES |
| operator | varchar(10) | NO |
| negate | boolean | NO |
| sort_order | integer | NO |

Checks:

```sql
check (operator in ('AND','OR'))
```

---

## 26.4 promotion_conditions

Atomic targeting / eligibility condition

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| condition_group_id | uuid | NO |
| condition_type | varchar(60) | NO |
| operator | varchar(30) | NO |
| reference_type | varchar(50) | YES |
| reference_id | uuid | YES |
| value_json | jsonb | YES |
| sort_order | integer | NO |

condition_type examples:

```text
CUSTOMER_TIER
CUSTOMER_TAG
CUSTOMER_SEGMENT

SKU
VARIANT
PRODUCT
CATEGORY
BRAND
PRODUCT_GROUP
PROMOTION_CLASS
PRODUCT_TAG

CHANNEL
LIVE_SESSION
PURCHASE_SESSION

MIN_SPEND
MIN_QUANTITY

PAYMENT_METHOD
SHIPPING_METHOD
DAY_OF_WEEK
TIME_WINDOW
```

operator examples:

```text
EQ
NEQ
IN
NOT_IN
GTE
LTE
BETWEEN
EXISTS
```

Indexes:

```sql
index promotion_conditions_group_idx
(condition_group_id, sort_order);
```

---

## 26.5 promotion_rules

Qualification rules

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | NO |
| rule_type | varchar(50) | NO |
| scope_type | varchar(30) | YES |
| min_quantity | numeric(14,3) | YES |
| max_quantity | numeric(14,3) | YES |
| min_spend | numeric(14,2) | YES |
| max_spend | numeric(14,2) | YES |
| repeatable | boolean | NO |
| max_repeat_count | integer | YES |
| priority | integer | NO |
| value_json | jsonb | YES |
| created_at | timestamptz | NO |

rule_type:

```text
MIN_QUANTITY
QUANTITY_RANGE
MIN_SPEND
BUNDLE_MATCH
TRIGGER_CODE
FIRST_PURCHASE
CUSTOMER_METRIC
```

Checks:

```sql
check (
  max_quantity is null
  or min_quantity is null
  or max_quantity >= min_quantity
)

check (
  max_spend is null
  or min_spend is null
  or max_spend >= min_spend
)
```

---

## 26.6 promotion_actions

Benefit ที่เกิดเมื่อ Rule ผ่าน

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | NO |
| rule_id | uuid | YES |
| action_type | varchar(50) | NO |
| priority | integer | NO |
| stackable | boolean | NO |
| exclusive_group | varchar(100) | YES |
| max_discount_amount | numeric(14,2) | YES |
| value_json | jsonb | YES |
| created_at | timestamptz | NO |

action_type:

```text
FIXED_DISCOUNT
PERCENT_DISCOUNT
FIXED_UNIT_PRICE
TIERED_UNIT_PRICE
FREE_SHIPPING
BUY_X_GET_Y
FREE_GIFT
CREDIT_BONUS
COUPON_REWARD
LOYALTY_REWARD
```

---

## 26.7 promotion_target_scopes

Purpose:
ระบุสิ่งที่ Benefit กระทบ

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | NO |
| action_id | uuid | YES |
| scope_type | varchar(50) | NO |
| reference_id | uuid | YES |
| include | boolean | NO |

scope_type:

```text
SKU
VARIANT
PRODUCT
CATEGORY
PRODUCT_GROUP
PROMOTION_CLASS
PRODUCT_TAG
WHOLE_ORDER
SHIPPING
```

---

## 26.8 promotion_price_mappings

ใช้กับ Mix / Fixed Price by Class

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| action_id | uuid | NO |
| mapping_type | varchar(40) | NO |
| reference_id | uuid | NO |
| fixed_unit_price | numeric(14,2) | NO |
| currency_code | varchar(3) | NO |

Check:

```sql
check (fixed_unit_price >= 0)
```

Constraint:

```sql
unique (action_id, mapping_type, reference_id)
```

---

## 26.9 promotion_tiers

Tiered quantity pricing

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| action_id | uuid | NO |
| min_quantity | numeric(14,3) | NO |
| max_quantity | numeric(14,3) | YES |
| benefit_type | varchar(40) | NO |
| percent_discount | numeric(7,4) | YES |
| fixed_discount | numeric(14,2) | YES |
| fixed_unit_price | numeric(14,2) | YES |
| value_json | jsonb | YES |
| sort_order | integer | NO |

Checks:

```sql
check (min_quantity >= 0)

check (
  max_quantity is null
  or max_quantity >= min_quantity
)

check (
  percent_discount is null
  or (percent_discount >= 0 and percent_discount <= 100)
)
```

Business rule:
tier ranges must not overlap

---

## 26.10 promotion_bundles

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | NO |
| name | varchar(200) | NO |
| qualification_type | varchar(40) | NO |
| repeatable | boolean | NO |
| max_bundle_count | integer | YES |
| bundle_price_type | varchar(40) | NO |
| bundle_price_value | numeric(14,2) | YES |
| created_at | timestamptz | NO |

qualification_type:

```text
EXACT_SET
MIN_TOTAL_QUANTITY
PER_COMPONENT_MINIMUM
MIX_AND_MATCH
```

---

## 26.11 promotion_bundle_components

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| bundle_id | uuid | NO |
| component_type | varchar(40) | NO |
| reference_id | uuid | NO |
| min_quantity | numeric(14,3) | NO |
| max_quantity | numeric(14,3) | YES |
| required | boolean | NO |

---

## 26.12 promotion_reward_rules

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| action_id | uuid | NO |
| reward_selection_type | varchar(50) | NO |
| reward_quantity | numeric(14,3) | NO |
| repeatable | boolean | NO |
| max_reward_quantity | numeric(14,3) | YES |
| selection_price_basis | varchar(30) | NO |
| value_json | jsonb | YES |

reward_selection_type:

```text
SPECIFIC_SKU
CATEGORY_POOL
PRODUCT_GROUP_POOL
PROMOTION_CLASS_POOL
CHEAPEST_ELIGIBLE
CUSTOMER_CHOICE
```

selection_price_basis:

```text
ORIGINAL_PRICE
APPLIED_PRICE
```

---

## 26.13 promotion_trigger_codes

Virtual selling/action code เช่น `FREESHIP01`

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | NO |
| code | varchar(100) | NO |
| trigger_type | varchar(50) | NO |
| status | varchar(30) | NO |
| active_from | timestamptz | YES |
| active_until | timestamptz | YES |
| usage_limit | integer | YES |
| usage_limit_per_customer | integer | YES |
| channel_account_id | uuid | YES |
| live_session_id | uuid | YES |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (
  organization_id,
  campaign_version_id,
  code
)
```

Important:
ไม่ใช่ Inventory SKU
ไม่สร้าง stock movement
ไม่สร้าง fulfillment item

---

## 26.14 promotion_trigger_redemptions

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| trigger_code_id | uuid | NO |
| customer_id | uuid | YES |
| conversation_id | uuid | YES |
| live_session_id | uuid | YES |
| cart_id | uuid | YES |
| order_id | uuid | YES |
| status | varchar(30) | NO |
| rejection_reason | text | YES |
| redeemed_at | timestamptz | NO |

status:

```text
APPLIED
REJECTED
REVERSED
```

---

## 26.15 coupons

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| campaign_version_id | uuid | YES |
| code | varchar(100) | NO |
| status | varchar(30) | NO |
| starts_at | timestamptz | YES |
| ends_at | timestamptz | YES |
| usage_limit | integer | YES |
| usage_limit_per_customer | integer | YES |
| customer_id | uuid | YES |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 26.16 coupon_redemptions

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| coupon_id | uuid | NO |
| customer_id | uuid | NO |
| cart_id | uuid | YES |
| order_id | uuid | YES |
| status | varchar(30) | NO |
| reserved_at | timestamptz | YES |
| consumed_at | timestamptz | YES |
| released_at | timestamptz | YES |

status:

```text
RESERVED
CONSUMED
RELEASED
REVERSED
```

---

## 26.17 promotion_applied_benefits

Historical Source หลัง Order Confirm

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| order_item_id | uuid | YES |
| purchase_session_id | uuid | YES |
| campaign_id | uuid | NO |
| campaign_version_id | uuid | NO |
| rule_id | uuid | YES |
| action_id | uuid | NO |
| benefit_type | varchar(50) | NO |
| original_amount | numeric(14,2) | YES |
| benefit_amount | numeric(14,2) | YES |
| final_amount | numeric(14,2) | YES |
| quantity | numeric(14,3) | YES |
| reference_order_item_id | uuid | YES |
| snapshot_json | jsonb | NO |
| created_at | timestamptz | NO |

Indexes:

```sql
index promotion_applied_benefits_order_idx
(order_id);

index promotion_applied_benefits_campaign_idx
(campaign_version_id);
```

Important:
Order เก่าอธิบายจาก applied benefit snapshot
ไม่ evaluate campaign ปัจจุบันย้อนหลัง

---

## 26.18 promotion_reward_allocations

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| applied_benefit_id | uuid | NO |
| reward_order_item_id | uuid | NO |
| source_order_item_id | uuid | YES |
| reward_quantity | numeric(14,3) | NO |
| normal_unit_price | numeric(14,2) | NO |
| applied_unit_price | numeric(14,2) | NO |
| created_at | timestamptz | NO |

---

# 27. Payment Domain

## 27.1 payments

Purpose:
Aggregate payment state ของ Order

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| status | varchar(40) | NO |
| amount_expected | numeric(14,2) | NO |
| amount_received | numeric(14,2) | NO |
| currency_code | varchar(3) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (order_id)

check (amount_expected >= 0)
check (amount_received >= 0)
```

Important:
Order supports many payment transactions under one logical payment aggregate

---

## 27.2 payment_transactions

Actual financial/tender transactions

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| payment_id | uuid | NO |
| transaction_type | varchar(40) | NO |
| payment_method | varchar(40) | NO |
| amount | numeric(14,2) | NO |
| currency_code | varchar(3) | NO |
| provider | varchar(60) | YES |
| external_reference | varchar(255) | YES |
| status | varchar(30) | NO |
| paid_at | timestamptz | YES |
| created_by | uuid | YES |
| created_at | timestamptz | NO |

transaction_type:

```text
PAYMENT
ADDITIONAL_PAYMENT
STORE_CREDIT
COD_COLLECTION
REVERSAL
```

payment_method:

```text
BANK_TRANSFER
QR
CASH
COD
STORE_CREDIT
OTHER
```

status:

```text
PENDING
SUCCEEDED
FAILED
CANCELLED
REVERSED
```

Check:

```sql
check (amount > 0)
```

Indexes:

```sql
index payment_transactions_payment_idx
(payment_id, created_at);

index payment_transactions_external_idx
(organization_id, provider, external_reference);
```

---

## 27.3 payment_proofs

Purpose:
Slip / proof attachment

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| payment_transaction_id | uuid | NO |
| storage_path | text | NO |
| mime_type | varchar(100) | YES |
| submitted_by_type | varchar(30) | NO |
| submitted_at | timestamptz | NO |
| verification_status | varchar(30) | NO |
| verified_by | uuid | YES |
| verified_at | timestamptz | YES |
| metadata_json | jsonb | YES |

verification_status:

```text
PENDING
VERIFIED
REJECTED
DUPLICATE
```

---

## 27.4 refunds

Logical refund record

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| return_id | uuid | YES |
| payment_transaction_id | uuid | YES |
| refund_number | varchar(100) | NO |
| amount | numeric(14,2) | NO |
| refund_method | varchar(40) | NO |
| status | varchar(30) | NO |
| reason | text | YES |
| created_by | uuid | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, refund_number)

check (amount > 0)
```

refund_method:

```text
ORIGINAL_PAYMENT
BANK_TRANSFER
STORE_CREDIT
CASH
OTHER
```

---

## 27.5 refund_transactions

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| refund_id | uuid | NO |
| amount | numeric(14,2) | NO |
| provider | varchar(60) | YES |
| provider_reference | varchar(255) | YES |
| status | varchar(30) | NO |
| processed_at | timestamptz | YES |
| created_at | timestamptz | NO |

---

## 27.6 cod_settlements

Purpose:
Carrier remittance / reconciliation

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| shipping_provider_id | uuid | NO |
| settlement_number | varchar(100) | NO |
| settlement_date | date | NO |
| gross_amount | numeric(14,2) | NO |
| fee_amount | numeric(14,2) | NO |
| net_amount | numeric(14,2) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, settlement_number)
```

---

## 27.7 cod_settlement_items

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| settlement_id | uuid | NO |
| order_id | uuid | NO |
| shipment_id | uuid | NO |
| cod_amount | numeric(14,2) | NO |
| fee_amount | numeric(14,2) | NO |
| net_amount | numeric(14,2) | NO |

---

# 28. Customer Credit Domain

## 28.1 customer_credit_accounts

Purpose:
Current credit projection/account header

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| customer_id | uuid | NO |
| currency_code | varchar(3) | NO |
| available_balance | numeric(14,2) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, customer_id, currency_code)
```

Important:
`available_balance` เป็น projection
Source of truth คือ lots + transactions

---

## 28.2 customer_credit_lots

Purpose:
แยก Principal/Bonus/Refund/Compensation

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| credit_account_id | uuid | NO |
| lot_type | varchar(30) | NO |
| source_type | varchar(50) | NO |
| source_id | uuid | YES |
| original_amount | numeric(14,2) | NO |
| remaining_amount | numeric(14,2) | NO |
| expires_at | timestamptz | YES |
| created_at | timestamptz | NO |

lot_type:

```text
PRINCIPAL
BONUS
REFUND
COMPENSATION
```

Checks:

```sql
check (original_amount > 0)
check (remaining_amount >= 0)
check (remaining_amount <= original_amount)
```

Indexes:

```sql
index customer_credit_lots_fefo_idx
(credit_account_id, expires_at, created_at)
where remaining_amount > 0;
```

---

## 28.3 customer_credit_transactions

Append-only credit ledger

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| credit_account_id | uuid | NO |
| lot_id | uuid | YES |
| transaction_type | varchar(40) | NO |
| amount_delta | numeric(14,2) | NO |
| order_id | uuid | YES |
| payment_transaction_id | uuid | YES |
| source_type | varchar(50) | NO |
| source_id | uuid | YES |
| reversal_of_transaction_id | uuid | YES |
| reason | text | YES |
| created_by | uuid | YES |
| created_at | timestamptz | NO |

transaction_type:

```text
CREDIT_ISSUED
CREDIT_USED
CREDIT_REFUNDED
CREDIT_EXPIRED
CREDIT_ADJUSTMENT
CREDIT_REVERSAL
```

Check:

```sql
check (amount_delta <> 0)
```

Business rule:
ห้าม update old transaction เพื่อแก้ยอด
ใช้ compensating transaction

---

## 28.4 credit_lot_allocations

Purpose:
trace ว่า payment ใช้ credit lot ไหนบ้าง

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| payment_transaction_id | uuid | NO |
| credit_lot_id | uuid | NO |
| amount | numeric(14,2) | NO |
| created_at | timestamptz | NO |

Check:

```sql
check (amount > 0)
```

Important:
ช่วย refund/reversal กลับถูก lot

---

## 28.5 credit_topup_campaigns

Top-up เช่น GOLD เติม 1,000 ได้ 1,100 Credit

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(100) | NO |
| name | varchar(200) | NO |
| eligible_tier_id | uuid | YES |
| min_topup | numeric(14,2) | NO |
| bonus_type | varchar(30) | NO |
| bonus_value | numeric(14,2) | NO |
| max_bonus | numeric(14,2) | YES |
| bonus_expires_days | integer | YES |
| starts_at | timestamptz | YES |
| ends_at | timestamptz | YES |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

bonus_type:

```text
PERCENT
FIXED
```

---

## 28.6 credit_topup_transactions

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| customer_id | uuid | NO |
| campaign_id | uuid | YES |
| payment_transaction_id | uuid | NO |
| principal_amount | numeric(14,2) | NO |
| bonus_amount | numeric(14,2) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

Important:
เงินจริงรับ = principal_amount
bonus_amount ไม่ใช่ cash revenue

---

# 29. Loyalty Domain

## 29.1 loyalty_programs

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(100) | NO |
| name | varchar(200) | NO |
| status | varchar(30) | NO |
| earning_trigger | varchar(30) | NO |
| starts_at | timestamptz | YES |
| ends_at | timestamptz | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

earning_trigger examples:

```text
PAID
COMPLETED
DELIVERED
COD_SETTLED
```

Constraint:

```sql
unique (organization_id, code)
```

---

## 29.2 loyalty_accounts

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| program_id | uuid | NO |
| customer_id | uuid | NO |
| points_balance | numeric(14,3) | NO |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (program_id, customer_id)
```

Important:
points_balance เป็น projection
ledger เป็น source of truth

---

## 29.3 loyalty_rules

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| program_id | uuid | NO |
| rule_type | varchar(50) | NO |
| priority | integer | NO |
| condition_json | jsonb | YES |
| earning_formula_json | jsonb | YES |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |

rule_type examples:

```text
SPEND
UNIT
ORDER_COUNT
CATEGORY
SKU
CHANNEL
BONUS_EVENT
```

---

## 29.4 loyalty_transactions

Append-only points ledger

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| loyalty_account_id | uuid | NO |
| transaction_type | varchar(30) | NO |
| points_delta | numeric(14,3) | NO |
| order_id | uuid | YES |
| order_item_id | uuid | YES |
| source_type | varchar(50) | NO |
| source_id | uuid | YES |
| reversal_of_transaction_id | uuid | YES |
| expires_at | timestamptz | YES |
| created_at | timestamptz | NO |

transaction_type:

```text
EARN
REDEEM
EXPIRE
ADJUST
REVERSAL
```

Check:

```sql
check (points_delta <> 0)
```

---

## 29.5 customer_tiers

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| code | varchar(80) | NO |
| name | varchar(120) | NO |
| rank | integer | NO |
| status | varchar(30) | NO |
| qualification_json | jsonb | YES |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, code)
```

---

## 29.6 customer_tier_history

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| customer_id | uuid | NO |
| tier_id | uuid | NO |
| effective_from | timestamptz | NO |
| effective_until | timestamptz | YES |
| source_type | varchar(40) | NO |
| source_id | uuid | YES |
| overridden_by | uuid | YES |
| reason | text | YES |
| created_at | timestamptz | NO |

---

## 29.7 customer_commerce_metrics

Projection/cache for CRM and tier qualification

| Column | Type | Null |
|---|---|---:|
| customer_id | uuid | NO |
| organization_id | uuid | NO |
| lifetime_spend | numeric(14,2) | NO |
| lifetime_units | numeric(14,3) | NO |
| completed_order_count | integer | NO |
| average_order_value | numeric(14,2) | NO |
| last_purchase_at | timestamptz | YES |
| updated_at | timestamptz | NO |

PK:

```sql
primary key (customer_id)
```

Important:
ต้อง rebuild จาก qualifying Orders ได้

---

# 30. Promotion → Payment → Credit → Loyalty Calculation Boundary

Recommended order:

```text
Base Item Price
  ↓
Item Promotion / Mix / Tier / Bundle
  ↓
Order Promotion
  ↓
Coupon
  ↓
Shipping Promotion
  ↓
Tax
  ↓
Loyalty Redemption
  ↓
Store Credit
  ↓
External Payment
```

Important:

```text
Promotion/Coupon
= pricing/benefit

Loyalty Redemption
= benefit

Store Credit
= tender/payment value
```

Store Credit ไม่ลด historical merchandise revenue แบบ discount

---

# 31. Key Financial Constraints

## Promotion

- active version immutable
- historical result stored in applied benefit
- no live re-evaluation of old orders

## Payment

- one Order can have many transactions
- status is aggregate of transactions
- COD Delivered is not automatically Paid
- external payment state must be traceable

## Credit

- principal and bonus separate
- FEFO usage for expiring credit
- every use traces to lots
- ledger append-only

## Loyalty

- points are not money
- ledger append-only
- returns create reversal
- current balance is projection

---

# 32. Updated Schema Roadmap

Completed:

```text
01 Organization & Security
02 Product
03 Variant Options
04 Product Tags / Promotion Class
05 Sale Code
06 Inventory
07 Customer
08 Conversation / Live
09 Cart
10 Purchase Session
11 Order
12 Adjustment
13 Hold
14 Consolidation
15 Promotion
16 Payment
17 Credit
18 Loyalty
```

Next:

```text
19 Fulfillment / Shipping
20 Return / RTO
21 Notification
22 Integration / Audit
23 RLS / Final Index Review
```

Current status:

```text
DATABASE_SCHEMA_V1
COMMERCE + PRICING + PAYMENT CORE COMPLETE
```


---

# 33. Fulfillment Domain

## 33.1 fulfillments

Purpose:
Operational fulfillment unit between Order and Shipment

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | tenant |
| fulfillment_number | varchar(100) | NO | human-readable |
| warehouse_id | uuid | NO | source warehouse |
| consolidation_id | uuid | YES | FK order_consolidations |
| status | varchar(30) | NO | |
| packed_at | timestamptz | YES | |
| fulfilled_at | timestamptz | YES | |
| cancelled_at | timestamptz | YES | |
| created_by | uuid | YES | |
| created_at | timestamptz | NO | |
| updated_at | timestamptz | NO | |

Statuses:

```text
DRAFT
READY_TO_PICK
PICKING
PACKING
READY_TO_SHIP
SHIPPED
COMPLETED
CANCELLED
```

Constraints:

```sql
unique (organization_id, fulfillment_number)
```

Indexes:

```sql
index fulfillments_org_status_idx
(organization_id, status);

index fulfillments_consolidation_idx
(consolidation_id);
```

---

## 33.2 fulfillment_items

Purpose:
Trace each fulfilled quantity back to source Order Item

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| fulfillment_id | uuid | NO |
| order_id | uuid | NO |
| order_item_id | uuid | NO |
| variant_id | uuid | YES |
| quantity | numeric(14,3) | NO |
| created_at | timestamptz | NO |

Checks:

```sql
check (quantity > 0)
```

Indexes:

```sql
index fulfillment_items_fulfillment_idx
(fulfillment_id);

index fulfillment_items_order_item_idx
(order_item_id);
```

Important:
หนึ่ง Fulfillment สามารถมี items จากหลาย Orders ผ่าน Consolidation

---

## 33.3 fulfillment_events

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| fulfillment_id | uuid | NO |
| event_type | varchar(50) | NO |
| actor_profile_id | uuid | YES |
| payload_json | jsonb | YES |
| created_at | timestamptz | NO |

Examples:

```text
PICK_STARTED
ITEM_PICKED
PACK_STARTED
PACK_COMPLETED
SHIPMENT_CREATED
FULFILLMENT_CANCELLED
```

---

# 34. Shipping Domain

## 34.1 shipping_providers

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| provider_code | varchar(80) | NO |
| name | varchar(150) | NO |
| status | varchar(30) | NO |
| config_reference | text | YES |
| capabilities_json | jsonb | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

Constraint:

```sql
unique (organization_id, provider_code)
```

---

## 34.2 shipments

| Column | Type | Null | Notes |
|---|---|---:|---|
| id | uuid | NO | PK |
| organization_id | uuid | NO | |
| fulfillment_id | uuid | NO | |
| shipping_provider_id | uuid | YES | |
| shipment_number | varchar(100) | NO | |
| tracking_number | varchar(150) | YES | |
| shipping_method | varchar(80) | YES | |
| status | varchar(30) | NO | |
| label_url | text | YES | |
| package_count | integer | NO | default 1 |
| actual_weight_grams | integer | YES | |
| shipping_cost | numeric(14,2) | YES | |
| cod_amount | numeric(14,2) | YES | |
| provider_shipment_id | varchar(255) | YES | |
| created_at | timestamptz | NO | |
| shipped_at | timestamptz | YES | |
| delivered_at | timestamptz | YES | |
| cancelled_at | timestamptz | YES | |

Statuses:

```text
DRAFT
LABEL_CREATED
READY_FOR_HANDOFF
IN_TRANSIT
DELIVERED
EXCEPTION
RTO
CANCELLED
```

Constraints:

```sql
unique (organization_id, shipment_number)

check (package_count > 0)
check (actual_weight_grams is null or actual_weight_grams >= 0)
check (shipping_cost is null or shipping_cost >= 0)
check (cod_amount is null or cod_amount >= 0)
```

Indexes:

```sql
index shipments_tracking_idx
(organization_id, tracking_number);

index shipments_status_idx
(organization_id, status);

index shipments_provider_ref_idx
(organization_id, shipping_provider_id, provider_shipment_id);
```

---

## 34.3 shipment_packages

Purpose:
รองรับ Shipment หลายกล่อง

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| shipment_id | uuid | NO |
| package_number | integer | NO |
| weight_grams | integer | YES |
| width_cm | numeric(10,2) | YES |
| length_cm | numeric(10,2) | YES |
| height_cm | numeric(10,2) | YES |
| tracking_number | varchar(150) | YES |
| label_url | text | YES |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (shipment_id, package_number)
```

---

## 34.4 tracking_events

Append-only provider tracking events

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| shipment_id | uuid | NO |
| external_event_id | varchar(255) | YES |
| event_code | varchar(100) | NO |
| event_description | text | YES |
| event_at | timestamptz | NO |
| raw_payload_json | jsonb | YES |
| created_at | timestamptz | NO |

Recommended uniqueness:

```sql
unique (
  shipment_id,
  external_event_id
)
```

when external_event_id is not null

---

# 35. Return / Exchange / RTO Domain

## 35.1 returns

Purpose:
RMA / Exchange / Return To Origin workflow

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| order_id | uuid | NO |
| return_number | varchar(100) | NO |
| return_type | varchar(30) | NO |
| status | varchar(30) | NO |
| resolution_type | varchar(40) | YES |
| reason | text | YES |
| requested_at | timestamptz | NO |
| received_at | timestamptz | YES |
| inspected_at | timestamptz | YES |
| resolved_at | timestamptz | YES |
| created_by | uuid | YES |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

return_type:

```text
CUSTOMER_RETURN
EXCHANGE
RTO
```

status:

```text
REQUESTED
APPROVED
IN_TRANSIT
RECEIVED
INSPECTION
RESOLVED
REJECTED
CANCELLED
```

resolution_type:

```text
REFUND
STORE_CREDIT
REPLACEMENT
EXCHANGE
NO_ACTION
```

Constraint:

```sql
unique (organization_id, return_number)
```

---

## 35.2 return_items

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| return_id | uuid | NO |
| order_item_id | uuid | NO |
| quantity | numeric(14,3) | NO |
| condition_status | varchar(30) | YES |
| restockable | boolean | NO |
| refund_amount | numeric(14,2) | YES |
| replacement_variant_id | uuid | YES |
| created_at | timestamptz | NO |

condition_status:

```text
GOOD
DAMAGED
OPENED
DEFECTIVE
QUARANTINE
UNKNOWN
```

Checks:

```sql
check (quantity > 0)
check (refund_amount is null or refund_amount >= 0)
```

Important:
Returned item does not automatically increase available stock

---

## 35.3 return_status_history

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| return_id | uuid | NO |
| from_status | varchar(30) | YES |
| to_status | varchar(30) | NO |
| changed_by | uuid | YES |
| reason | text | YES |
| created_at | timestamptz | NO |

---

## 35.4 return_inventory_dispositions

Purpose:
inspection outcome before restock

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| return_item_id | uuid | NO |
| disposition | varchar(30) | NO |
| quantity | numeric(14,3) | NO |
| warehouse_id | uuid | YES |
| inventory_movement_id | uuid | YES |
| reason | text | YES |
| inspected_by | uuid | YES |
| created_at | timestamptz | NO |

disposition:

```text
RESTOCK
DAMAGED
QUARANTINE
DISPOSE
RETURN_TO_SUPPLIER
```

Important:
`RESTOCK` creates `inventory_movements.RETURN_RESTOCK`

---

## 35.5 exchange_replacements

Purpose:
trace exchange replacement fulfillment

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| return_id | uuid | NO |
| return_item_id | uuid | NO |
| replacement_order_id | uuid | YES |
| replacement_order_item_id | uuid | YES |
| price_difference | numeric(14,2) | NO |
| created_at | timestamptz | NO |

---

# 36. Notification & Task Domain

## 36.1 notifications

Internal source of truth

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| notification_type | varchar(60) | NO |
| title | varchar(255) | NO |
| body | text | YES |
| reference_type | varchar(60) | YES |
| reference_id | uuid | YES |
| severity | varchar(20) | NO |
| scheduled_at | timestamptz | YES |
| triggered_at | timestamptz | YES |
| due_at | timestamptz | YES |
| action_required | boolean | NO |
| action_status | varchar(30) | YES |
| assigned_profile_id | uuid | YES |
| assigned_team_id | uuid | YES |
| escalation_at | timestamptz | YES |
| status | varchar(30) | NO |
| created_at | timestamptz | NO |
| updated_at | timestamptz | NO |

severity:

```text
INFO
WARNING
CRITICAL
```

status:

```text
PENDING
ACTIVE
ACTIONED
DISMISSED
EXPIRED
```

action_status:

```text
PENDING
IN_PROGRESS
DONE
NOT_REQUIRED
```

Indexes:

```sql
index notifications_due_idx
(organization_id, due_at)
where status in ('PENDING', 'ACTIVE');

index notifications_assignee_idx
(organization_id, assigned_profile_id, status);
```

---

## 36.2 notification_recipients

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| notification_id | uuid | NO |
| recipient_type | varchar(30) | NO |
| profile_id | uuid | YES |
| team_id | uuid | YES |
| status | varchar(30) | NO |
| read_at | timestamptz | YES |
| actioned_at | timestamptz | YES |

status:

```text
UNREAD
READ
ACTIONED
DISMISSED
```

---

## 36.3 notification_delivery_attempts

Future delivery channels

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| notification_id | uuid | NO |
| channel | varchar(30) | NO |
| destination | text | YES |
| status | varchar(30) | NO |
| provider_reference | varchar(255) | YES |
| attempted_at | timestamptz | NO |
| delivered_at | timestamptz | YES |
| error_message | text | YES |

channel:

```text
IN_APP
EMAIL
LINE
GOOGLE_CALENDAR
BROWSER_PUSH
```

Important:
External delivery is secondary integration only

---

# 37. Integration Domain

## 37.1 integration_events

Raw provider event inbox

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| provider | varchar(60) | NO |
| channel_account_id | uuid | YES |
| external_event_id | varchar(255) | NO |
| event_type | varchar(100) | NO |
| payload_json | jsonb | NO |
| status | varchar(30) | NO |
| retry_count | integer | NO |
| received_at | timestamptz | NO |
| processed_at | timestamptz | YES |
| error_message | text | YES |

status:

```text
RECEIVED
PROCESSING
PROCESSED
FAILED
DEAD_LETTER
```

Constraints:

```sql
check (retry_count >= 0)
```

Recommended uniqueness:

```sql
unique (
  organization_id,
  provider,
  channel_account_id,
  external_event_id
)
```

Indexes:

```sql
index integration_events_status_idx
(organization_id, status, received_at);

index integration_events_provider_idx
(organization_id, provider, received_at desc);
```

---

## 37.2 external_references

Purpose:
map canonical entity to provider external ID

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| entity_type | varchar(60) | NO |
| entity_id | uuid | NO |
| provider | varchar(60) | NO |
| external_id | varchar(255) | NO |
| created_at | timestamptz | NO |

Constraint:

```sql
unique (
  organization_id,
  entity_type,
  provider,
  external_id
)
```

Indexes:

```sql
index external_references_entity_idx
(organization_id, entity_type, entity_id);
```

---

# 38. Audit Domain

## 38.1 audit_logs

Append-only audit trail

| Column | Type | Null |
|---|---|---:|
| id | uuid | NO |
| organization_id | uuid | NO |
| actor_profile_id | uuid | YES |
| actor_type | varchar(30) | NO |
| entity_type | varchar(60) | NO |
| entity_id | uuid | NO |
| action | varchar(80) | NO |
| before_json | jsonb | YES |
| after_json | jsonb | YES |
| reason | text | YES |
| request_id | uuid | YES |
| ip_address | inet | YES |
| user_agent | text | YES |
| created_at | timestamptz | NO |

actor_type:

```text
USER
SYSTEM
INTEGRATION
JOB
```

Indexes:

```sql
index audit_logs_entity_idx
(organization_id, entity_type, entity_id, created_at desc);

index audit_logs_actor_idx
(organization_id, actor_profile_id, created_at desc);
```

Important:
Audit logs should not be editable through normal application flows

---

# 39. RLS Strategy Draft

## 39.1 Tenant Boundary

Every tenant-owned table:

```text
organization_id
```

RLS principle:

```sql
organization_id = current organization context
```

Never trust organization_id supplied by frontend alone

Application must derive membership from authenticated user/profile

---

## 39.2 Membership Model

Recommended helper function concept:

```sql
current_organization_id()
```

or membership lookup based on:

```text
auth.uid()
→ profiles.auth_user_id
→ profiles.organization_id
```

If future user can belong to several organizations:
replace single-org profile assumption with `organization_memberships`

This decision should be finalized before migration.

---

## 39.3 Sensitive Domain Permissions

Beyond tenant RLS, application/service policies must protect:

```text
cost_price
manual discount
inventory adjustment
credit adjustment
refund
promotion publishing
permission changes
customer merge
order cancellation
```

RLS handles row access.
Business permissions handle action access.

---

# 40. Final Index Review Principles

Create indexes for:

1. every important FK used frequently
2. tenant + status queues
3. tenant + human-readable codes
4. provider external IDs
5. due-date job queries
6. customer/order history
7. inventory active reservation/allocation lookup

Avoid indexing every JSONB field by default

Add GIN JSONB indexes only when real queries require them

---

# 41. Database Integrity Rules

Must be enforced at DB where practical:

```text
PK/FK integrity
tenant-scoped business code uniqueness
positive quantity
non-negative money
valid date ranges
single primary promotion class
active-context Sale Code uniqueness
append-only ledger behavior
```

Use service/application logic for complex cross-row rules such as:

```text
promotion tier overlap
bundle qualification
promotion conflict resolution
order consolidation eligibility
customer merge verification
```

Use PostgreSQL transaction/function where race conditions affect money or stock

---

# 42. Transaction-Critical Operations

Must be atomic:

## Inventory reservation

```text
lock/check availability
→ create reservation
→ update balance projection
→ commit
```

## Reservation → Allocation

```text
validate reservation
→ release/convert reservation
→ create allocation
→ update projection
→ commit
```

## Credit use

```text
lock available credit lots
→ FEFO allocate
→ create ledger transactions
→ create credit_lot_allocations
→ update account projection
→ create payment transaction
→ commit
```

## Loyalty redemption

```text
validate points
→ ledger redeem
→ update balance projection
→ commit
```

## Order confirmation

```text
pricing validation
→ promotion snapshots
→ order snapshots
→ reservation/allocation conversion
→ payment expected
→ commit
```

---

# 43. Completed Schema Roadmap

Completed:

```text
01 Organization & Security
02 Product
03 Variant Options
04 Product Tags / Promotion Class
05 Sale Code
06 Inventory
07 Customer
08 Conversation / Live
09 Cart
10 Purchase Session
11 Order
12 Adjustment
13 Hold
14 Consolidation
15 Promotion
16 Payment
17 Credit
18 Loyalty
19 Fulfillment
20 Shipping
21 Return / Exchange / RTO
22 Notification / Task
23 Integration
24 Audit
25 RLS Strategy Draft
26 Index / Integrity / Transaction Review
```

---

# 44. DATABASE_SCHEMA_V1 Status

```text
DATABASE_SCHEMA_V1
==============================

BUSINESS DOMAIN COVERAGE: COMPLETE
RELATIONAL MODEL: COMPLETE
COLUMN TYPES: DRAFT COMPLETE
PK/FK DESIGN: DRAFT COMPLETE
CONSTRAINTS: DRAFT COMPLETE
INDEX STRATEGY: DRAFT COMPLETE
RLS STRATEGY: DRAFT COMPLETE

STATUS:
READY FOR TECHNICAL REVIEW
```

Before generating migration SQL, perform one technical normalization review focused on:

```text
1. FK dependency/order
2. enum strategy
3. multi-organization membership model
4. polymorphic reference strategy
5. generated/update timestamp functions
6. append-only DB enforcement
7. RLS helper functions
8. migration ordering
```

Recommended next artifact:

`DATABASE_SCHEMA_TECHNICAL_REVIEW_V1.md`

Then:

`SUPABASE_MIGRATION_V1.sql`


---

# 45. Technical Review Corrections — Applied for Schema Freeze

The following decisions supersede earlier draft sections where they conflict.

## TR-001 — organization_memberships

`profiles` is global to authenticated user.

Remove tenant ownership from profile identity.

Add:

```text
organization_memberships
- id uuid PK
- organization_id uuid
- profile_id uuid
- status varchar(30)
- is_default boolean
- joined_at timestamptz
- created_at timestamptz
- updated_at timestamptz
```

Unique:
`(organization_id, profile_id)`

Roles attach to membership through `membership_roles`.

## TR-002 — membership_roles

Replace `profile_roles` with:

```text
membership_roles
- membership_id
- role_id
```

PK:
`(membership_id, role_id)`

## TR-003 — Status Type Strategy

Use `varchar + CHECK` for v1 business statuses.
Do not use PostgreSQL ENUM unless explicitly reviewed later.

## TR-004 — Append-only Tables

Strict append-only:
- inventory_movements
- customer_credit_transactions
- loyalty_transactions
- audit_logs

DB triggers must reject normal UPDATE/DELETE.

## TR-005 — Updated At

Use reusable `set_updated_at()` trigger.

## TR-006 — Document Sequences

Add `document_sequences` and atomic `next_document_number()`.

Use for:
- order_number
- session_number
- fulfillment_number
- shipment_number
- return_number
- consolidation_number
- adjustment_number
- refund_number

## TR-007 — Variant Option Junction

Use:

```text
product_variant_option_values
- variant_id
- option_id
- option_value_id
```

Unique:
`(variant_id, option_id)`

## TR-008 — Storage Paths

Persist object/storage path, not signed URL.

Examples:
- label_storage_path
- proof storage_path

Generate signed URLs at request time.

## TR-009 — Tenant-aware Foreign Keys

Critical business relationships should use `(organization_id, id)` uniqueness on parent and composite child FK where practical.

## TR-010 — Search

Enable `pg_trgm` and `unaccent`.

Use trigram indexes for Thai/customer/product names plus exact indexes for codes.

---

# 46. DATABASE_SCHEMA_V1 Freeze Gate

With TR-001 → TR-010 applied:

```text
STATUS:
READY TO FREEZE FOR MIGRATION
```

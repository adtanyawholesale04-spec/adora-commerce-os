
# BUSINESS_RULE_CLOSURE_OPEN_001_005.md

Project: Conversational Commerce Platform
Status: PROPOSED FOR FREEZE
Scope: OPEN-001 → OPEN-005

---

# OPEN-001 — Return + Promotion Clawback

## Decision

Promotion Return Policy ต้องเป็น Campaign-level configuration และแยกเป็น 3 แกน:

1. Pricing Clawback
2. Shipping Benefit Clawback
3. Reward Retention

### A. Pricing Clawback Policy

Allowed values:
- `KEEP_ORIGINAL_PAID_PRICE`
- `REPRICE_RETAINED_ITEMS`
- `MANUAL_REVIEW`

Recommended default:
`KEEP_ORIGINAL_PAID_PRICE`

เหตุผล:
- ลูกค้าได้รับราคานั้นอย่างถูกต้องตอนซื้อ
- ลดข้อพิพาท
- Refund คำนวณจาก historical paid snapshot ได้ตรง
- ไม่ทำให้พนักงานต้องอธิบายการเรียกคืนส่วนลดซับซ้อน

Exception:
Campaign ป้องกัน abuse สามารถใช้ `REPRICE_RETAINED_ITEMS` ได้

ตัวอย่าง:
ซื้อ 3 ได้ Mix Price
คืน 1
Default:
คืนเงินตามราคาที่จ่ายของสินค้าที่คืน
ไม่ reprice สองชิ้นที่เหลือย้อนหลัง

### B. Shipping Benefit Clawback Policy

Allowed:
- `KEEP_BENEFIT`
- `CLAWBACK_ORIGINAL_DISCOUNT`
- `MANUAL_REVIEW`

Recommended default:
`KEEP_BENEFIT`

เหตุผล:
ค่าส่งเป็นบริการที่เกิดขึ้นแล้ว และการคิดย้อนหลังสร้าง friction สูง

Exception:
Campaign เฉพาะกิจสามารถ clawback ได้ถ้าระบุชัด

### C. Free Gift Retention Policy

Allowed:
- `KEEP_REWARD`
- `RETURN_REWARD_REQUIRED`
- `DEDUCT_REWARD_VALUE_FROM_REFUND`

Recommended default:
`KEEP_REWARD`

สำหรับมูลค่าของแถมต่ำและแคมเปญทั่วไป

Campaign มูลค่าสูง:
ใช้ `RETURN_REWARD_REQUIRED`

### D. Loyalty Reversal

Default:
Reverse points ตามมูลค่าสุทธิ/จำนวนชิ้นที่ถูกคืน
ไม่ reverse benefits unrelated to returned items

## Data Model Impact

เพิ่มใน promotion campaign/action policy:
- return_pricing_policy
- return_shipping_policy
- reward_retention_policy

Return calculation ต้องอ้าง:
- order_item historical snapshot
- promotion_applied_benefits
- reward allocations

---

# OPEN-002 — Purchase Session Promotion Scope

## Decision

Default Promotion Scope:
`CART / ORDER`

Confirmed/Paid Order ห้ามได้รับ Promotion ใหม่ย้อนหลังจาก Order ใหม่

### Session-level Promotion

ทำได้เฉพาะ:
`scope = PURCHASE_SESSION`

แต่ใช้เฉพาะกับ:
- Open Cart
- Unconfirmed Order
- Pending Session Close

Paid/Confirmed Historical Order:
ห้ามแก้ราคาย้อนหลัง

ถ้า Campaign ต้องการให้ Benefit หลังรวม Session:
ใช้ `SESSION_REWARD` หรือ `ORDER_ADJUSTMENT/CREDIT_REWARD`

ตัวอย่าง:
Order A ซื้อ 2 ชิ้น PAID
Order B ซื้อ 1 ชิ้น

Campaign ปกติ:
ไม่ย้อน Mix Price ให้ Order A

Campaign แบบ Session:
อาจให้ Reward ใหม่ เช่น:
- Coupon
- Store Credit
- Free Shipping on consolidated shipment
- Gift

แต่ไม่ rewrite unit price ของ Order A

## Data Model Impact

เพิ่ม:
- promotion scope = PURCHASE_SESSION
- session reward applied benefit
- reference_purchase_session_id
- benefit can be applied without mutating order item price

---

# OPEN-003 — Balance Strategy

## Decision

ใช้ Hybrid Ledger + Transactionally Maintained Projection

### Inventory
Authoritative:
- inventory_movements
- inventory_reservations
- inventory_allocations

Projection:
- inventory_balances

Update projection ใน transaction เดียวกับ source write

### Customer Credit
Authoritative:
- customer_credit_transactions
- customer_credit_lots

Projection:
- customer_credit_accounts.available_balance

ต้อง reconcile/rebuild ได้

### Loyalty
Authoritative:
- loyalty_transactions

Projection:
- loyalty_accounts.points_balance

ต้อง rebuild ได้

## Why

ไม่เลือก compute-every-time เพราะ:
- ข้อมูลโตแล้วช้า
- dashboard/order validation ต้องตอบเร็ว

ไม่เลือก balance-only เพราะ:
- audit/reversal ไม่พอ

ดังนั้น:
`Ledger = truth`
`Balance = fast projection`

---

# OPEN-004 — Promotion Campaign Versioning

## Decision

ใช้ Explicit Versioning ตั้งแต่ v1.1

เหตุผล:
Promotion เป็นแกนสำคัญและมีความเสี่ยงสูงต่อ historical interpretation

### Proposed Model

promotion_campaigns
- identity ของ Campaign

promotion_campaign_versions
- version_number
- status
- effective_from
- effective_until
- published_at

Condition/Rule/Action ต้องผูกกับ campaign_version_id

### Workflow

DRAFT v1
→ PUBLISH
→ ACTIVE

ต้องการแก้:
Clone v1 → v2 DRAFT
แก้ v2
Publish v2
v1 → RETIRED

Order Snapshot เก็บ:
- campaign_id
- campaign_version_id
- rule/action snapshot

ห้าม edit ACTIVE version in-place

---

# OPEN-005 — Notification Delivery

## Decision

Phase 1:
In-app Notification เป็น Source of Truth

Delivery channels ภายหลัง:
- Email
- LINE
- Google Calendar
- Browser Push (future)

### Notification Model

notification_event
→ notification
→ notification_recipient
→ delivery_attempt(s)

In-app status:
- UNREAD
- READ
- ACTIONED
- DISMISSED

### Task-like notifications

บาง Notification ต้องมี due/action:
- Hold Due
- Payment Deadline
- Return Inspection
- COD Settlement overdue
- Shipment Exception

จึงเพิ่ม:
- due_at
- action_required
- action_status
- assignee/team
- escalation_at

Google Calendar:
เป็น mirror/integration เท่านั้น
ไม่ใช่ source of truth

---

# Freeze Recommendation

OPEN-001 → OPEN-005:
READY TO CLOSE

Recommended status:
- OPEN-001 CLOSED
- OPEN-002 CLOSED
- OPEN-003 CLOSED
- OPEN-004 CLOSED
- OPEN-005 CLOSED

หลัง Closure:
ER Diagram v1.1 สามารถเข้าสู่ `FROZEN FOR SCHEMA DRAFT`

# BUSINESS RULES

## Conversational Commerce Platform

**Version:** 0.2 Draft  
**Status:** Business Rule Review in progress  
**Last updated:** 2026-07-25

---

# 1. Rule Status

- `IDEA` — แนวคิด ยังไม่ถือเป็น requirement
- `UNDER_REVIEW` — กำลังวิเคราะห์
- `PROPOSED` — มีกติกาที่แนะนำแล้ว รอยืนยัน
- `APPROVED` — ตกลงใช้เป็นกติกาของระบบ
- `IMPLEMENTED` — พัฒนาแล้ว
- `REJECTED` — ตัดสินใจไม่ใช้

---

# 2. Round 1 Baseline — BR-001 to BR-020

กติกาจาก Business Rule Review รอบที่ 1 ใช้เป็น baseline ระดับ `PROPOSED` ได้แก่ Customer Master, Product/SKU, Inventory Ledger, Stock Reservation, Cart, Live Cart, Parser, Order Snapshot, Order/Payment/Fulfillment Status, Promotion, Address Snapshot, Conversation, Assignment, Integration Event, Idempotency, Soft Delete และ Audit.

---

# 3. Round 2 — Commerce Core Deep Review

## BR-021 — Partial Stock Fulfillment

**Status:** PROPOSED

### Rule
ระบบไม่ลดจำนวนสินค้าใน Cart อัตโนมัติเพียงเพราะ Stock ไม่พอ โดยต้องแยก `requested_quantity` ออกจาก `allocatable_quantity` และให้ผู้ใช้/พนักงานตัดสินใจว่าจะรับจำนวนที่มีอยู่หรือรอสินค้า

### Recommended behavior
- Cart สามารถมีจำนวนที่ลูกค้าต้องการมากกว่า Available ได้ในสถานะ `NEEDS_STOCK_DECISION`
- ระบบต้องไม่ Confirm Order เกินจำนวน Stock ที่ Allocate/Reserve ได้ เว้นแต่ Organization เปิด Backorder โดยชัดเจน
- MVP: `backorder_enabled = false`

### ER impact
- `cart_items.requested_quantity`
- `cart_items.reserved_quantity`
- optional future: `cart_items.backordered_quantity`

---

## BR-022 — Overselling Protection

**Status:** PROPOSED

### Rule
ทุกการ Reserve / Allocate Stock ต้องเป็น atomic transaction ในฐานข้อมูล ห้ามตรวจ stock แล้วค่อย update แยก transaction เพราะอาจ oversell เมื่อมีหลายคำสั่งพร้อมกัน

### Recommended behavior
- Inventory availability check + reservation creation + reserved balance update ต้องเกิดใน transaction เดียว
- Server-side เท่านั้น
- Frontend ไม่มีสิทธิ์ตัดสิน stock availability เอง
- หาก concurrent request ชนกัน ผู้ที่ commit reservation สำเร็จก่อนได้สิทธิ์ก่อน

### ER / implementation impact
- unique/idempotency key บน reservation operation
- database function / transaction boundary
- optimistic UI แสดงผลได้ แต่ source of truth อยู่ที่ PostgreSQL

---

## BR-023 — Reservation & Payment Deadline Policy

**Status:** PROPOSED — UPDATED FROM BUSINESS FEEDBACK

### Rule
Reservation/Payment Deadline ต้องตั้งค่าได้หลายแบบและห้าม hard-code เป็นจำนวนนาทีอย่างเดียว

รองรับอย่างน้อย 3 policy:
1. `DURATION` — หมดอายุหลังสร้าง/ยืนยัน X นาที เช่น 15 หรือ 60 นาที
2. `FIXED_TIME` — หมดอายุ ณ เวลาที่กำหนด เช่น วันนี้ 18:00 น.
3. `SESSION_END` — หมดอายุเมื่อ Live Session ปิด หรือเวลา grace period หลัง Live จบ

### Example
ร้านกำหนดว่า Order ที่เกิดระหว่าง Live วันนี้ต้องชำระก่อน 18:00 น.

หากถึง 18:00 น. แล้วยังไม่ชำระ:
1. Payment deadline → `EXPIRED`
2. Order/Cart ที่เข้าเงื่อนไข → `CANCELLED_BY_TIMEOUT` หรือ `PAYMENT_EXPIRED` ตาม stage
3. Reservation/Allocation ที่ยังไม่ committed → release stock
4. Checkout/payment link เดิมต้องไม่สามารถชำระแบบ silent success ได้ ต้อง revalidate ก่อนรับเงิน
5. บันทึก status history และ audit log

### Configuration hierarchy
ระบบควรรองรับค่า default ระดับ Organization และ override ได้ระดับ:
- Sales channel
- Live session
- Cart / Order รายใบ

### ER impact
- `inventory_reservations.expires_at`
- `inventory_reservations.expiry_policy`
- `carts.payment_due_at`
- `orders.payment_due_at`
- `organization_settings` / `channel_settings`
- optional `live_sessions.payment_due_at`

---

## BR-024 — Order Edit Before Payment

**Status:** PROPOSED

### Rule
Order ที่ยังไม่ชำระและยังไม่เริ่ม Fulfillment สามารถแก้ไขสินค้า/จำนวน/ราคาได้ผ่าน controlled workflow

### Behavior
การแก้ Order ต้อง:
1. revalidate stock
2. adjust reservation/allocation
3. recalculate promotion
4. recalculate shipping
5. recalculate tax/total
6. create order revision/audit entry

ห้ามแก้ยอดโดย bypass calculation engine

### ER impact
- `order_revisions`
- `order_revision_items` หรือ snapshot JSON ในระยะแรก
- `orders.version`

---

## BR-025 — Order Edit After Payment

**Status:** PROPOSED

### Rule
หลังมี Payment ที่ `PAID` แล้ว ห้ามแก้ Order total แบบ silent update

### Recommended behavior
- เพิ่มสินค้า → สร้าง `order_adjustment` และยอดที่ต้องชำระเพิ่ม
- ลดสินค้า → สร้าง `order_adjustment` และ refund/credit workflow
- เปลี่ยนสินค้า value เท่ากัน → ยังต้องสร้าง adjustment/revision เพื่อ audit
- ถ้า Fulfillment เริ่มแล้ว อาจต้อง split fulfillment หรือใช้ exchange workflow

### ER impact
- `order_adjustments`
- `order_adjustment_items`
- link adjustment ↔ payment/refund

---

## BR-026 — Partial Payment

**Status:** PROPOSED

### Rule
Order หนึ่งรายการสามารถมีหลาย Payment Transaction และยอดรวมที่รับเงินจริงเป็นตัวกำหนด payment state

### Payment aggregate
- `UNPAID`: paid_amount = 0
- `PARTIALLY_PAID`: 0 < paid_amount < amount_due
- `PAID`: paid_amount >= amount_due และไม่มี unresolved adjustment
- `PARTIALLY_REFUNDED`
- `REFUNDED`

### Important
ห้ามเก็บ `payment_status` จากค่าที่พนักงานเลือกเองโดยไม่มี transaction รองรับ

### ER impact
- `payments` เป็น payment intent/record ระดับ order
- `payment_transactions` เป็นเงินจริงแต่ละ transaction
- `refunds` / `refund_transactions`

---

## BR-027 — COD Payment Model

**Status:** PROPOSED

### Rule
COD เป็น `payment_method` ไม่ใช่สถานะของ Order

### Recommended lifecycle
Order = CONFIRMED  
Payment = UNPAID / COD_PENDING  
Fulfillment = PROCESSING → FULFILLED  
Shipment = SHIPPED → DELIVERED  
เมื่อ carrier settlement ยืนยัน → Payment = PAID

### Important
`DELIVERED` ไม่เท่ากับ `COD_SETTLED`

### ER impact
- `payments.method = COD`
- `cod_settlements`
- `cod_settlement_items`
- shipment ↔ COD collection amount

---

## BR-028 — Order Cancellation Policy

**Status:** PROPOSED

### Rule
Cancel ต้องขึ้นกับ fulfillment/payment state ไม่ใช่เปิดให้ cancel ได้ทุกสถานะ

### Policy
- ก่อน Payment และก่อน Fulfillment: cancel ได้ตรง ๆ + release stock
- Paid แต่ยังไม่ Fulfill: cancel + refund workflow
- Packing started: cancel ต้อง require permission และ rollback allocation/picking
- Shipped: ห้ามใช้ Cancel; เปลี่ยนเป็น RTO/Return workflow

### Required fields
- `cancel_reason_code`
- `cancel_note`
- `cancelled_by`
- `cancelled_at`

---

## BR-029 — Return Merchandise Authorization (RMA)

**Status:** PROPOSED

### Rule
การคืนสินค้าไม่แก้ Order เดิม แต่สร้าง Return/RMA แยกจาก Order

### Return lifecycle
`REQUESTED → APPROVED → IN_TRANSIT → RECEIVED → INSPECTED → RESOLVED`

### Resolution
- REFUND
- EXCHANGE
- STORE_CREDIT (future)
- REJECTED

### ER impact
- `returns`
- `return_items`
- `return_status_history`

---

## BR-030 — Exchange

**Status:** PROPOSED

### Rule
Exchange ต้องมีทั้งฝั่งรับสินค้าคืนและฝั่งส่งสินค้าใหม่ และห้าม overwrite `order_items` เดิม

### Recommended model
Return/RMA → inspect → exchange approval → create replacement order/fulfillment referencing original order and return

### Inventory behavior
- สินค้าคืนเข้าสต๊อกเมื่อผ่าน inspection และกำหนด disposition ว่า sellable
- สินค้าชำรุดไม่กลับ available stock

### ER impact
- `replacement_order_id` หรือ `order_links`
- inventory movement types: `RETURN_RECEIVED`, `RETURN_RESTOCK`, `RETURN_DAMAGED`, `EXCHANGE_OUT`

---

## BR-031 — Return Stock Disposition

**Status:** PROPOSED

### Rule
สินค้าที่ลูกค้าคืนไม่เพิ่ม Available Stock ทันทีเมื่อ carrier แจ้ง delivered

### Required inspection result
- `RESTOCKABLE`
- `DAMAGED`
- `QUARANTINE`
- `DISPOSE`

เฉพาะ `RESTOCKABLE` เท่านั้นที่สร้าง movement กลับเข้าสต๊อกพร้อมขาย

---

## BR-032 — RTO (Return to Origin)

**Status:** PROPOSED

### Rule
พัสดุที่ส่งแล้วแต่ส่งไม่สำเร็จ/ลูกค้าปฏิเสธรับ ต้องเข้า RTO workflow แยกจาก Customer Return

### Lifecycle
`RTO_INITIATED → RETURNING → RECEIVED_AT_WAREHOUSE → INSPECTED → CLOSED`

### COD impact
- COD payment ห้ามถือว่า paid
- shipping fee / return fee ต้องบันทึกแยกเพื่อวิเคราะห์ loss

### Inventory impact
เหมือน Return: ห้าม restock จนตรวจสภาพ

### ER impact
- ใช้ `returns.return_type = RTO` หรือแยก `rto_cases`; แนะนำใช้ Return domain เดียวแต่แยก `return_type`

---

## BR-033 — Shipment / Fulfillment Split

**Status:** PROPOSED

### Rule
Order หนึ่งรายการสามารถมีหลาย Fulfillment/Shipment ได้

### Use cases
- ส่งบางสินค้าก่อน
- สินค้าคนละคลัง
- สินค้าบางชิ้นขาด
- replacement/exchange

### ER impact
- `fulfillments`
- `fulfillment_items`
- `shipments` linked to fulfillment
- ห้ามผูก shipment ตรงกับ order อย่างเดียว

---

## BR-034 — Stock Allocation vs Reservation

**Status:** PROPOSED

### Rule
แยกความหมายของ Reservation กับ Allocation

- Reservation = กันของไว้ให้ Cart/Order ก่อน Confirm
- Allocation = ระบุ stock ที่ถูกมอบให้ Order/Fulfillment ที่ Confirm แล้ว

หลัง Order Confirmed:
`reservation → converted/released` และสร้าง allocation สำหรับ fulfillment

### Benefit
ทำให้ picking/packing, split fulfillment และ cancellation ถูกต้องขึ้น

### ER impact
- `inventory_reservations`
- `inventory_allocations`

---

## BR-035 — Inventory Adjustment Permission

**Status:** PROPOSED

### Rule
พนักงานทั่วไปห้ามแก้ stock balance โดยตรง

Stock change ต้องเกิดจาก:
- purchase/receive
- sale/fulfillment
- return/restock
- damage
- transfer
- cycle count adjustment
- correction/reversal

Manual adjustment ต้อง require permission + reason + audit log

---

# 4. Round 2 Architecture Decisions

1. Inventory ต้องมีทั้ง `reservation` และ `allocation`
2. Order ต้องรองรับ revision/adjustment หลังสร้างแล้ว
3. Payment ต้องเป็น transaction-based aggregate
4. COD ต้องมี settlement domain แยกจาก shipment delivery
5. Return/Exchange/RTO ต้องเป็น domain แยกจาก order status
6. Fulfillment ต้องอยู่ระหว่าง Order และ Shipment เพื่อรองรับ split shipment
7. Returned stock ต้องผ่าน inspection ก่อนกลับ available
8. Overselling protection ต้องบังคับที่ database transaction layer

---

# 5. Items still UNDER REVIEW

- Backorder จะเปิดใน MVP หรือ Phase หลัง
- Reservation policy ของ Live: fixed duration vs until live closes
- Cancellation fee / non-refundable fee
- COD settlement matching ระดับ shipment หรือ remittance batch
- Store credit / wallet
- Exchange ที่มีส่วนต่างราคา
- Return eligibility days ตามสินค้า/category
- Return shipping fee payer
- Partial refund calculation with promotion allocation
---

## BR-036 — Post-Payment Additional Purchase

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

### Problem
ลูกค้าชำระ Order แรกแล้ว แต่กลับมาซื้อสินค้าเพิ่มก่อนร้านเริ่มจัดส่ง ซึ่งพบได้บ่อยใน Live/Chat Commerce

### Rule
ห้ามยุบหรือลบ Order ที่ชำระแล้ว เพราะ Payment และ Audit ต้องคงเดิม

เมื่อมีการซื้อเพิ่มหลัง Order แรกชำระแล้ว ให้สร้าง Cart/Order ใหม่ตามปกติ แล้วระบบเสนอ `CONSOLIDATE` หากเข้าเงื่อนไข

### Recommended consolidation eligibility
สามารถรวมเพื่อจัดส่ง/สรุปยอดได้เมื่อ:
- customer เดียวกัน หรือ identity ถูกยืนยันว่าเป็นคนเดียวกัน
- shipping recipient/address เดียวกัน
- Order เดิมยังไม่ `SHIPPED` และยังไม่ปิด fulfillment
- warehouse/fulfillment policy รองรับการแพ็กรวม
- ไม่มีข้อจำกัดจาก provider/shipping label ที่สร้างไปแล้ว หรือสามารถ void/recreate ได้

### Behavior
ตัวอย่าง:
- Order A = 1,000 บาท, PAID
- ลูกค้าซื้อเพิ่ม Order B = 300 บาท

ระบบคง Order A และ Payment 1,000 บาทไว้เดิม
Order B มี amount due = 300 บาท
จากนั้นผูก A + B เข้า `order_consolidation_group` เดียวกัน

Customer-facing UI สามารถแสดง Combined Summary:
- Paid before: 1,000
- New purchase: 300
- Shipping adjustment: +/- X
- Amount due now: Y

### Important
`Combined Summary` เป็นมุมมองรวมเพื่อการขาย/จัดส่ง ไม่ใช่การ rewrite ประวัติ Order เดิม

### ER impact
- `order_groups` หรือ `order_consolidations`
- `order_group_members`
- optional `consolidation_adjustments`
- fulfillment สามารถ reference order group และมี fulfillment_items ที่ย้อนกลับไปยัง original order_items

---

## BR-037 — Consolidated Shipping & Payment Recalculation

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

### Rule
เมื่อหลาย Order ถูกรวมเพื่อจัดส่ง ระบบต้องคำนวณผลต่างค่าส่งอย่างชัดเจนและห้ามแก้ Payment เดิม

### Example A — ลูกค้าจ่ายค่าส่งซ้ำ
Order A: สินค้า 900 + shipping 100 = 1,000 (PAID)
Order B: สินค้า 300 + shipping 100 = 400
หลังรวมพัสดุ ค่าส่งจริงควรเป็น 120

ระบบคำนวณ:
- shipping paid/charged across orders = 200
- consolidated shipping charge = 120
- shipping credit = 80

เครดิต 80 สามารถนำไป:
- หักยอด Order B ที่ยังค้างชำระ
- refund
- store credit (ถ้าเปิดใช้ในอนาคต)
ตาม policy ร้าน

### Example B — รวมแล้วค่าส่งเพิ่ม
หากน้ำหนักรวมทำให้ค่าส่งเพิ่ม ระบบสร้าง additional charge เป็น adjustment ใหม่

### Fulfillment rule
หาก consolidation สำเร็จ:
- สร้าง fulfillment เดียวได้
- fulfillment_items ต้อง trace กลับไปยัง order_items ของทุก Order
- shipment/tracking เดียวสามารถครอบคลุมหลาย Order ได้

### Safety rule
ถ้า Order ใด `SHIPPED` แล้ว ห้ามรวม shipment ย้อนหลัง
ยังสามารถ link ใน CRM/Conversation ว่าเป็น related orders ได้ แต่ไม่ใช่ fulfillment consolidation

### ER impact
- `order_consolidations` / `order_group_members`
- `consolidation_adjustments` หรือ reuse `order_adjustments` พร้อม reference group
- `fulfillment_items.order_item_id` ต้องรองรับหลาย Order ภายใต้ fulfillment เดียว



---

# Business Rule Review v1 — Addendum: Hold, Credit & Loyalty

## BR-038 — Paid Order Hold / Deferred Fulfillment

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

### Business case
ลูกค้าชำระเงินเรียบร้อยแล้ว แต่ต้องการฝากสินค้า/ฝากบิลไว้กับร้านก่อน เช่น:
- รอซื้อสินค้าเพิ่มใน Live หรือ Chat รอบถัดไป
- รอรวมหลาย Order เพื่อประหยัดค่าจัดส่ง
- ยังไม่สะดวกรับสินค้า
- ต้องการให้ร้านส่งในวันที่กำหนด

### Core rule
Order ที่ชำระแล้วสามารถเข้าสถานะ `FULFILLMENT_HOLD` ได้ โดย:
- Payment ยังคงเป็น `PAID`
- Order ยังคงเป็นประวัติการขายเดิม
- Stock ต้องยังถูก `ALLOCATED` ให้ Order นั้น
- สินค้าที่ Hold แล้วห้ามกลับไปเป็น Available Stock
- Warehouse ห้าม Pick/Pack/Ship จนกว่า Hold จะถูก Release

### Hold types
- `CUSTOMER_REQUEST`
- `WAITING_FOR_MORE_ORDERS`
- `SCHEDULED_SHIP_DATE`
- `MANUAL_REVIEW`

### Hold timing
รองรับ:
- manual release
- `hold_until`
- `ship_not_before`

องค์กรสามารถตั้ง:
- `default_max_hold_days`
- reminder ก่อนครบกำหนด
- policy เมื่อเกินกำหนด

ห้าม Auto-Cancel Order ที่ `PAID` เพียงเพราะ Hold หมดเวลา

### Release rule
Hold ถูกปล่อยได้โดย:
- ลูกค้าขอจัดส่ง
- Admin กด Release
- รวม Order เสร็จและลูกค้ายืนยันปิดยอด
- ถึง `ship_not_before` แล้วและ policy อนุญาต

### Relationship with order consolidation
Order ที่ Hold สามารถรวมกับ Order ใหม่ของลูกค้ารายเดียวกันได้ หาก:
- ยังไม่ SHIPPED
- ที่อยู่จัดส่งเข้ากันได้
- warehouse/fulfillment รองรับ
- shipment label เดิมยัง void/recreate ได้ถ้าจำเป็น

### ER impact
เพิ่ม:
- `order_holds`
- fulfillment aggregate status = `ON_HOLD`

---

## BR-039 — Customer Credit Wallet

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

### Definition
Customer Credit คือมูลค่าเงินที่ร้านให้ลูกค้านำไปหักยอดซื้อในอนาคต เช่น:
- ค่าส่งที่ลูกค้าจ่ายเกินหลัง Consolidation
- Refund ที่ลูกค้าเลือกเก็บเป็นเครดิต
- เครดิตชดเชยจาก Customer Service
- Promotional credit

**Credit ไม่ใช่ Loyalty Point**

### Core rule
ห้ามใช้ `customers.credit_balance` เป็น Source of Truth เพียงอย่างเดียว
ต้องใช้ Append-only Credit Ledger

### Credit transaction types
- `CREDIT_ISSUED`
- `CREDIT_USED`
- `CREDIT_REFUNDED`
- `CREDIT_EXPIRED`
- `CREDIT_ADJUSTMENT`
- `CREDIT_REVERSAL`

### Usage rule
เมื่อใช้เครดิตกับ Order:
- สร้าง payment/tender component ชนิด `STORE_CREDIT`
- ห้ามลด `order.total` เพื่อซ่อนการใช้เครดิต
- Amount Due = Order Total - Payments - Applied Credit

### Refund rule
หาก Order ที่ใช้เครดิตถูกยกเลิก/คืน:
- ส่วนที่จ่ายด้วยเครดิตคืนกลับ Credit Wallet ตาม policy
- ส่วนที่จ่ายเงินจริงคืนผ่าน payment method ที่เกี่ยวข้อง
- ต้อง trace source transaction ได้

### Expiry
รองรับทั้งเครดิตไม่หมดอายุและเครดิตที่มี `expires_at`

### ER impact
เพิ่ม:
- `customer_credit_accounts`
- `customer_credit_transactions`
- payment/tender type = `STORE_CREDIT`

---

## BR-040 — Loyalty & Purchase Accumulation

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

### Goal
รองรับการให้รางวัลจากพฤติกรรมซื้อเพื่อสนับสนุนการขายและ CRM โดยไม่ผูกกับเครดิตเงินจริง

### Accumulation dimensions
รองรับจาก:
- ยอดซื้อสุทธิ
- จำนวนชิ้น
- จำนวน Order
- ความถี่การซื้อ
- SKU / Product / Category
- Channel
- Live Session
- Campaign
- ช่วงเวลา
- Customer Segment / Tier

ตัวอย่าง:
- ซื้อครบ 10 ชิ้น รับคูปอง 100 บาท
- ยอดซื้อสะสมครบ 5,000 บาท เลื่อนเป็น VIP
- ซื้อ Category A ครบ 5 ชิ้น ได้ Reward
- ซื้อ 3 ครั้งภายใน 30 วัน ได้โบนัสแต้ม

### Loyalty Point rule
Loyalty Point ต้องมี Ledger แยกจาก Customer Credit

Transaction types:
- `EARN`
- `REDEEM`
- `EXPIRE`
- `ADJUST`
- `REVERSAL`

### Earning trigger
ค่าเริ่มต้น:
- ไม่ Earn ตอนสร้าง Order
- ไม่ Earn ตอน PENDING PAYMENT
- Earn เมื่อ Order ผ่าน trigger ที่กำหนด เช่น `PAID` หรือ `COMPLETED`

### Returns / cancellations
ถ้า Cancel/Refund/Return หลังให้แต้ม:
- สร้าง `REVERSAL`
- ห้ามแก้ transaction เดิม

### Purchase metrics
ควร Derived จาก Order/Order Items:
- lifetime_spend
- lifetime_units
- completed_order_count
- last_purchase_at
- average_order_value

### Tier support
รองรับ custom tiers เช่น:
- MEMBER
- SILVER
- GOLD
- VIP

### ER impact
เพิ่ม:
- `loyalty_programs`
- `loyalty_rules`
- `loyalty_accounts`
- `loyalty_transactions`
- `customer_tiers`
- `customer_tier_history`
- optional `customer_commerce_metrics`

---

## BR-041 — Rewards Must Be Financially Separated

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

ห้ามรวมไว้ใน balance เดียว:
- เงินจ่ายเกิน
- Refund credit
- Promotional store credit
- Loyalty points
- Coupon
- Promotion discount

UI สามารถแสดงรวมใน Customer 360 ได้ แต่ Data Model ต้องแยก

ตัวอย่าง:
- Store Credit: ฿280
- Loyalty Points: 1,450 pts
- Tier: GOLD
- Lifetime Units: 83
- Lifetime Spend: ฿42,590

---

## BR-042 — Held Orders + Purchase Continuation

**Status:** PROPOSED — NEW FROM BUSINESS FEEDBACK

เมื่อลูกค้ามี Paid Order ที่ `ON_HOLD` และเริ่มซื้อใหม่ ระบบต้องแจ้งพนักงานทันที

Quick actions:
- เพิ่มการซื้อครั้งนี้แยก
- รวมเพื่อจัดส่ง
- ดูสินค้าที่ฝากไว้
- ปิดยอดและเตรียมจัดส่ง

การซื้อเพิ่มยังสร้าง Cart/Order ใหม่ตามปกติ
ไม่แก้ Order ที่ชำระแล้ว
เมื่อปิดยอดจึงใช้ Order Consolidation เพื่อรวม Fulfillment

Future extension:
- `Customer Purchase Session`
- `Holding Batch`

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

---

## BR-043 — Scheduled Hold Reminder & Release Review

**Status:** PROPOSED — ADDED FROM BUSINESS REVIEW

### Business case
ลูกค้าชำระเงินแล้วและขอฝากสินค้าไว้ถึงวัน/เวลาที่กำหนด เช่น:
- ฝากไว้ถึงวันสิ้นเดือน
- ให้ส่งหลังวันที่กำหนด
- รอซื้อเพิ่มก่อนวันส่ง
- นัดวันจัดส่งล่วงหน้า

### Core rule
Order ที่ `PAID` และ `FULFILLMENT = ON_HOLD` สามารถกำหนดเวลาได้ผ่าน:
- `hold_until`
- `ship_not_before`
- `reminder_at`

เมื่อถึงกำหนด ระบบ **ห้ามจัดส่งอัตโนมัติทันที**

ระบบต้อง:
1. สร้าง Notification ให้ผู้รับผิดชอบ
2. เปลี่ยน Hold เป็นสถานะ `READY_FOR_REVIEW`
3. ให้ Admin ตรวจสอบก่อนปล่อย Hold

### Admin actions
เมื่อได้รับแจ้งเตือน Admin เลือกได้:
- `RELEASE_HOLD` — เตรียม Fulfillment
- `EXTEND_HOLD` — เลื่อนวันฝาก
- `CONTACT_CUSTOMER` — ติดต่อลูกค้าก่อนส่ง
- `CONSOLIDATE` — รวมกับ Order ใหม่
- `KEEP_ON_HOLD` — ฝากต่อโดยมีเหตุผล

### Reminder policy
องค์กรสามารถตั้ง:
- เตือนล่วงหน้า 1 วัน
- เตือนล่วงหน้า X ชั่วโมง
- เตือนเมื่อถึงกำหนด
- เตือนซ้ำถ้ายังไม่ได้ Review
- Escalate ไป Team Lead เมื่อเกิน SLA

### Data model impact
`order_holds`
- hold_until
- ship_not_before
- reminder_at
- reminder_status
- review_status
- released_at

เพิ่ม Notification Core:
- `notifications`
- `notification_recipients`
- `notification_events` หรือ event reference

Notification Engine ต้อง reusable สำหรับ:
- Scheduled Hold
- Payment Due
- Reservation Expiry
- COD Settlement overdue
- Return inspection pending
- Shipment exception
- SLA / Unanswered conversation

### Future integration
สามารถเพิ่ม Google Calendar Sync ภายหลังได้ แต่ Source of Truth ต้องเป็น Task/Notification Engine ภายในระบบ ไม่ใช่ Calendar ภายนอก


---

# Business Rule Review v1 — Round 3: Promotion, Credit, Loyalty & Purchase Session

## BR-044 — Commercial Calculation Order

**Status:** PROPOSED

เพื่อป้องกันยอดเงินไม่ตรง ระบบต้องใช้ลำดับการคำนวณมาตรฐานเดียวกันทุก Channel

### Recommended calculation order

1. Base Item Price
2. Item-level Promotion
3. Order-level Promotion
4. Coupon
5. Shipping Promotion / Free Shipping
6. Tax calculation (ตาม tax configuration)
7. Loyalty Redemption
8. Store Credit
9. External Payment

### Principle

`Promotion / Coupon / Loyalty Reward` เป็น Benefits/Discount Logic

`Store Credit` เป็น Monetary Tender / Payment Value

ดังนั้น Store Credit **ห้ามถูกคำนวณเป็นส่วนลดของสินค้า**

ตัวอย่าง:

สินค้า                  1,000
Promotion                -100
Coupon                    -50
Shipping                  +60
-----------------------------
Order Total               910

Loyalty Redemption        -50
Store Credit             -200
-----------------------------
Cash / QR Due             660

ในรายงาน:
- Gross / Net Sales ต้องไม่ถูกลดเพราะ Store Credit
- Store Credit ถูกบันทึกใน Payment/Tender Layer

---

## BR-045 — Promotion Stacking Policy

**Status:** PROPOSED

Promotion ทุกตัวต้องกำหนดได้ว่า:
- `stackable`
- `priority`
- `exclusive_group`
- `max_discount_amount`
- `usage_limit`
- `usage_limit_per_customer`
- `minimum_spend`
- `minimum_quantity`
- applicable products/categories/channels/tier

### Conflict resolution

หาก Promotion ขัดกัน:
1. ตรวจ Exclusive Group
2. เลือก Promotion ตาม Priority
3. หาก Priority เท่ากัน ให้ใช้ Benefit ที่ดีที่สุดแก่ลูกค้า หรือ policy ขององค์กร
4. บันทึก Applied Promotion Snapshot ลง Order

ห้ามคำนวณ Promotion ใหม่จาก Rule ปัจจุบันเมื่อตรวจ Order เก่า

---

## BR-046 — Coupon Policy

**Status:** PROPOSED

Coupon ต้องแยกจาก Promotion Rule ทั่วไป เพราะมี Code/Redemption Lifecycle

Coupon รองรับ:
- single-use
- multi-use
- per-customer limit
- start/end time
- minimum spend
- allowed products/categories
- customer segment/tier
- channel restrictions

### Coupon reservation

Coupon ที่ใช้ได้จำกัดจำนวนอาจต้อง `RESERVED` ระหว่าง Checkout และ `CONSUMED` เมื่อ Order Confirmed

ถ้า Order Cancel ก่อน Confirm:
- release coupon reservation

ถ้า Order Cancel หลัง Consumed:
- คืนสิทธิ์หรือไม่ตาม coupon policy

---

## BR-047 — Loyalty Points Are Not Money

**Status:** PROPOSED

Loyalty Points ต้องไม่ถูกเก็บในหน่วยเงินบาทโดยตรง

แต่ละ Program กำหนด Conversion Rule ได้ เช่น:
- 100 points = ฿10 discount
- 1 point per ฿10 spend
- 1 point per unit

### Redemption

ระบบต้องคำนวณ:
- points required
- monetary benefit
- maximum redemption per order
- minimum points threshold

Transaction:
- EARN
- REDEEM
- REVERSAL
- EXPIRE
- ADJUST

Ledger ต้อง Append-only

---

## BR-048 — Loyalty Earning Trigger

**Status:** PROPOSED

ค่าเริ่มต้นที่แนะนำ:

- ไม่ให้แต้มตอน `DRAFT`
- ไม่ให้แต้มตอน `PENDING_PAYMENT`
- ให้แต้มเมื่อ `Payment = PAID`
- สำหรับ COD สามารถตั้งให้ Earn เมื่อ `DELIVERED` หรือ `COD_SETTLED`
- Program สามารถกำหนด Trigger ต่างกันได้

เหตุผล:
หลีกเลี่ยงการแจกแต้มจาก Order ที่ไม่เคยชำระเงินจริง

---

## BR-049 — Loyalty Return / Refund Reversal

**Status:** PROPOSED

เมื่อ Return/Refund:
- คำนวณแต้มที่ควรถูก Reverse เฉพาะส่วนที่คืน
- สร้าง Loyalty Transaction `REVERSAL`
- ห้ามแก้ Transaction EARN เดิม

ถ้าลูกค้าใช้แต้มไปแล้วจน Balance ไม่พอ:
Policy รองรับ:
- Negative balance
- Deduct future earning
- Manual review

ค่าเริ่มต้นแนะนำ:
`Deduct future earning`

---

## BR-050 — Tier Qualification

**Status:** PROPOSED

Customer Tier รองรับเกณฑ์:
- Net Spend
- Units Purchased
- Completed Order Count
- Purchase Frequency
- Rolling period (เช่น 365 วัน)
- Lifetime
- Manual override

### Recommended model

Tier เป็นผลลัพธ์จาก Rule ไม่ใช่ข้อมูลที่พนักงานแก้โดยตรง

Manual override ต้อง:
- permission
- reason
- effective_from / effective_until
- audit log

---

## BR-051 — Customer Credit Source Types

**Status:** PROPOSED

Store Credit อาจเกิดจาก:
- `OVERPAID_SHIPPING`
- `REFUND_TO_CREDIT`
- `SERVICE_COMPENSATION`
- `PROMOTIONAL_CREDIT`
- `MANUAL_ADJUSTMENT`

แต่ละ Source ต้อง trace กลับไปยัง:
- Order
- Return
- Refund
- Consolidation
- Campaign
- Admin action

Manual credit เกิน Threshold ต้องรองรับ Approval Workflow ในอนาคต

---

## BR-052 — Customer Credit Usage

**Status:** PROPOSED

Store Credit:
- ใช้บางส่วนได้
- ใช้หลาย Credit Lots ใน Order เดียวได้
- ใช้ร่วมกับ Promotion/Coupon ได้ตามปกติ
- ใช้หลัง Loyalty Redemption
- ใช้ก่อน External Payment

### Restrictions

ค่าเริ่มต้น:
- ห้ามโอนเครดิตระหว่าง Customer
- ห้ามถอนเป็นเงินสด เว้นแต่เกิดจาก refundable source และ policy อนุญาต
- Promotional Credit อาจมี expiry และ restricted usage
- Refund Credit อาจไม่มี expiry ตาม policy ร้าน

---

## BR-053 — Credit Expiry Allocation

**Status:** PROPOSED

ถ้าลูกค้ามี Credit หลายก้อน:
- ใช้ก้อนที่หมดอายุก่อน (`FEFO: First Expire, First Out`)
- ถ้าวันหมดอายุเท่ากัน ใช้รายการเก่าก่อน (`FIFO`)

ระบบต้องรู้ Source Lot ของ Credit เพื่อ Refund/Reversal ถูกก้อน

---

## BR-054 — Customer Purchase Session

**Status:** PROPOSED — IMPORTANT SOCIAL COMMERCE FEATURE

### Definition

Customer Purchase Session คือ “รอบการซื้อสะสม” ที่สามารถครอบคลุมหลาย Cart/Order ของลูกค้าคนเดียวในช่วงเวลาหนึ่ง

Session ไม่แทนที่ Order
Order แต่ละใบยังคงเป็น Commercial Record ของตัวเอง

### Use cases

- ลูกค้าซื้อหลายรอบระหว่าง Live
- ชำระแล้วฝากไว้ แล้วกลับมาซื้อเพิ่ม
- ซื้อผ่าน Facebook แล้วเพิ่มผ่าน LINE
- รวมหลาย Order ก่อนจัดส่ง
- ปิดรอบการซื้อเมื่อพร้อมส่ง

ตัวอย่าง:

SESSION-0001
Customer: CUS-001

ORD-1001  PAID   ON_HOLD
ORD-1002  PAID   ON_HOLD
ORD-1003  UNPAID

รวมสินค้า 12 ชิ้น
Store Credit ฿80
ยอดต้องชำระเพิ่ม ฿420

### Session statuses

- `OPEN`
- `PENDING_CLOSE`
- `CLOSED`
- `CANCELLED`

### Session close

เมื่อปิด Session ระบบต้อง:
1. ตรวจ Order ที่ยังไม่ชำระ
2. ตรวจ Hold
3. ตรวจ Address
4. ตรวจ Warehouse
5. คำนวณ Consolidated Shipping
6. คำนวณ Amount Due / Credit Difference
7. สร้าง/อัปเดต Consolidation Group
8. เตรียม Fulfillment

---

## BR-055 — Purchase Session Opening Rules

**Status:** PROPOSED

Session เปิดได้จาก:
- เริ่ม Live Session
- Admin เปิดให้ลูกค้า
- ลูกค้ามี Paid Hold แล้วกลับมาซื้อเพิ่ม
- Automation Rule

### Active sessions

Customer สามารถมีหลาย Session ได้ แต่:
- ต่อ Channel/Live Context ควรมี Active Session เดียวโดย default
- Admin สามารถย้าย Order ระหว่าง Session ได้ก่อน Fulfillment เริ่ม
- ทุกการย้ายต้อง Audit

---

## BR-056 — Purchase Session Deadline

**Status:** PROPOSED

Session รองรับ:
- no deadline
- fixed close time
- close at Live end
- inactivity timeout
- manual close

ตัวอย่าง:
`ปิดรอบวันนี้ 18:00`

เมื่อถึงเวลา:
- ห้าม Auto-Ship
- เปลี่ยนเป็น `PENDING_CLOSE`
- แจ้ง Admin
- ตรวจ Outstanding Payment / Hold / Consolidation

---

## BR-057 — Session-Level Shipping Recalculation

**Status:** PROPOSED

เมื่อมีหลาย Order ใน Session:
- ค่าส่งของแต่ละ Order เป็น Historical Charge
- ตอนปิด Session ระบบคำนวณ Consolidated Shipping ใหม่
- ส่วนต่างอาจกลายเป็น:
  - Amount Due
  - Refund
  - Store Credit

ห้ามแก้ Payment เดิมย้อนหลัง

---

## BR-058 — Session-Level Customer Benefit Summary

**Status:** PROPOSED

Customer 360 / Inbox ต้องแสดง Session Summary:
- Orders in session
- Paid / Unpaid
- Held orders
- Total units
- Gross amount
- Discounts
- Shipping paid
- Consolidated shipping estimate
- Store Credit available
- Loyalty points
- Amount due
- Eligible rewards

---

## BR-059 — Loyalty Metric Source of Truth

**Status:** PROPOSED

Metrics สำหรับ Loyalty/CRM เช่น:
- lifetime_spend
- lifetime_units
- order_count
- purchase_frequency

ต้อง Derived จาก Order/Order Item ที่ผ่าน Eligibility Rule

ตัวอย่าง:
`lifetime_units` ไม่ควรรวม:
- Cancelled
- Fully Returned
- Fraud
- Test Orders

Projection/cache ทำได้ แต่ต้อง Rebuild จาก Source Data ได้

---

## BR-060 — Benefit Auditability

**Status:** PROPOSED

ทุก Benefit ต้องตอบได้ว่า:
- ได้มาจาก Rule ไหน
- ใครเป็นผู้ให้
- ใช้กับ Order ไหน
- ใช้ไปเมื่อไร
- ถูก Reverse หรือ Expire เมื่อไร

ครอบคลุม:
- Promotion
- Coupon
- Loyalty Points
- Store Credit
- Tier override
- Manual discount

Manual Discount ต้องมี Permission + Reason + Audit


---

# Business Rule Review v1 — Round 3 Addendum: Prepaid Credit & Mix Promotion

## BR-061 — Prepaid Credit Top-up Campaign

**Status:** PROPOSED

### Business case
ลูกค้าเติมเงินจริงเข้าระบบล่วงหน้า เช่น:
- โอนเงิน 1,000 บาท
- ได้ Store Credit 1,100 บาท
- โบนัสเครดิต 100 บาทใช้ซื้อสินค้าในระบบ
- Campaign อาจจำกัดเฉพาะ Tier เช่น GOLD

### Financial separation
ต้องแยก:
1. `principal_credit` = เงินที่ลูกค้าชำระจริง
2. `bonus_credit` = เครดิตส่งเสริมการขายจากร้าน

ตัวอย่าง:
- เงินเข้าเงินจริง: 1,000
- Principal Credit: 1,000
- Bonus Credit: 100
- Available Credit: 1,100

ห้ามบันทึกว่าร้านได้รับเงิน 1,100 บาท

### Credit lots
ทุก Top-up สร้าง Credit Lot แยก เช่น:
- LOT-A principal 1,000, no expiry
- LOT-B bonus 100, expires_at = campaign expiry

### Usage priority
ค่าเริ่มต้นแนะนำ:
1. Bonus Credit ที่หมดอายุก่อน
2. Bonus Credit อื่น
3. Principal Credit

แต่ Organization สามารถกำหนด Policy ได้

### Eligibility
Campaign รองรับ:
- customer tier
- min top-up
- max bonus
- start/end time
- usage limit
- bonus percentage
- fixed bonus
- allowed products/categories
- excluded products/categories

ตัวอย่าง:
GOLD:
Top-up 1,000 → bonus 100

### Refund / withdrawal
- Principal Credit: อาจ refundable ตาม policy และประวัติการใช้
- Bonus Credit: default = non-refundable / non-withdrawable
- หาก Top-up ถูก chargeback/reversed ต้อง reverse Principal และ Bonus ที่เกี่ยวข้องตาม traceable ledger

### ER impact
เพิ่ม/ขยาย:
- `credit_topup_campaigns`
- `credit_topup_transactions`
- `customer_credit_lots`
- `customer_credit_transactions`
- `credit_lot_allocations`

---

## BR-062 — Promotion Benefit Types

**Status:** PROPOSED

Promotion Engine ต้องรองรับ Benefit หลักแยกประเภท:

- `FIXED_DISCOUNT`
- `PERCENT_DISCOUNT`
- `FIXED_UNIT_PRICE`
- `TIERED_UNIT_PRICE`
- `FREE_SHIPPING`
- `BUY_X_GET_Y`
- `CREDIT_BONUS`
- `COUPON_REWARD`
- `LOYALTY_REWARD`

เหตุผล:
Promotion บางชนิดไม่ได้ “ลดเงิน” แต่เปลี่ยนราคาต่อหน่วย หรือให้สิทธิ์/ของแถม

---

## BR-063 — Mix-and-Match Quantity Qualification

**Status:** PROPOSED — CORE FOR FASHION COMMERCE

### Business case
ลูกค้าซื้อสินค้าคละประเภททั้งร้าน โดยมีเงื่อนไขจำนวนรวมขั้นต่ำ

ตัวอย่าง:
Minimum quantity = 3

- Fashion A001 x1
- Brand A011 x1
- Premium A020 x1

Total qualifying quantity = 3

เมื่อครบเงื่อนไข Promotion ทำงาน

### Qualification scope
Promotion ต้องกำหนดได้ว่า Quantity นับจาก:
- whole store
- selected categories
- selected product groups
- selected SKUs
- selected promotion classes

### Product Promotion Class
แต่ละ Variant สามารถมี Promotion Class เช่น:
- `FASHION`
- `BRAND`
- `PREMIUM`

หรือใช้ configurable promotion class ของ Organization

---

## BR-064 — Mix Fixed Unit Price by Promotion Class

**Status:** PROPOSED

เมื่อ Promotion ผ่าน Qualification แล้ว ระบบปรับราคาต่อหน่วยตาม Promotion Class

ตัวอย่าง:

Qualification:
`total qualifying quantity >= 3`

Price mapping:
- FASHION → 100
- BRAND → 188
- PREMIUM → 240

Cart:
- A001 FASHION x1 → 100
- A011 BRAND x1 → 188
- A020 PREMIUM x1 → 240

Final merchandise total = 528

### Important
นี่คือ `FIXED_UNIT_PRICE` promotion ไม่ใช่ order-level discount

Order Item ต้องเก็บ:
- original_unit_price
- applied_unit_price
- promotion_id
- promotion_rule_id
- price_adjustment_amount

เพื่อ Audit และ Margin Analysis

### Mixed quantities
ถ้า:
- FASHION x2
- BRAND x1
รวม quantity = 3

ทุก qualifying item ได้ price mapping ของ class ตัวเอง

### Exclusions
รองรับ:
- excluded SKU
- excluded Category
- already-on-flash-sale
- non-stackable products

---

## BR-065 — Promotion Repricing Recalculation

**Status:** PROPOSED

Mix Pricing ต้อง recalculated ทุกครั้งที่:
- เพิ่มสินค้า
- ลดจำนวน
- ลบสินค้า
- เปลี่ยน Variant
- Return ก่อน Confirm
- Apply/Remove coupon ที่มี conflict

ตัวอย่าง:
Cart มี 3 ชิ้น → ได้ Mix Price
ลูกค้าลบเหลือ 2 ชิ้น → ไม่ครบเงื่อนไข
ระบบต้องคืน Original/Next Eligible Price อัตโนมัติ

ห้ามแก้ price แบบ permanent บน Product Master

---

## BR-066 — Multi-Threshold Promotion

**Status:** PROPOSED

Promotion Campaign เดียวสามารถมีหลาย Threshold Benefits เช่น:

- ซื้อครบ 3 ชิ้น → Mix Fixed Unit Price
- ซื้อครบ 5 ชิ้น → Free Shipping
- ซื้อครบ 10 ชิ้น → Buy 10 Get 1

แต่แต่ละ Benefit ต้องเป็น Rule/Action แยก เพื่อ Audit ได้

ตัวอย่าง Campaign:
`CAMPAIGN-FASHION-MIX`

Rules:
1. qty >= 3 → fixed unit price mapping
2. qty >= 5 → free shipping
3. qty >= 10 → gift 1 item

---

## BR-067 — Free Shipping Threshold

**Status:** PROPOSED

ตัวอย่าง:
`qualifying_quantity >= 5 → FREE_SHIPPING`

### Scope
รองรับ:
- quantity threshold
- spend threshold
- selected shipping methods
- max shipping subsidy
- selected provinces/zones
- excluded oversized products

### Accounting
Free Shipping ต้องแยก:
- shipping list charge
- shipping discount/subsidy
- customer shipping due

เพื่อวิเคราะห์ต้นทุนขนส่งจริง

---

## BR-068 — Buy X Get Y Reward

**Status:** PROPOSED

ตัวอย่าง:
`qualifying_quantity >= 10 → free_quantity = 1`

Reward item สามารถกำหนดเป็น:
- specific SKU
- selected category
- selected promotion class
- cheapest eligible item in cart
- customer choice from eligible pool

### Recommended default for user case
`cheapest eligible item in cart`

แต่ต้องกำหนด Eligible Scope ชัดเจน

---

## BR-069 — Cheapest Eligible Item Selection

**Status:** PROPOSED

สำหรับ Buy 10 Get 1:
ระบบต้องเลือกสินค้าที่ “มูลค่าต่ำสุด” ตาม Policy

Recommended policy order:
1. ใช้ `applied_unit_price` หลัง Mix Pricing
2. เลือกเฉพาะ eligible item
3. ถ้าราคาเท่ากัน ใช้ deterministic tie-break เช่น line created_at / SKU

ตัวอย่าง:
หลัง Mix Price:
- FASHION = 100
- BRAND = 188
- PREMIUM = 240

ถ้า Eligible ทั้งหมด:
ของแถม = FASHION 100

### Important
ระบบต้องบันทึกว่า:
- reward source line
- reward quantity
- normal price
- reward discount amount
- promotion rule id

ไม่ควรสร้าง Product ราคา 0 แบบไม่มี Reference

---

## BR-070 — Reward Quantity Formula

**Status:** PROPOSED

สำหรับ Campaign แบบ “ครบทุก 10 ชิ้น แถม 1” ต้องกำหนด Policy:

Option A:
- 10–19 = 1 free
- 20–29 = 2 free
- 30–39 = 3 free

Formula:
`floor(qualifying_quantity / 10)`

Option B:
- ต่อ Order ให้สูงสุด 1 ชิ้น

ค่าเริ่มต้นแนะนำ:
Configurable โดย Rule:
- `repeatable = true/false`
- `max_reward_quantity`

---

## BR-071 — Promotion Qualification Quantity

**Status:** PROPOSED

ต้องกำหนดชัดว่า “จำนวนชิ้นที่ใช้ผ่านเงื่อนไข” นับอะไรบ้าง

Default:
นับเฉพาะ:
- active cart/order lines
- quantity > 0
- eligible products

ไม่นับ:
- free reward lines
- cancelled lines
- returned lines
- service fees
- shipping lines

เพื่อป้องกันของแถมถูกนับกลับไปสร้างของแถมเพิ่มแบบ recursive

---

## BR-072 — Promotion Evaluation Phases

**Status:** PROPOSED

Recommended engine phases:

PHASE 1 — Eligibility
- customer/tier
- channel
- campaign period
- product scope

PHASE 2 — Qualification
- quantity
- spend
- classes/categories

PHASE 3 — Repricing
- fixed unit price / tiered unit price

PHASE 4 — Order Benefit
- fixed/percent discount
- coupon

PHASE 5 — Reward
- free item / coupon reward / loyalty reward

PHASE 6 — Shipping Benefit
- free shipping / shipping subsidy

PHASE 7 — Tender
- loyalty redemption
- store credit
- external payment

เหตุผล:
ทำให้ Mix Price, Free Gift และ Free Shipping ไม่คำนวณวนกัน

---

## BR-073 — Promotion Snapshot & Explanation

**Status:** PROPOSED

ทุก Order ต้องสามารถอธิบาย Promotion ให้พนักงานและลูกค้าเข้าใจได้

ตัวอย่าง:
- ซื้อครบ 3 ชิ้น: ใช้ราคา Mix
- FASHION 120 → 100
- BRAND 220 → 188
- PREMIUM 290 → 240
- ซื้อครบ 5 ชิ้น: ส่งฟรี
- ซื้อครบ 10 ชิ้น: แถม FASHION A001 x1

ต้องเก็บ Promotion Snapshot เพื่อไม่ให้ Order เก่าเปลี่ยนเมื่อ Campaign ถูกแก้


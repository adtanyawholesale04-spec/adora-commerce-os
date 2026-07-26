# DESIGN CHANGELOG

## 2026-07-25 — Business Rule Review Round 2

### Added
- BR-021 Partial Stock Fulfillment
- BR-022 Overselling Protection
- BR-023 Reservation Expiry Policy
- BR-024 Order Edit Before Payment
- BR-025 Order Edit After Payment
- BR-026 Partial Payment
- BR-027 COD Payment Model
- BR-028 Order Cancellation Policy
- BR-029 Return Merchandise Authorization (RMA)
- BR-030 Exchange
- BR-031 Return Stock Disposition
- BR-032 RTO (Return to Origin)
- BR-033 Shipment / Fulfillment Split
- BR-034 Stock Allocation vs Reservation
- BR-035 Inventory Adjustment Permission

### Architecture changes proposed for ER v1.1
- Add inventory allocation layer after reservation
- Introduce fulfillments between orders and shipments
- Add order revisions / order adjustments
- Add payment transactions and refund model
- Add COD settlement model
- Add Return/RMA domain supporting customer return and RTO
- Add return inspection/disposition before restocking
- Enforce overselling protection at database transaction layer

### Under Review
- Backorder
- Live reservation expiry policy
- Cancellation/non-refundable fees
- COD remittance reconciliation
- Store credit
- Exchange price difference
- Return eligibility policy
- Promotion allocation during partial refund

## 2026-07-25 — Business Feedback: Deadline & Order Consolidation

### Changed
- BR-023 changed from duration-only reservation timeout to configurable deadline policies: `DURATION`, `FIXED_TIME`, and `SESSION_END`
- Added payment due timestamp at cart/order level so a shop can enforce rules such as "unpaid by 18:00 → cancel"

### Added
- BR-036 Post-Payment Additional Purchase
- BR-037 Consolidated Shipping & Payment Recalculation
- Proposed order consolidation model that preserves original paid orders and payment history while allowing combined fulfillment/shipping

### ER v1.1 impact
- Add `carts.payment_due_at` / `orders.payment_due_at`
- Add `order_consolidations` (or `order_groups`)
- Add `order_group_members`
- Ensure fulfillment items trace back to original order items across multiple orders



### Added — Paid Order Hold, Credit & Loyalty
- BR-038 Paid Order Hold / Deferred Fulfillment
- รองรับ PAID Order ที่ฝากร้านไว้ก่อน โดย Fulfillment = ON_HOLD
- รองรับ hold_until / ship_not_before / manual release
- Held Order สามารถรวมกับการซื้อเพิ่มผ่าน Order Consolidation ได้

- BR-039 Customer Credit Wallet
- แยก Store Credit เป็น monetary ledger
- รองรับเครดิตจากค่าส่งเกิน, refund, compensation และ promotional credit

- BR-040 Loyalty & Purchase Accumulation
- รองรับสะสมจากยอดซื้อ จำนวนชิ้น จำนวน Order ความถี่ SKU/Category/Channel/Live
- เพิ่ม Points Ledger, Tier และ Purchase Metrics
- Return/Cancel ต้อง reverse แต้ม

- BR-041 Rewards Must Be Financially Separated
- แยก Store Credit, Loyalty Point, Coupon และ Promotion ออกจากกัน

- BR-042 Held Orders + Purchase Continuation
- Customer 360 ต้องแจ้งว่ามีบิลชำระแล้วที่ฝากไว้
- การซื้อเพิ่มสร้าง Order ใหม่ แล้ว Consolidate ตอนปิดยอด/จัดส่ง

### Added — Scheduled Hold Reminder
- BR-043 Scheduled Hold Reminder & Release Review
- Paid Order Hold รองรับ `hold_until`, `ship_not_before`, `reminder_at`
- เมื่อถึงกำหนดให้แจ้ง Admin และเปลี่ยนเป็น `READY_FOR_REVIEW`
- ห้าม Auto-Ship ทันที
- เพิ่มแนวคิด Notification Engine กลาง
- เตรียมรองรับ Google Calendar Sync ในอนาคตโดยไม่ใช้ Calendar เป็น Source of Truth


### Added — Business Rule Review Round 3
- BR-044 Commercial Calculation Order
- BR-045 Promotion Stacking Policy
- BR-046 Coupon Policy
- BR-047 Loyalty Points Are Not Money
- BR-048 Loyalty Earning Trigger
- BR-049 Loyalty Return / Refund Reversal
- BR-050 Tier Qualification
- BR-051 Customer Credit Source Types
- BR-052 Customer Credit Usage
- BR-053 Credit Expiry Allocation
- BR-054 Customer Purchase Session
- BR-055 Purchase Session Opening Rules
- BR-056 Purchase Session Deadline
- BR-057 Session-Level Shipping Recalculation
- BR-058 Session-Level Customer Benefit Summary
- BR-059 Loyalty Metric Source of Truth
- BR-060 Benefit Auditability

### Architecture impact
- แยก Pricing / Benefit / Tender layers
- เพิ่ม Customer Purchase Session เป็น orchestration layer
- เตรียม `purchase_sessions` และความสัมพันธ์กับ Orders
- Store Credit ใช้แบบ monetary ledger/tender ไม่ใช่ discount
- Loyalty/Coupon/Promotion ต้อง audit และ reverse ได้


### Added — Advanced Promotion & Prepaid Credit
- BR-061 Prepaid Credit Top-up Campaign
- แยก Principal Credit และ Bonus Credit
- รองรับ Tier eligibility, expiry และ restrictions

- BR-062 Promotion Benefit Types
- BR-063 Mix-and-Match Quantity Qualification
- BR-064 Mix Fixed Unit Price by Promotion Class
- BR-065 Promotion Repricing Recalculation
- BR-066 Multi-Threshold Promotion
- BR-067 Free Shipping Threshold
- BR-068 Buy X Get Y Reward
- BR-069 Cheapest Eligible Item Selection
- BR-070 Reward Quantity Formula
- BR-071 Promotion Qualification Quantity
- BR-072 Promotion Evaluation Phases
- BR-073 Promotion Snapshot & Explanation

### Architecture impact
- Promotion Engine เปลี่ยนเป็น Rule-based Pricing & Reward Engine
- เพิ่ม Promotion Class ระดับ Product Variant
- รองรับ Mix pricing ข้ามสินค้าหลายประเภท
- Campaign เดียวรองรับ 3/5/10-piece threshold actions
- เพิ่ม Prepaid Store Credit Campaign แบบเติมเงินรับ Bonus Credit


### Added — Promotion Test Matrix v1
- เพิ่ม Promotion/Payment/Credit test scenarios 25 กรณี
- ยืนยัน Mix + Free Shipping + Buy X Get Y stacking
- ยืนยัน Principal/Bonus Credit separation
- ระบุ Return/Refund clawback เป็นประเด็นเปิด

### Added Rules
- BR-074 Promotion Qualification Scope
- BR-075 Reward Lines Excluded from Qualification
- BR-076 Promotion Return Policy Required
- BR-077 Promotion Evaluation Log
- BR-078 Confirmed Order Promotion Immutability
- BR-079 Purchase Session Promotion Is Explicit
- BR-080 Manual Discount Governance

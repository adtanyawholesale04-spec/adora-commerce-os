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

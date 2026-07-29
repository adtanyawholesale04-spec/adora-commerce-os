# ADORA Commerce OS (ACOS)
# LIVE COMMERCE MANAGEMENT PLAN

**Document:** `ACOS_LIVE_COMMERCE_MANAGEMENT_PLAN.md`  
**Status:** PRODUCT / SYSTEM PLAN  
**Created:** 2026-07-29  
**Purpose:** แผนละเอียดสำหรับพัฒนา Live Commerce Management โดยเชื่อมกับ Conversation, Product, Inventory, Cart, Purchase Session, Order, Payment, Fulfillment, CRM, Notification และ Review ของ ACOS

---

# 0. Executive Summary

Live Commerce Management ใน ACOS คือระบบช่วยร้านขายผ่าน Live บนช่องทางภายนอก เช่น Facebook Live, TikTok Live, LINE Live, YouTube Live หรือช่องทางอื่น โดย ACOS ไม่จำเป็นต้องสร้าง video streaming platform เองในช่วงแรก

เป้าหมาย:

```text
Live Source
  -> Live-to-Chat Link / Bio Link
  -> Customer Chat Input
  -> CF Parser
  -> Product Code Mapping
  -> Stock / Reservation Decision
  -> Cart / Purchase Session
  -> Payment Link / Checkout
  -> Order
  -> Fulfillment
  -> CRM / Review / Analytics
```

แนวทางที่แนะนำ:

- ทำ **Live Commerce Management** ก่อน
- แยก **Facebook Live Deep Integration** ออกจาก **Live-to-Chat Helper Flow** ให้ชัด
- ให้ **Live-to-Chat Commerce** เป็น MVP หลักสำหรับ TikTok/ช่องทางที่ยังไม่ควรพึ่ง live comment API โดยใช้ลิงก์หน้า bio หรือ short link ให้ลูกค้าเข้ามาพิมพ์รหัสใน ACOS Chat
- ยังไม่ทำ **Own Live Streaming Platform** ใน MVP
- ยังไม่พึ่ง TikTok/YouTube/IG live comment API เป็นแกนหลักของ helper flow
- ใช้ Product, Variant, Inventory, Cart, Order, Payment และ Customer source of truth เดิม
- Live เป็น commerce workflow ไม่ใช่ customer service chat ธรรมดา

---

# 1. Channel Positioning

ACOS มี live commerce 2 รูปแบบที่ต้องแยกกันชัดเจน

## 1.1 Facebook Live Deep Integration

Facebook Live เป็นแกน live commerce หลักที่ระบบ ACOS เดิมตั้งใจรองรับแบบจริงจัง

Positioning:

```text
Facebook Live
  -> Deep integration
  -> Comment/CF ingestion
  -> Parser
  -> Live cart
  -> Cart / Purchase Session
  -> Order / Payment
  -> Fulfillment / CRM
```

ใช้เมื่อ:

- ร้านขายผ่าน Facebook Live เป็นหลัก
- ระบบสามารถดึง/จัดการ comment หรือ CF จาก Facebook ได้
- ต้องการ live console ที่จัดการคอมเมนต์, parser, cart และ order แบบครบ

## 1.2 TikTok Live Helper / Live-to-Chat Flow

TikTok Live Helper คือ flow เสริมสำหรับ TikTok และช่องทางที่การดึง live comment ไม่สะดวกหรือไม่ควรเป็น dependency ของ MVP

Positioning:

```text
TikTok Live
  -> Traffic / discovery
  -> Bio link / profile link
  -> ACOS Live Chat
  -> Customer types product code
  -> Cart / Checkout / Payment in ACOS
```

ใช้เมื่อ:

- ร้านไลฟ์บน TikTok แต่ต้องการปิดยอดใน ACOS
- ไม่ต้องการรอ TikTok Live API/permission
- ต้องการเก็บ customer, cart, payment, CRM และ review ใน ACOS
- ใช้ได้กับ Instagram, YouTube, Facebook หรือช่องทางอื่นในโหมด helper เช่นกัน

## 1.3 Shared Core

ทั้ง Facebook Deep Integration และ TikTok Live-to-Chat ต้องใช้ core เดียวกัน:

- Product / Variant source of truth
- Sale code mapping
- Inventory / stock decision
- Cart / Purchase Session
- Order / Payment
- Customer / Store Membership
- Notification
- Audit / Idempotency
- Analytics

ห้ามสร้าง live commerce stack แยกกันจนข้อมูลซ้ำ

---

# 2. Scope Definition

## 2.1 In Scope

- Live session management
- External live source reference เช่น Facebook/TikTok/LINE/YouTube URL
- Live-to-chat link / bio link
- ACOS live chat order page
- Product/sale code mapping ต่อ live session
- Live comment/message ingestion
- CF parser
- Customer identity matching
- Cart / live cart / purchase session creation
- Stock reservation policy
- Payment deadline policy
- Payment link / checkout link
- Staff live console
- Manual override
- Duplicate/comment replay idempotency
- Live analytics
- Notification/reminder
- Post-live order closing workflow

## 2.2 Out of Scope For MVP

- Own video streaming infrastructure
- In-house video recording/transcoding
- Multi-host livestream studio
- Real-time video chat overlay
- Provider live comment ingestion as MVP dependency
- Creator live revenue share
- Public live replay marketplace
- AI auto-selling agent without human control

---

# 3. Non-Negotiable Rules

## LIVE-001: Do Not Duplicate Core Sources

ห้ามสร้าง Customer, Product, Variant, Inventory, Cart, Order หรือ Payment source ใหม่สำหรับ live

Live ต้อง reference source of truth เดิม

## LIVE-002: Sale Code Is Contextual

`sale_code` / `live_code` ใช้ในบริบทของ live หรือ channel ไม่ต้อง unique ทั้งระบบ

ห้าม resolve sale code แบบ global โดยไม่ดู live/session/channel context

## LIVE-003: Live Commerce Is Separate From Customer Service Chat

Live comment ที่เป็น CF/order intent ต้องเข้าสู่ Live Commerce workflow

Customer service chat ยังอยู่ใน Conversation workflow แต่สามารถ link กันได้ผ่าน customer/conversation/live context

## LIVE-004: Parser Suggests, Domain Logic Confirms

Parser อ่านข้อความและเสนอสินค้า/จำนวนได้ แต่การตัด stock, reserve stock, confirm cart/order ต้องผ่าน domain service ที่ตรวจ rule ได้

## LIVE-005: Idempotency Is Mandatory

Comment ingestion, parser result, cart item creation, order creation และ payment webhook ต้อง idempotent

## LIVE-006: Payment Deadline Must Be Configurable

Deadline ต้องรองรับ:

- duration-based
- fixed clock/date-time
- live-session-end based
- per-session override

## LIVE-007: Paid Orders Are Immutable Commercial Records

ถ้าลูกค้าซื้อเพิ่มหลังจ่ายแล้ว ต้องสร้าง cart/order ใหม่ แล้วค่อย consolidation ภายหลัง ห้าม rewrite paid order เดิมแบบ silent update

---

# 4. Core User Roles

## 4.1 Store Owner

- สร้าง live session
- ตั้งค่า channel/source
- เลือกสินค้าเข้ารอบ live
- ตั้ง sale code
- ตั้ง reservation/payment deadline
- ดูยอดขาย live
- ปิด live และสรุปยอด

## 4.2 Live Seller / Host

- ดูสินค้าและ code ระหว่าง live
- pin/announce product
- ดูยอด CF แบบ realtime/near realtime
- แจ้งลูกค้าให้ชำระเงิน

## 4.3 Live Admin / Staff

- ตรวจ comment
- แก้ parser result
- approve/reject cart item
- merge/match customer
- ส่ง payment link
- handle stock decision
- assist customer

## 4.4 Customer

- comment CF เช่น `CF A01 2`
- รับ reply/payment link
- ชำระเงิน
- ดู order status
- ซื้อเพิ่มระหว่าง live ได้
- ได้รับ review invitation หลัง order สำเร็จ

## 4.5 Platform Owner

- คุม feature entitlement
- monitor live volume/cost
- ดู error/fraud/idempotency
- คุม integration provider status

---

# 5. Live Commerce Flow

## 5.1 Pre-Live Setup

```text
Create Live Session
  -> Select Channel / Source
  -> Add Live URL / External ID
  -> Select Products / Variants
  -> Assign Sale Codes
  -> Set Price/Promotion Visibility
  -> Set Reservation Policy
  -> Set Payment Deadline
  -> Publish Live Announcement
  -> Enable Reminder / Notification
```

ต้องมี:

- live title
- start time / end time
- channel
- external live id/url
- product list
- code mapping
- stock policy
- payment due policy
- staff assignment

## 5.2 During Live

```text
Comment Arrives
  -> Store Raw Event
  -> Normalize Message
  -> Match Live Session
  -> Parse CF Intent
  -> Resolve Sale Code
  -> Match Customer Identity
  -> Validate Stock / Rule
  -> Create or Update Cart
  -> Add to Purchase Session
  -> Reply / Notify Customer
```

Staff ต้องเห็น:

- raw comment
- parsed intent
- matched product
- requested quantity
- stock status
- customer match confidence
- cart/order status
- action required

## 5.3 Checkout / Payment

```text
Cart Ready
  -> Generate Checkout / Payment Link
  -> Send Reply / DM / Notification
  -> Customer Pays
  -> Payment Webhook / Manual Confirmation
  -> Order Confirmed
  -> Stock Allocation
  -> Fulfillment Queue
```

ต้องแยก:

- cart status
- order status
- payment status
- fulfillment status

## 5.4 Post-Live Closing

```text
Live Ends
  -> Close Comment Intake
  -> Apply Grace Period
  -> Expire Unpaid Carts/Orders
  -> Release Reservation
  -> Summarize Outstanding Payments
  -> Consolidate Eligible Orders
  -> Fulfillment Handoff
  -> Analytics Snapshot
  -> Review Invitation
```

---

# 6. Live-to-Chat Commerce Model

Live-to-Chat Commerce คือ MVP หลักที่แนะนำสำหรับ ACOS เพราะไม่ต้องรอ provider live comment API และใช้ได้กับ TikTok, Facebook, YouTube, Instagram หรือช่องทาง live ใดก็ได้

## 6.1 Concept

ร้านไลฟ์บนแพลตฟอร์มภายนอก แล้วแจ้งลูกค้าให้กดลิงก์ใน bio/profile/comment/pinned post เพื่อเข้ามาที่ ACOS Chat

Flow:

```text
Store starts TikTok/Facebook/YouTube Live
  -> Host announces: กดลิงก์หน้าโปรไฟล์ แล้วพิมพ์รหัสสินค้า
  -> Customer opens ACOS live chat link
  -> Customer types A01 2
  -> ACOS resolves live session from link
  -> CF parser reads product code and quantity
  -> ACOS validates stock/promotion
  -> ACOS creates cart/draft bill
  -> ACOS replies with item summary, total, shipping/payment details
  -> Customer confirms
  -> ACOS sends checkout/payment link
  -> Order/payment/fulfillment continue in Commerce Core
```

## 6.2 Live Chat Link

Example:

```text
adora.app/l/{store_slug}
adora.app/chat/{store_slug}?live={live_session_id}
adora.app/live/{live_slug}/chat
```

Link ต้อง resolve:

- organization_id
- store
- active live session
- channel/source
- sale code mapping
- default payment deadline
- tracking source เช่น TikTok bio, YouTube description, Facebook pinned comment

## 6.3 ACOS Live Chat Page

หน้า chat ต้อง mobile-first และเร็วมาก

ควรมี:

- store name/logo
- live session title
- short instruction
- examples เช่น `พิมพ์ A01 2`
- input box
- quick product/code board
- cart summary
- checkout button
- customer login/guest checkout handoff
- stock/promo response
- payment status

## 6.3.1 Quick Product / Code Board Source

รายการสินค้ากำลังไลฟ์แบบกดเร็วต้องดึงจาก ACOS ใน MVP

Source:

```text
ACOS Product Catalog
  -> Product Variant
  -> Live Product Assignment
  -> Sale Code Mapping
  -> Quick Product / Code Board
```

ไม่ใช้ TikTok cart / TikTok Shop cart เป็น source หลักใน MVP

เหตุผล:

- ACOS ต้องเป็น source of truth ของ cart, checkout, order, CRM และ review ใน flow นี้
- ไม่ต้องรอ TikTok Shop API/permission
- stock, price, promotion และ payment rule อยู่ใน ACOS
- live code เช่น `A01` ต้อง resolve กับ product variant ใน live session ของ ACOS
- ลดความเสี่ยงข้อมูลสินค้า/ราคา/สต็อกไม่ตรงกันระหว่าง TikTok กับ ACOS

อนาคตสามารถเพิ่ม TikTok Shop sync ได้:

```text
TikTok Shop Product
  -> Sync / Map to ACOS Product Variant
  -> Use in ACOS Live Product Assignment

TikTok Shop Order
  -> Sync back to ACOS
  -> CRM / Fulfillment / Review / Analytics
```

แต่ใน Live-to-Chat MVP:

```text
TikTok/Facebook/YouTube/IG = traffic + live discovery
ACOS = product board + cart + checkout + payment + CRM
```

## 6.4 Chat Response Examples

เมื่อลูกค้าพิมพ์:

```text
A01 2
```

ระบบตอบ:

```text
เพิ่มสินค้าแล้ว
A01 กระเป๋าสีดำ x2
ราคาสินค้า 1,980 บาท
ค่าส่ง 50 บาท
รวม 2,030 บาท

[ยืนยันสั่งซื้อ] [ดูตะกร้า] [เพิ่มสินค้า]
```

ถ้าสต็อกไม่พอ:

```text
A01 เหลือ 1 ชิ้น
คุณต้องการรับ 1 ชิ้นก่อนหรือรอสินค้า?

[รับ 1 ชิ้น] [รอสินค้า] [ยกเลิก]
```

ถ้ารหัสผิด:

```text
ยังไม่พบรหัส A99 ในไลฟ์นี้
ลองตรวจรหัสอีกครั้ง หรือกดดูสินค้าที่กำลังไลฟ์

[ดูรหัสสินค้าทั้งหมด]
```

## 6.5 Why This Is Primary MVP

ข้อดี:

- ไม่ต้องพึ่ง TikTok/YouTube/Facebook live chat API ใน MVP
- ใช้กับทุก live platform ได้
- ลูกค้าเข้ามาใน ACOS เอง จับ customer identity ได้ง่ายขึ้น
- checkout/payment/order/CRM/review เชื่อมตรง
- ใช้ parser เดียวกับ live/chat commerce
- ลดความเสี่ยง provider permission, quota และ policy

ข้อควรระวัง:

- UX ต้องเร็วมากบนมือถือ
- ต้องรองรับ guest checkout ก่อนบังคับสมัคร
- link ต้องจำ live session context ได้ถูกต้อง
- ต้องกันรหัสผิด/รหัสหมด/รหัสซ้ำใน session
- ต้องมี payment deadline และ stock reservation ชัด

---

# 7. YouTube Live Integration Models

YouTube Live สามารถเชื่อมกับ ACOS ได้ 3 รูปแบบหลัก

## 7.1 Model A: YouTube Watch Page + YouTube Chat Ingestion

ลูกค้าอยู่บน YouTube และพิมพ์ CF ใน YouTube Live Chat

Flow:

```text
Store starts YouTube Live
  -> Customer watches on YouTube
  -> Customer types in YouTube chat: CF A01 2
  -> ACOS reads YouTube live chat through provider integration
  -> Store raw chat event
  -> Normalize message
  -> CF Parser
  -> Resolve sale code
  -> Create/update live cart
  -> Staff sends or system generates payment link
```

ต้องมี:

- YouTube channel connection / OAuth
- live video id / broadcast id
- live chat id
- chat message polling or supported ingestion method
- raw event store
- duplicate protection
- rate limit/quota monitoring
- parser queue
- payment link reply/notification workflow

ข้อดี:

- ลูกค้าอยู่ใน YouTube ตามธรรมชาติ
- เหมาะกับร้านที่มีผู้ติดตามบน YouTube อยู่แล้ว
- MVP provider integration เข้าใจง่าย

ข้อจำกัด:

- ต้องพึ่ง YouTube API/policy/quota
- customer identity จาก YouTube ยังไม่เท่ากับ customer account ใน ACOS
- payment link ต้องพาลูกค้าออกจาก YouTube เพื่อ checkout/identify
- reply ใน YouTube chat ต้องระวัง spam และสิทธิ channel

## 7.2 Model B: YouTube Video Embed + ACOS Live Storefront

ร้านยังไลฟ์บน YouTube แต่ลูกค้าเข้ามาดูผ่านหน้า live storefront ของ ACOS

Flow:

```text
Store starts YouTube Live
  -> ACOS Live Storefront embeds YouTube player
  -> Customer watches inside ACOS storefront
  -> Customer uses ACOS product panel / ACOS chat / Add to cart
  -> Cart / checkout / payment happen inside ACOS
  -> Order, CRM, review, attribution are linked directly
```

หน้า ACOS Live Storefront ควรมี:

- embedded YouTube video
- pinned products
- sale code board
- product panel
- ACOS live chat or CF input
- add to cart
- checkout
- payment status
- customer account/login

ข้อดี:

- ACOS คุม cart, checkout, payment, coupon, points และ customer identity ได้ดีกว่า
- attribution และ order trace ง่ายกว่า
- ไม่ต้องพึ่ง YouTube chat เป็น order intent หลัก

ข้อจำกัด:

- ต้องพาลูกค้าออกจาก YouTube watch page มาอยู่ใน ACOS
- engagement บางส่วนอาจยังอยู่ใน YouTube chat
- ต้องออกแบบ mobile live storefront ให้ใช้ง่ายมาก

## 7.3 Model C: Hybrid YouTube Live

แนะนำเป็นทิศทางระยะยาว

```text
YouTube Watch Page
  -> YouTube chat ingestion
  -> CF parser
  -> Live cart/payment link

ACOS Live Storefront
  -> YouTube video embed
  -> ACOS product panel/chat/cart
  -> Checkout/payment

Both paths
  -> Same live session
  -> Same sale code mapping
  -> Same customer/order/payment source of truth
  -> Same analytics
```

ข้อดี:

- ไม่ทิ้งคนดูที่อยู่บน YouTube
- เปิดทางให้ลูกค้าที่พร้อมซื้อเข้ามา checkout ใน ACOS
- ค่อย ๆ ย้าย conversion เข้าระบบเราโดยไม่บังคับลูกค้าทันที

Recommendation:

```text
MVP:
  YouTube URL + manual comment entry/import

Next:
  YouTube chat ingestion

Then:
  ACOS Live Storefront with YouTube embed + product panel

Long term:
  Hybrid analytics and unified conversion tracking
```

---

# 8. Message / CF Parser

## 8.1 Supported MVP Patterns

```text
CF A01
CF A01 2
cf a01
เอา A01
รับ A01 2
A01 2
จอง A01
```

Parser output:

```text
intent: buy | reserve | unknown
sale_code: A01
quantity: 2
confidence: 0.0-1.0
raw_text: original comment
requires_staff_review: true/false
```

## 8.2 Parser Rules

- normalize case
- trim spaces
- support Thai/English keywords
- default quantity = 1
- reject ambiguous multi-code unless supported
- never confirm stock directly
- keep raw text and parser version
- staff can override parser result

## 8.3 Later Parser Enhancements

- multiple items in one comment
- promotion code in comment
- natural language intent
- typo tolerance
- spam detection
- duplicate comment grouping
- AI-assisted parsing with human confirmation

---

# 9. Product / Sale Code Mapping

Sale code ต้อง map กับ product variant ใน context ของ live

Example:

```text
Live Session 001
  A01 -> product_variant_id: bag-black-small
  A02 -> product_variant_id: bag-brown-small

Live Session 002
  A01 -> product_variant_id: serum-30ml
```

Rules:

- duplicate active sale code ใน live session เดียวกันห้ามเกิด
- sale code ใช้ซ้ำข้าม live ได้
- quick product/code board ต้องสร้างจาก live product assignments ของ ACOS
- TikTok cart หรือ external platform cart ห้ามเป็น source หลักของ sale code mapping ใน MVP
- external shop product sync ต้อง map กลับเป็น ACOS product_variant_id ก่อนใช้งานใน live cart
- cart/order ต้อง reference variant_id ไม่ใช่ sale code อย่างเดียว
- order item ต้องเก็บ sale code snapshot เพื่อ trace กลับ live ได้
- staff ต้องเห็น conflict ก่อนเริ่ม live

---

# 10. Stock / Reservation Policy

## 10.1 Reservation Modes

- no reservation until checkout
- reserve on valid CF
- reserve on staff approval
- reserve on checkout started
- reserve until live session end
- reserve until fixed payment deadline

## 10.2 Stock Decision States

```text
AVAILABLE
RESERVED
PARTIAL_AVAILABLE
OUT_OF_STOCK
NEEDS_STOCK_DECISION
BACKORDER_ALLOWED
REJECTED
```

## 10.3 Important Rule

ถ้าลูกค้าขอจำนวนมากกว่า stock:

- ห้ามลด quantity อัตโนมัติโดยไม่บอก
- ต้องแยก requested quantity กับ allocatable quantity
- staff หรือ customer ต้องตัดสินใจว่าจะรับจำนวนที่มี รอสินค้า หรือยกเลิก

---

# 11. Customer Identity Matching

Live comment identity ไม่เท่ากับ customer account

ต้องรองรับ:

- external platform user id
- display name
- profile url/avatar ถ้ามี
- phone/email ที่ลูกค้าให้ภายหลัง
- customer account link
- store membership link
- conversation identity link

Match states:

```text
unknown
possible_match
matched_existing_customer
new_customer_created
needs_verification
merged
```

Rules:

- ห้าม merge customer อัตโนมัติแบบเสี่ยง
- staff ต้องเห็น confidence/เหตุผล
- private customer data ห้ามแสดงใน live public surface
- การสร้าง customer ใหม่ต้องผูก organization_id

---

# 12. Live Cart / Purchase Session

Live cart ควรเข้าสู่ Customer Purchase Session เพื่อรองรับพฤติกรรมซื้อสะสม

ต้องรองรับ:

- ลูกค้า CF หลายครั้ง
- ลูกค้าซื้อเพิ่มหลังจ่ายแล้ว
- unpaid cart
- paid order hold
- consolidated shipping
- session deadline
- session-level summary

Rules:

- Purchase Session ไม่แทน Order
- Paid Order ห้าม rewrite
- ซื้อเพิ่มหลัง paid order ต้องสร้าง cart/order ใหม่
- consolidation เป็น fulfillment/shipping view ไม่ใช่การลบ/รวม order history

---

# 13. Staff Live Console

ควรมีหน้าจอหลักสำหรับทีมขาย/แอดมิน live

Sections:

- live session header
- product code board
- incoming comments
- parsed CF queue
- action required queue
- carts/orders panel
- customer match panel
- stock warning panel
- payment pending panel
- staff assignment
- analytics mini dashboard

Actions:

- approve parsed item
- edit product/quantity
- reject comment
- create cart manually
- send payment link
- mark manual payment review
- match/merge customer
- reserve/release stock
- add note
- escalate to staff

---

# 14. Notifications / Replies

Message types:

- CF received
- item added to cart
- stock not enough
- payment link ready
- payment reminder
- payment success
- order confirmed
- live ending soon
- unpaid cart expiring
- review invitation

Rules:

- provider delivery goes through messaging boundary
- marketing/reminder must check consent where required
- transactional payment/order message can follow transactional policy
- every delivery attempt must be logged
- provider cost must be metered

---

# 15. Analytics

Store dashboard:

- live sessions count
- comments ingested
- CF parsed
- CF conversion rate
- top products
- carts created
- orders created
- paid GMV
- unpaid cart value
- payment conversion
- stock-out lost demand
- staff response time
- customer repeat/live purchase behavior

Platform dashboard:

- live sessions active
- provider integration health
- message volume
- parser error rate
- idempotency duplicate rate
- GMV from live
- payment pending risk
- top stores by live GMV
- provider cost

---

# 16. Recommended Live Database Build Order

ลำดับนี้ใช้สำหรับสร้างฐานข้อมูล Live Commerce โดยยึดว่า Facebook Live deep integration เป็น core เดิม และ Live-to-Chat เป็น helper flow สำหรับ TikTok/ช่องทางที่ API ไม่พร้อม

## 16.1 Live Session + Product Code Foundation

ทำก่อนทุกอย่าง

ควรสร้าง:

- live session
- live source
- live product assignment
- live sale code assignment
- live staff assignment

ต้อง reference:

- organization_id
- product_variant_id
- existing product/inventory source

ยังไม่ทำ:

- provider comment ingestion
- external cart sync
- own streaming

## 16.2 Live-to-Chat Foundation

ทำเป็น MVP helper สำหรับ TikTok/ช่องทางอื่น

ควรสร้าง:

- live chat link
- live chat session
- live chat message
- live chat parser result

ต้องรองรับ:

- link resolves active live session
- tracking source เช่น TikTok bio, YouTube description, Facebook pinned comment
- guest customer starts cart
- parser maps code to ACOS live product assignment

ยังไม่ทำ:

- TikTok live comment ingestion เป็น dependency
- TikTok cart เป็น source หลัก

## 16.3 Cart / Checkout / Payment Bridge

เชื่อม Live-to-Chat กับยอดขายจริง

ควรใช้ source เดิม:

- cart
- purchase session
- order
- payment
- inventory reservation

ควรเพิ่มเฉพาะ bridge/reference:

- live cart reference
- checkout session reference
- payment link reference
- live attribution event

## 16.4 Provider Comment Ingestion

ทำหลัง Live-to-Chat MVP ทำงานแล้ว

ควรสร้าง:

- provider connection
- raw integration event
- normalized live comment
- provider cursor/checkpoint
- ingestion health

ใช้กับ:

- Facebook deep integration
- YouTube chat ingestion
- provider อื่นเมื่อ API/permission พร้อม

## 16.5 External Shop Sync

ทำเมื่อร้านต้อง sync TikTok Shop หรือ external shop จริง

ควรสร้าง:

- external shop product mapping
- external shop order sync
- sync status/error log

ต้อง map กลับเข้า ACOS:

- product_variant_id
- customer/order/payment source

---

# 17. Data Domains

Suggested entities:

```text
Live Session
Live Source
Live Chat Link
Live Chat Session
Live Chat Message
Live Chat Parser Result
Live Provider Connection
YouTube Broadcast Link
YouTube Live Chat Cursor
Live Product Assignment
Live Sale Code Assignment
External Shop Product Mapping
External Shop Order Sync
Live Comment Event
Live Comment Normalized Message
Live Parser Result
Live Cart
Live Cart Item
Purchase Session
Customer Identity Link
Conversation Link
Stock Reservation
Checkout Session
Payment Link
Payment Transaction
Order
Order Item
Live Staff Assignment
Live Reply Job
Live Storefront Page
Live Embedded Player
Live Analytics Snapshot
Integration Event
Idempotency Key
Audit Log
```

Notes:

- live-owned data ต้องมี `organization_id`
- live chat link ต้อง resolve live session context และ tracking source ได้
- live chat session/message ต้องแยกจาก provider raw comment แต่สามารถใช้ parser เดียวกันได้
- quick product/code board ต้องอ่านจาก ACOS live product assignments
- external shop sync เป็น integration layer และต้อง map กลับเข้า ACOS product/order source ก่อนใช้กับ live commerce
- raw provider event ต้องเก็บเพื่อ replay/debug
- YouTube integration ต้องเก็บ external video/broadcast/chat identifiers เท่าที่จำเป็น
- Live Storefront embed ต้องใช้ live session เดียวกับ YouTube chat ingestion เพื่อรวม analytics
- parser result ต้องเก็บ parser version
- order item ต้อง trace กลับ live session/comment/sale code ได้
- payment/order source ใช้ Commerce Core เดิม

---

# 18. Events

Recommended events:

```text
live_session_created
live_session_started
live_session_ended
live_chat_link_created
live_chat_opened
live_chat_message_received
live_chat_cf_detected
live_product_assigned
live_comment_ingested
live_comment_parsed
live_cf_detected
live_cart_created
live_cart_item_added
live_stock_decision_required
live_payment_link_sent
live_payment_due_reminder_sent
live_order_created
live_order_paid
live_unpaid_cart_expired
live_stock_reservation_released
live_session_closed
live_review_invitation_sent
```

---

# 19. Feature Entitlement

Live Commerce ควรถูกคุมด้วย plan/feature flag:

- live_commerce
- live_comment_ingestion
- live_to_chat
- live_chat_link
- live_chat_checkout
- live_parser
- live_staff_console
- live_payment_link
- live_analytics
- live_reminder
- live_provider_facebook
- live_provider_tiktok
- live_provider_line
- live_provider_youtube

---

# 20. Development Phases

## Phase L0: Live Foundation

Goal: วาง foundation โดยไม่ต่อ provider จริงก่อน

Deliverables:

- live session model
- live chat link model
- live product/code assignment
- sale code uniqueness by live session
- reservation/payment deadline policy fields
- staff assignment concept
- audit/event baseline

Exit gate:

- ไม่สร้าง product/order/customer ซ้ำ
- sale code resolve ด้วย live context
- live chat link resolves organization/store/live context
- tenant isolation ชัด

## Phase L1: Live-to-Chat MVP

Goal: ให้ร้านไลฟ์บนแพลตฟอร์มใดก็ได้ แล้วให้ลูกค้ากดลิงก์ bio/profile เข้ามาพิมพ์รหัสสินค้าใน ACOS Chat เพื่อเปิดบิลและปิดยอด

Deliverables:

- create live session
- assign products/codes
- generate live chat link
- ACOS mobile live chat page
- customer message input
- live chat message store
- CF parser
- parsed cart suggestion
- cart summary reply
- customer confirm action
- create cart/draft order
- basic payment link/checkout handoff
- staff console sees chat/cart/order activity

Optional MVP support:

- manual comment entry for staff
- staff approval queue for low-confidence parser results

Exit gate:

- parser ไม่ confirm order เอง
- chat link must preserve live context
- cart/order ผ่าน domain rule
- guest customer can start cart without long signup
- idempotency กัน chat message/manual entry ซ้ำ

## Phase L2: Payment Link + Purchase Session

Goal: ปิดยอดจาก live ได้เป็นระบบ

Deliverables:

- live cart to checkout/payment link
- live chat to checkout session
- purchase session grouping
- payment due policy
- unpaid cart expiry
- paid order hold support
- order consolidation signal

Exit gate:

- paid order immutable
- payment state แยกจาก order state
- expired unpaid cart release stock ตาม rule

## Phase L3: Provider Comment Ingestion

Goal: เชื่อม provider comment ingestion เป็นทางเลือกหลัง Live-to-Chat MVP ทำงานแล้ว

Recommended first provider:

```text
YouTube Live or Facebook Live after manual CSV/import is validated
```

Deliverables:

- provider adapter
- raw integration event store
- normalized live comment
- polling/webhook ingestion
- YouTube live video/broadcast/chat id resolution when YouTube is selected
- duplicate protection
- reconnect/retry
- provider health dashboard

Exit gate:

- raw event replay ได้
- ingestion failure ไม่สร้าง order ซ้ำ
- provider cost/rate limit monitored
- provider ingestion is not required for Live-to-Chat checkout path

## Phase L4: Advanced Live Operations

Deliverables:

- live dashboard realtime/near realtime
- staff assignment queue
- customer matching workflow
- stock decision workflow
- automated transactional replies
- chat automation improvements
- live chat customer identity matching
- payment reminders
- post-live close workflow
- live analytics snapshot

## Phase L5: Multi-Provider + Community Integration

Deliverables:

- TikTok/LINE/YouTube adapters
- live announcement content
- live reminder requests
- ACOS live storefront landing
- YouTube video embed on live storefront
- ACOS product panel / sale code board
- ACOS cart entry from embedded live page
- post-live review invitation
- live product discovery in community
- live replay link/reference if external recording exists

## Phase L6: Own Storefront Live Streaming

Only consider after L1-L5 are validated

Deliverables:

- embedded player or own streaming provider
- storefront live room
- realtime chat
- pinned products
- in-room cart
- moderation
- recording/replay policy

---

# 21. Open Decisions

1. Live chat link URL pattern จะใช้แบบใด: `/l/{store}`, `/chat/{store}?live=...`, หรือ `/live/{slug}/chat`
2. ลูกค้าใน Live-to-Chat MVP จะเริ่มแบบ guest checkout ได้หรือบังคับ login ก่อน
3. ต้องขอ phone/OTP ตอนไหน: ก่อนเปิดบิล, ก่อนชำระเงิน, หรือหลังเลือกสินค้า
4. Chat parser จะ auto-add to cart ทันที หรือแสดง suggestion ให้ลูกค้ากดยืนยันก่อน
5. Staff ต้อง approve ทุกรายการหรือเฉพาะ low-confidence/stock issue
6. CF syntax MVP จะรองรับกี่รูปแบบ
7. Reservation จะเกิดตอน parser detect, customer confirm, checkout started หรือ payment started
8. Payment deadline default ของ live คือกี่นาทีหรือปิดตาม live end
9. Live cart จะ auto-create order หรือรอ customer confirm
10. Payment link จะส่งใน ACOS chat อย่างเดียว หรือส่ง SMS/LINE/email ด้วย
11. Manual payment confirmation ต้องมี approver หรือไม่
12. Chat message retention policy กี่วัน/เดือน/ปี
13. Provider comment ingestion จะเริ่ม phase ใดหลัง Live-to-Chat MVP
14. Provider แรกคือ Facebook, TikTok, LINE หรือ YouTube
15. TikTok Shop product/order sync จะอยู่ phase ใด และร้านใดต้องใช้
16. ถ้ามี external shop product อยู่แล้ว จะ map กับ ACOS product variant ด้วย manual mapping หรือ auto matching
17. ถ้าเลือก YouTube ก่อน จะเริ่มจาก manual import, YouTube chat ingestion หรือ ACOS Live Storefront embed
18. YouTube customer จะ checkout ผ่าน payment link, ACOS login, หรือ guest checkout
19. YouTube chat reply จะส่งกลับใน public chat, DM/notification, หรือให้ staff ส่งเอง
20. ACOS Live Storefront จะใช้ ACOS chat/input เอง หรือดึง YouTube chat มาแสดงด้วย
21. Hybrid analytics จะนับคนจาก provider chat และ ACOS storefront อย่างไรไม่ให้ซ้ำ
22. Raw provider event retention policy กี่วัน/เดือน/ปี
23. Staff override ต้อง audit action ใดบ้าง
24. จะรองรับการซื้อเพิ่มหลัง paid order ด้วย hold/consolidation ตั้งแต่ phase ใด
25. Provider API/rate limit cost จะคิดรวม plan หรือ metered usage
26. Own storefront live streaming จะถูกพิจารณาหลังมี GMV/live volume เท่าไร

---

# 22. MVP Recommendation

MVP ที่ควรเริ่มก่อน:

```text
Phase L0 + L1 Live-to-Chat + บางส่วนของ L2
```

MVP feature set:

- create live session
- assign product variants to sale codes
- generate live chat/bio link
- mobile ACOS live chat page
- customer types product code
- CF parser
- cart summary response
- customer confirm action
- create cart/draft order
- payment deadline
- basic payment link/check-out handoff
- live order dashboard
- basic analytics

เหตุผล:

- ไม่ติด permission/provider API ตั้งแต่แรก
- ทดสอบ business rule ได้ครบ
- ร้านเริ่มใช้กับ TikTok/Facebook/YouTube/IG Live ได้ทันทีโดยให้ลูกค้ากดลิงก์ bio/profile
- ลดความเสี่ยงเรื่อง duplicate order และ stock
- พร้อมต่อ Facebook/TikTok ingestion ภายหลัง

---

# 23. Validation Gates

ต้องทดสอบ:

- sale code duplicate within live session
- sale code reuse across live sessions
- parser confidence / staff review
- duplicate comment idempotency
- requested quantity > available stock
- cart/order creation through domain service
- payment deadline expiry
- stock reservation release
- paid order immutable after additional purchase
- tenant isolation
- staff permission
- audit log for override
- provider event replay does not duplicate cart/order

# ADORA Commerce OS (ACOS)
# CUSTOMER COMMUNITY COMMERCE GROWTH GUIDE

**Project Name:** ADORA Commerce OS  
**Short Name:** ACOS  
**Document:** `ACOS_CUSTOMER_COMMUNITY_COMMERCE_GROWTH_GUIDE.md`  
**Status:** PRODUCT / SYSTEM GROWTH GUIDE  
**Created:** 2026-07-28  
**Purpose:** ใช้เป็นคู่มือพัฒนาระบบ Customer Portal, Community, Verified Review, Affiliate Commission, Messaging และ Monetization จากเล็กไปใหญ่ โดยต่อยอดจากระบบ ACOS ที่กำลังพัฒนาอยู่

---

# 0. Executive Summary

ไอเดียนี้คือการต่อยอด ACOS จากระบบหลังบ้านร้านค้า ไปเป็นระบบที่ลูกค้าปลายทางเข้ามามีตัวตนและมีปฏิสัมพันธ์ในระบบได้

เป้าหมายระยะยาว:

```text
ร้านค้าเช่าระบบ
  -> มี CRM / Product / Order / Promotion / Payment / Fulfillment
  -> ลูกค้าของร้านมี Customer Portal ของตัวเอง
  -> ลูกค้าสามารถเขียนโพสต์ รีวิวสินค้า และสร้างตัวตนใน Community
  -> รีวิวที่ผูกกับการซื้อจริงสามารถสร้างยอดขายใหม่
  -> ผู้รีวิวได้รับค่าคอมมิชชั่น
  -> เจ้าของระบบสร้างรายได้เพิ่มจาก add-on, take rate, ads, messaging usage และ analytics
```

แนวทางสำคัญคือเริ่มเล็กก่อน โดยไม่สร้าง marketplace เต็มรูปแบบตั้งแต่วันแรก ให้เริ่มจาก trust layer: ลูกค้าจริง, ออเดอร์จริง, รีวิวจริง, ค่อยต่อยอดเป็น community และ commerce network

---

# 1. Product Positioning

โมดูลนี้ควรถูกมองเป็นส่วนหนึ่งของ **Track B: Customer Engagement Platform** ไม่ใช่ระบบแยกที่สร้าง customer/product/order ซ้ำ

ชื่อเชิงผลิตภัณฑ์ที่ใช้ภายใน:

```text
Customer Portal + Verified Review + Community Commerce
```

ชื่อเชิงธุรกิจ:

```text
Customer Community Commerce Platform
```

คุณค่าหลัก:

- ร้านค้าไม่ได้มีแค่ CRM หลังบ้าน แต่มีช่องทางให้ลูกค้ากลับมาใช้งาน
- ลูกค้าสามารถดูข้อมูลของตัวเอง รับคูปอง ใช้แต้ม เขียนรีวิว และติดตามร้าน/ผู้รีวิว
- รีวิวจากผู้ซื้อจริงกลายเป็น content ที่สร้างยอดขาย
- ลูกค้าบางส่วนสามารถกลายเป็น creator/reviewer/affiliate seller
- เจ้าของระบบมี revenue stream เพิ่มจาก SaaS เดิม

---

# 2. Non-Negotiable Rules

กฎเหล่านี้ต้องยึดร่วมกับ roadmap หลักของ ACOS

## RULE-001: ใช้ Customer Source of Truth เดิม

ห้ามสร้าง customer master ใหม่สำหรับ community โดยแยกจาก Commerce Core

ใช้ customer/account identity เดิม แล้วเพิ่ม profile, consent, public profile, community identity เป็น layer ต่อข้าง

## RULE-002: ใช้ Product และ Order Source of Truth เดิม

รีวิวสินค้าและ affiliate ต้องอ้างถึง product/order/order item เดิม

ห้ามสร้าง product catalog หรือ order history ซ้ำเพื่อให้ระบบ community ทำงานง่ายขึ้น

## RULE-003: Tenant Boundary ต้องชัด

ข้อมูลหลังบ้านร้านต้องแยกด้วย `organization_id`

Community กลางสามารถแสดง content ข้ามร้านได้ แต่ข้อมูลลับของร้าน เช่น รายชื่อลูกค้าทั้งหมด, ยอดซื้อส่วนตัว, margin, รายงานหลังบ้าน ห้ามเปิดข้าม tenant

## RULE-004: Public Profile ไม่เท่ากับ Private Account

ลูกค้าคนอื่นดูได้เฉพาะ public profile และ public content

ห้ามเปิด:

- เบอร์โทร
- อีเมลจริง
- ที่อยู่
- บิล
- ประวัติซื้อทั้งหมด
- แต้มคงเหลือ
- คูปองส่วนตัว
- wallet
- รายได้ค่าคอม

## RULE-005: Consent ก่อน Marketing Delivery

ลูกค้าต้องยินยอมก่อนรับข้อความ marketing และต้องยกเลิกได้

Audience eligibility ไม่เท่ากับสิทธิในการส่งข้อความ ต้องตรวจ consent ก่อน dispatch ทุกครั้ง

## RULE-006: Verified Review ต้องมาจากการซื้อจริง

รีวิวที่มี badge `Verified Purchase` ต้องตรวจได้ว่าลูกค้าเคยซื้อสินค้า/order item นั้นจริง

## RULE-007: เงินและแต้มต้องมี Ledger

แต้ม, wallet, commission, payout, refund, reversal ต้องบันทึกแบบ ledger และ audit ได้

ห้ามใช้แค่ field ยอดรวมอย่างเดียวโดยไม่มีประวัติ movement

## RULE-008: เริ่มเป็น Modular Monolith

ยังไม่ต้องแยก microservices ตั้งแต่แรก

ให้แยก domain boundary, contract, event และ worker ให้ดี เพื่อให้ extract ได้ภายหลังเมื่อ scale บังคับ

## RULE-009: Review Target ต้องไม่ผูกกับสินค้าอย่างเดียว

รีวิวต้องรองรับหลายประเภทธุรกิจ ไม่ใช่เฉพาะ e-commerce product

Review target ที่ควรรองรับเป็นแนวคิดกลาง:

```text
product
service
booking
store
package
event
course
appointment
custom_offer
```

รีวิวจากสินค้า/บริการที่หมดสต็อก เลิกขาย หรือเปลี่ยนสถานะแล้ว ยังควรอยู่ได้ถ้าเป็นประสบการณ์จริง แต่ conversion action ต้องเปลี่ยนตามสถานะปัจจุบันของ target

ตัวอย่าง:

```text
Product available
  -> Buy from review

Product out of stock
  -> Notify me
  -> View similar products
  -> Follow store

Product discontinued
  -> View replacement product
  -> View similar products
  -> No direct commission until a new conversion occurs

Service available
  -> Book this service
  -> Request consultation
  -> Claim booking coupon

Clinic / appointment business
  -> Book appointment
  -> Request consultation
  -> View package
```

---

# 3. System Completeness Pillars

ระบบนี้จะสมบูรณ์ได้ต้องมี 8 เสาหลักที่ทำงานร่วมกัน ไม่ใช่แค่มีฟีเจอร์แยกกัน

## 3.1 Identity & Consent

ลูกค้าคนเดียวอาจมาจากหลายร้าน หลายช่องทาง และหลาย campaign

ต้องมี:

- customer account กลาง
- store membership ต่อร้าน
- identity merge ที่ audit ได้
- consent แยกตามร้าน แยกจาก community และ marketing channel
- unsubscribe/suppression ที่ตรวจก่อนส่งข้อความทุกครั้ง

## 3.2 Storefront As Conversion Center

Storefront ต้องเป็นจุดที่เกิด conversion จริง ไม่ใช่แค่ landing page

ต้องเชื่อม:

- product/service listing
- cart/checkout
- payment
- booking
- coupon/points
- order tracking
- review invitation
- attribution

## 3.3 Trust Layer Before Monetization

ก่อนเปิด Ads, payout และ creator marketplace เต็มรูปแบบ ต้องทำ trust layer ให้แข็งก่อน

ต้องมี:

- Verified Purchase / Verified Booking / Verified Service
- fraud guard
- moderation
- report/block
- audit log
- content policy
- commission hold/reversal

## 3.4 Event System

ทุก action สำคัญควร emit event กลาง เพื่อให้ notification, automation, analytics, attribution และ milestone ทำงานจากภาษาเดียวกัน

Event examples:

```text
customer_joined_store
customer_opted_into_community
storefront_viewed
product_viewed
checkout_started
order_paid
booking_paid
review_created
review_clicked
affiliate_attributed
commission_approved
milestone_achieved
reward_granted
content_reported
```

## 3.5 Ledger For Every Value Movement

ทุกสิ่งที่มีมูลค่าต้องมี ledger

ต้องมี ledger สำหรับ:

- points
- coupon claim/use
- wallet
- commission
- payout
- boost credit
- platform reward
- messaging quota
- refund/reversal

## 3.6 Policy & Moderation Center

Community, review, clinic/service content, ads และ creator campaign ต้องมี policy ที่ตรวจได้

ต้องมี:

- content report
- hide/remove
- warning
- suspension/ban
- appeal
- policy violation reason
- special policy สำหรับสุขภาพ/คลินิก/อาหารเสริม/การเงิน/คำกล่าวอ้างเกินจริง

## 3.7 Owner Operating Dashboard

เจ้าของระบบต้องมีหน้าเดียวที่เห็นสุขภาพของ ecosystem

ควรเห็น:

- active stores
- active customers
- customer acquisition by source
- MAU
- GMV
- storefront conversion
- review volume
- conversion from review
- commission pending
- payout pending
- reward cost
- messaging cost
- content reports
- fraud signals
- top stores / top creators / top campaigns

## 3.8 Feature Flag & Plan Entitlement

ทุก feature ใหญ่ต้องเปิด/ปิดตาม plan, tenant และ rollout ได้

Feature ที่ควรคุมด้วย entitlement:

- customer portal
- storefront
- checkout/payment
- booking
- community
- verified review
- affiliate/commission
- wallet/payout
- creator campaign
- platform growth reward
- promoted content
- messaging automation
- custom domain
- advanced analytics

---

# 4. Customer Acquisition Paths

ระบบต้องรองรับลูกค้าเข้ามาได้ 2 ทางตั้งแต่แนวคิด product และ data model

## 4.1 Store-Led Signup

ลูกค้ารู้จักระบบผ่านร้านค้าที่ซื้อสินค้า/บริการอยู่แล้ว

Flow:

```text
ลูกค้าซื้อสินค้าหรือใช้บริการจากร้าน
  -> ร้านส่งลิงก์/QR สมัครสมาชิกเพื่อรับสิทธิประโยชน์
  -> ลูกค้าสมัครด้วย phone/email/LINE/social login
  -> ระบบสร้างหรือผูก Customer Account กลาง
  -> ระบบสร้าง Store Membership ของร้านนั้น
  -> ลูกค้าเข้า Private Customer Dashboard ได้
  -> ลูกค้าเห็นแต้ม คูปอง บิล และประวัติซื้อของร้านนั้น
  -> ลูกค้าสามารถ opt-in เพื่อสร้าง Public Profile และเข้า Community ได้
```

สิทธิที่ได้ทันที:

- private customer dashboard
- membership ของร้านที่ชวนสมัคร
- ดูข้อมูลที่เกี่ยวกับร้านนั้น เช่น order, receipt, coupon, point
- รับข่าวสารจากร้านตาม consent
- เขียน verified review จากสินค้าหรือบริการที่ซื้อจริง

ข้อจำกัด:

- ไม่ควรสร้าง public profile แบบเปิดเผยทันทีโดยไม่ถาม
- ข้อมูลสมาชิกของร้านหนึ่งไม่ควรถูกเปิดให้ร้านอื่นเห็น
- การเข้าร่วม community กลางควรเป็น opt-in หรือมี consent ชัดเจน

## 4.2 Platform-Led Signup

ลูกค้ารู้จักระบบจากการโปรโมทของ ACOS โดยตรง เช่น เห็นว่ารีวิวจากการซื้อจริงสามารถสร้างรายได้

Flow:

```text
ลูกค้าเห็นโฆษณา/คอนเทนต์ของ ACOS
  -> สมัคร Customer Account กลาง
  -> ตั้งค่า Private Account
  -> เลือกความสนใจ
  -> สร้างหรือเปิด Public Profile แบบ opt-in
  -> เข้า Community / Discovery Feed
  -> ติดตามร้านหรือ creator
  -> ซื้อสินค้า จองบริการ หรือสมัคร campaign
  -> หลังเกิด verified purchase/booking จึงเขียน Verified Review ได้
  -> ถ้ารีวิวสร้าง conversion จริง จึงเกิด commission ตามกติกา
```

สิทธิที่ได้ทันที:

- customer account กลาง
- private account
- public profile setup แบบ opt-in
- interest onboarding
- community feed
- follow store/creator
- save product/service
- comment/like/share ตาม policy
- ดู campaign ที่เปิดรับ reviewer/creator

สิทธิที่ยังไม่ได้จนกว่าจะมีความสัมพันธ์กับร้าน:

- ดูแต้มของร้าน
- ดูคูปองส่วนตัวของร้าน
- ดูบิล/ประวัติซื้อของร้าน
- เขียน Verified Review ของร้าน
- รับ commission จากสินค้าหรือบริการที่ยังไม่เคยซื้อ/จองจริง

ข้อจำกัด:

- Platform-led customer เขียนโพสต์ทั่วไปได้ แต่รีวิวที่มี badge ต้องผูกกับการซื้อ/จองจริง
- Opinion, discussion หรือ wishlist content ต้องแยกจาก Verified Review ชัดเจน
- ระบบต้องกัน spam, fake review, self-purchase และ campaign abuse ตั้งแต่เริ่มเปิดเส้นทางนี้
- ก่อนเปิด payout จริง ควรมี creator terms, commission terms และ fraud review workflow

## 4.3 Entry Path Policy

บัญชีกลางของลูกค้าควรเป็นบัญชีเดียว ไม่ว่ามาจากร้านหรือมาจากแพลตฟอร์ม

```text
Customer Account
  -> may have many Store Memberships
  -> may have one Public Profile
  -> may have many Reviews
  -> may have many Follows
  -> may have Wallet/Commission after eligible conversion
```

หลักการ:

- Store-led signup สร้าง trust จากลูกค้าจริงและ order จริง
- Platform-led signup สร้าง growth จาก creator/reviewer และ community traffic
- ทั้งสองทางต้องรวมเข้าบัญชีกลางเดียวกันเมื่อ identity ตรงกัน
- การ merge account ต้อง audit ได้และต้องไม่เปิดข้อมูลร้านผิด tenant

---

# 5. Target User Groups

ระบบนี้มี 4 กลุ่มผู้ใช้หลัก

## 5.1 Platform Owner

เจ้าของ ACOS ต้องเห็นภาพรวม:

- จำนวนร้าน active
- จำนวน customer account
- monthly active users
- post/review volume
- GMV จาก community
- GMV จาก affiliate
- revenue จาก add-on
- revenue จาก promoted content
- messaging usage cost/revenue
- payout pending
- content reports pending
- fraud signal

## 5.2 Store Owner / Staff

ร้านค้าที่เช่าระบบต้องทำได้:

- เปิด/ปิด customer portal
- เปิด/ปิด review/community/affiliate
- ตั้งค่าคอมมิชชั่นต่อร้าน/สินค้า/campaign
- สร้างคูปองและ campaign
- ส่ง notification หรือ broadcast ตาม consent
- ดูรีวิวและยอดขายจากรีวิว
- อนุมัติ/ปักหมุด/ซ่อน content ที่เกี่ยวกับร้าน
- ดู top reviewer และ conversion

## 5.3 Customer

ลูกค้าปลายทางต้องทำได้:

- ดูโปรไฟล์ตัวเอง
- ดูแต้ม คูปอง บิล ประวัติซื้อ
- เขียนโพสต์/รีวิว
- กดรับคูปอง
- กดใช้แต้ม
- กดติดตามร้าน/ผู้รีวิว
- กดซื้อตามรีวิว
- ดู wallet/commission ของตัวเอง
- ตั้งค่าความเป็นส่วนตัวและการแจ้งเตือน

## 5.4 Reviewer / Creator

ลูกค้าบางส่วนจะกลายเป็น reviewer/creator

ต้องทำได้:

- สร้าง public profile ที่น่าเชื่อถือ
- ปักหมุดรีวิวเด่น
- ดู performance ของรีวิว
- ดูยอดคลิก ยอดซื้อ ค่าคอม
- สมัคร campaign ของร้าน
- ขอถอนเงินเมื่อยอดถึงขั้นต่ำ

---

# 6. Product Surface Map

## 6.1 Private Customer Dashboard

เป็นหน้าส่วนตัวของลูกค้า

ควรมี:

- โปรไฟล์ส่วนตัว
- membership ต่อร้าน
- แต้มคงเหลือ
- point history
- คูปองของฉัน
- บิล/ใบเสร็จ
- ประวัติออเดอร์
- รีวิวของฉัน
- โพสต์ของฉัน
- wallet/commission
- notification inbox
- privacy setting
- consent setting

## 6.2 Public Customer Profile

เป็นหน้าที่ลูกค้าคนอื่นดูได้

ควรมี:

- display name
- avatar
- cover image
- bio
- interest categories
- badge เช่น Verified Buyer, Top Reviewer
- follower/following count
- public posts
- public reviews
- collections
- social links ที่เจ้าของใส่เอง
- follow/share/report/block action

## 6.3 Community Feed

เป็น feed กลางของลูกค้าในระบบ

ประเภท content:

- post ทั่วไป
- blog
- product review
- store review
- unboxing
- how-to
- comparison
- collection
- campaign post

Action:

- like
- comment
- share
- save
- follow
- report
- block
- buy from review

## 6.3.1 Review Target & Conversion CTA

รีวิวควรถูกออกแบบเป็น content ที่ผูกกับ `review_target` ไม่ใช่ผูกกับ product อย่างเดียว

เป้าหมายคือให้ระบบรองรับร้านหลายประเภท:

- ร้านค้าสินค้า: review target = product/order item
- คลินิก: review target = service/booking/package
- สปา/ซาลอน: review target = appointment/service
- ร้านอาหาร: review target = menu item/store visit/booking
- คอร์สเรียน: review target = course/enrollment
- event/workshop: review target = event ticket/booking

Primary CTA ต้องถูกคำนวณจาก target type และสถานะปัจจุบัน:

| Target Type | Current Status | Primary CTA | Commission Trigger |
|---|---|---|---|
| product | available | Buy from review | paid order |
| product | out_of_stock | Notify me / View similar products | no commission until paid order |
| product | discontinued | View replacement / View similar products | paid order from replacement if rule allows |
| service | available | Book this service | paid booking |
| service | consultation_required | Request consultation | commission only after confirmed sale |
| booking | rebookable | Book again / Book similar service | paid booking |
| store | active | Follow store / View products | paid order or paid booking |
| course | open | Enroll from review | paid enrollment |

ข้อสำคัญ:

- รีวิวไม่ควรถูกลบเพียงเพราะสินค้าหมด
- รีวิวของสินค้าที่หมดแล้วยังช่วยสร้าง trust ให้ร้านได้
- ปุ่ม CTA ต้องไม่หลอกว่าซื้อได้ ถ้าสต็อกหรือบริการไม่พร้อม
- ค่าคอมต้องเกิดจาก conversion จริงเท่านั้น ไม่ใช่จากการกด notify/follow/view
- ถ้า redirect ไปสินค้าใกล้เคียงหรือ replacement product ต้องมี attribution rule ที่ร้านยอมรับก่อน

## 6.4 Storefront / Store Landing Page

แต่ละร้านควรมีหน้าร้านสาธารณะของตัวเอง เพื่อให้ลูกค้าเข้ามาดูสินค้า/บริการ สมัครสมาชิก รับคูปอง ซื้อสินค้า จองบริการ และชำระเงินได้

URL example:

```text
adora.app/store/{store_slug}
shop.{store_domain}
```

Storefront ควรเชื่อมกับ Commerce Core โดยตรง ไม่สร้าง product/order/payment ซ้ำ

ควรมี:

- store profile
- store cover/banner
- store description/contact
- follow store
- join membership / claim member benefits
- coupon display
- product/service categories
- product listing
- service/package listing
- product detail page
- service/booking detail page
- review summary
- store review/review feed
- cart
- checkout
- payment
- order confirmation
- order tracking
- booking flow สำหรับธุรกิจบริการ
- chat/contact CTA

Customer flow สำหรับสินค้า:

```text
Storefront
  -> Product detail
  -> Add to cart
  -> Apply coupon/points
  -> Checkout
  -> Payment
  -> Order created
  -> Fulfillment / tracking
  -> Review invitation
```

Customer flow สำหรับบริการ:

```text
Storefront
  -> Service/package detail
  -> Select date/time or request consultation
  -> Pay deposit/full amount if required
  -> Booking created
  -> Service completed
  -> Review invitation
```

ข้อสำคัญ:

- Storefront เป็นเส้นทาง conversion หลักของ review/community/affiliate
- ถ้าไม่มี storefront/checkout ในระบบ การวัด attribution และ commission จะยากขึ้น
- Storefront ต้องเคารพ tenant boundary และ plan/feature entitlement
- Custom domain เป็น feature ระยะหลัง ไม่จำเป็นใน MVP แรก
- ธุรกิจบริการต้องรองรับ booking/appointment ไม่ใช่ cart อย่างเดียว

## 6.5 Store Admin Surface

หลังบ้านร้านต้องมี:

- storefront settings
- store profile/banner
- storefront product/service visibility
- storefront theme/basic branding
- checkout/payment settings
- booking settings เมื่อใช้ธุรกิจบริการ
- community settings
- review moderation
- affiliate settings
- campaign builder
- coupon/reward settings
- customer segment
- notification/broadcast composer
- review sales analytics
- creator list
- payout approval ถ้าร้านเป็นผู้อนุมัติ

## 6.6 Platform Owner Surface

หลังบ้านเจ้าของระบบต้องมี:

- tenant plan/feature flag
- community health dashboard
- promoted content dashboard
- messaging usage dashboard
- fraud/moderation dashboard
- payout oversight
- revenue dashboard
- system cost dashboard

---

# 7. Development Phases

หลักการคือแต่ละ phase ต้องสร้างคุณค่าได้เอง และต้องไม่บังคับให้ phase ถัดไปเสร็จก่อนถึงจะใช้ได้

## Phase 0: Foundation Alignment

เป้าหมาย: ตรวจว่า Commerce Core พร้อมรองรับ Customer Engagement หรือไม่

ต้องมี:

- customer source of truth ชัด
- customer acquisition path model: store-led, platform-led
- product source of truth ชัด
- order/order item source of truth ชัด
- tenant boundary ด้วย `organization_id`
- permission/RLS baseline
- audit log baseline
- event naming baseline
- system event catalog baseline
- feature flag / entitlement baseline
- policy and moderation baseline
- owner operating dashboard baseline
- media storage decision
- notification event contract เบื้องต้น
- account merge / identity matching direction
- public profile opt-in direction

Exit gate:

- ระบุได้ว่า customer, product, order, order item ใช้ตารางใด
- ระบุได้ว่า customer account กลางจะ map กับ store membership อย่างไร
- ระบุได้ว่า customer ที่สมัครตรงกับ platform ยังไม่มี store membership จะเห็น/ทำอะไรได้บ้าง
- ระบุได้ว่า store-led customer จะ opt-in เข้า community กลางอย่างไร
- ระบุได้ว่า feature ใดต้องคุมด้วย plan entitlement ตั้งแต่ MVP
- ระบุได้ว่า event สำคัญของ storefront, checkout, review, commission และ reward คืออะไร
- ระบุได้ว่า policy/moderation minimum สำหรับ review/community คืออะไร
- ระบุได้ว่า owner dashboard MVP ต้องเห็น metric ใด
- ระบุได้ว่า migration ใหม่เริ่มจากเลขใดและไม่แก้ migration เก่า

## Phase 1: Customer Portal MVP

เป้าหมาย: ลูกค้า login แล้วดูข้อมูลของตัวเองได้

Feature:

- customer login
- private customer dashboard
- profile edit
- membership ต่อร้าน
- order history read-only
- receipt/bill read-only
- coupon wallet read-only หรือ claim coupon แบบง่าย
- point balance และ point ledger read-only
- notification inbox แบบ in-app
- consent setting

ยังไม่ทำ:

- community feed
- platform-led creator landing เต็มรูปแบบ
- affiliate
- promoted content
- payout

Exit gate:

- ลูกค้าดูข้อมูลตัวเองได้เท่านั้น
- ลูกค้าคนหนึ่งเป็นสมาชิกหลายร้านได้
- platform-led account ที่ยังไม่มี store membership ไม่เห็นข้อมูลร้านใด
- consent ถูกบันทึกและตรวจสอบได้
- in-app notification พื้นฐานทำงานได้

## Phase 1B: Platform-Led Signup Readiness

เป้าหมาย: เปิดให้ลูกค้าสมัครบัญชีกลางผ่าน platform ได้โดยยังไม่เปิด creator monetization เต็มรูปแบบ

Feature:

- platform signup landing
- account onboarding
- interest selection
- public profile setup แบบ opt-in
- community terms acceptance
- reviewer/creator terms preview
- empty-state dashboard สำหรับคนที่ยังไม่มี store membership
- follow store/creator
- save product/service
- view public campaign directory แบบ read-only หรือ limited

ยังไม่ทำ:

- verified review โดยไม่มี purchase/booking
- payout
- automatic commission
- aggressive promoted campaign

Exit gate:

- คนที่สมัครตรงกับ platform ไม่สามารถดูข้อมูล CRM ของร้านใดได้
- คนที่สมัครตรงกับ platform ยังเขียน Verified Review ไม่ได้จนกว่าจะซื้อ/จองจริง
- Opinion/discussion content ต้องถูกแยกจาก Verified Review
- onboarding ต้องบอกให้ชัดว่ารายได้เกิดจาก verified conversion ตามกติกา ไม่ใช่แค่สมัครแล้วได้เงิน

## Phase 1C: Storefront MVP

เป้าหมาย: ให้แต่ละร้านมี public storefront พื้นฐานที่เชื่อมกับ product/service source เดิม และเป็นทางเข้าหลักสำหรับสมาชิกใหม่ การซื้อ การจอง และ review invitation ในอนาคต

Feature:

- store public URL / store slug
- store profile page
- store cover/banner
- product listing read-only
- product detail page
- service/package listing read-only เมื่อเปิดธุรกิจบริการ
- service/package detail page
- coupon/member benefit display
- follow store
- join membership CTA
- basic review summary placeholder
- basic SEO/social share metadata
- store admin storefront settings แบบพื้นฐาน

ยังไม่ทำ:

- custom domain
- advanced theme builder
- full cart/checkout
- payment
- booking calendar เต็มรูปแบบ
- advanced storefront analytics

Exit gate:

- storefront อ่าน product/service จาก source of truth เดิม
- storefront ไม่เปิดสินค้าที่ร้านตั้ง hidden/inactive
- storefront เคารพ tenant boundary
- store slug ต้อง unique และ audit การเปลี่ยนได้
- ลูกค้าสามารถเข้าหน้าร้านและสมัครสมาชิก/ติดตามร้านได้

## Phase 1D: Storefront Cart / Checkout / Payment MVP

เป้าหมาย: ให้ลูกค้าซื้อสินค้า หรือเริ่ม checkout/booking ผ่านหน้าร้านได้ เพื่อให้ conversion อยู่ในระบบและรองรับ attribution/commission ระยะถัดไป

Feature:

- cart
- cart item quantity
- stock availability check
- coupon apply
- points apply ถ้า loyalty พร้อม
- checkout session
- customer address/contact capture
- payment intent หรือ payment request
- order creation หลัง payment success หรือ manual payment confirmation
- order confirmation page
- order tracking page แบบพื้นฐาน
- booking request / appointment request สำหรับธุรกิจบริการ
- payment/deposit สำหรับ booking เมื่อ payment module พร้อม
- checkout event สำหรับ attribution ภายหลัง

ยังไม่ทำ:

- multi-store cart
- complex shipping optimization
- split payment
- marketplace-style escrow
- automatic affiliate commission payout

Exit gate:

- order/payment ใช้ Commerce Core source of truth เดิม
- cart/checkout ไม่ bypass promotion, stock, payment, audit rules
- payment success/failure มี event และ audit
- order จาก storefront ผูก customer และ organization ได้ถูกต้อง
- booking/appointment ไม่เปิดข้อมูลส่วนตัวเกินจำเป็นใน public surface

## Phase 2: Verified Review MVP

เป้าหมาย: ลูกค้ารีวิวสินค้า บริการ หรือ booking ที่เคยซื้อ/ใช้จริงได้ โดยเริ่มจาก order item ก่อน แล้วออกแบบให้ขยายไป target อื่นได้

Feature:

- create review from purchased order item
- review target abstraction: product, service, booking, store, package
- verified target reference เช่น order item, booking, appointment, service package
- rating 1-5
- text review
- image upload สูงสุด 5 รูป
- video upload 1 รายการ หรือ external video URL ใน MVP
- tags
- Verified Purchase badge
- Verified Booking / Verified Service badge สำหรับธุรกิจบริการ
- review visibility: public, store members only, private
- review list ใน public profile
- review list ใน product/store admin
- review list ใน service/booking admin เมื่อเปิดใช้ธุรกิจบริการ
- preserve review when target is out_of_stock/discontinued/inactive
- report review

ยังไม่ทำ:

- commission
- boosted review
- complex feed ranking

Exit gate:

- รีวิว verified ต้องตรวจ order item ได้
- schema ต้องไม่ lock review ไว้กับ product เท่านั้น
- service/booking target ต้องมีช่องทางเพิ่มภายหลังโดยไม่ migrate review ใหม่ทั้งหมด
- ร้านเห็นรีวิวของสินค้าตัวเอง
- ร้านบริการเห็นรีวิวของ booking/service ตัวเองเมื่อเปิด module นั้น
- คนอื่นไม่เห็นข้อมูล order/bill จากรีวิว
- คนอื่นไม่เห็นข้อมูล appointment ส่วนตัวหรือข้อมูลสุขภาพ/บริการที่ละเอียดเกินจำเป็น
- media มี quota และ file policy

## Phase 3: Public Profile + Basic Community Feed

เป้าหมาย: ลูกค้าเริ่มมีตัวตนแบบ social และ content เริ่มไหลใน community

Feature:

- public profile
- follow/unfollow
- public post
- blog post
- review post appears in feed
- like/comment/share/save
- basic feed: latest + simple ranking
- tag/category browsing
- block/report user
- moderation queue

Feed V1 guideline:

- ยังไม่ fan-out feed ให้ทุกคนตอน publish
- ใช้ query/projection/ranking แบบควบคุมได้
- จำกัด page size และ media payload

Exit gate:

- public/private separation ผ่าน test
- report/moderation มี admin surface
- delete/hide content ไม่ทำให้ข้อมูลการเงินหรือ order เสีย

## Phase 4: Buy From Review + Attribution

เป้าหมาย: เริ่มวัดว่า conversion มาจากรีวิวใด ไม่ว่าจะเป็น order, booking, consultation หรือ enrollment แต่ยังไม่จ่ายคอมจริงแบบเต็มระบบ

Feature:

- ปุ่มซื้อตามรีวิว
- dynamic primary CTA by review target status
- CTA examples: buy from review, book this service, request consultation, notify me, view similar products
- deep link ไป storefront product/service/booking page
- tracking token
- attribution click log
- attribution window เช่น 7 วัน
- checkout session attribution
- order attribution เมื่อซื้อสำเร็จ
- booking attribution เมื่อจอง/ชำระบริการสำเร็จ
- lead attribution สำหรับขอคำปรึกษา โดยยังไม่เกิดคอมจนกว่าจะปิดการขาย
- out-of-stock CTA ต้องไม่สร้าง commission จนกว่าจะเกิด paid conversion จริง
- store dashboard: review click, order, conversion
- service dashboard: review click, booking, consultation, conversion
- platform dashboard: GMV from review

ยังไม่ทำ:

- automatic payout
- promoted content
- creator marketplace

Exit gate:

- review CTA ต้องพาไป storefront/checkout/booking flow ที่ track ได้
- ระบบรู้ว่า order นี้มาจาก review/post ใด
- ระบบรู้ว่า booking/consultation นี้มาจาก review/post ใด เมื่อ target type ไม่ใช่ product
- CTA ไม่แสดง buy/book ถ้า target ไม่พร้อมขายหรือไม่พร้อมจอง
- attribution ไม่เปิดเผยข้อมูลลูกค้าเกินจำเป็น
- ป้องกัน self-purchase attribution ขั้นพื้นฐาน

## Phase 5: Commission Ledger + Wallet Hold

เป้าหมาย: เริ่มคำนวณค่าคอมจากยอดขายที่เกิดจากรีวิว แต่ยังควบคุม payout อย่างระมัดระวัง

Feature:

- commission rule ต่อร้าน
- minimum commission เช่น 3%
- commission rule ต่อสินค้า/campaign ในระดับถัดไป
- commission ledger
- wallet pending balance
- hold period หลัง order paid/delivered
- reversal เมื่อ order cancel/refund
- reviewer dashboard: clicks, sales, pending commission
- store dashboard: commission cost

Commission status:

```text
pending
confirmed
hold
approved
paid
rejected
reversed
```

Exit gate:

- ทุก movement มี ledger
- คอมมิชชั่นเปลี่ยนตาม order status ได้
- refund/cancel ทำ reversal ได้
- audit log เรื่องเงินครบ

## Phase 6: Payout + Creator Controls

เป้าหมาย: เปิดให้ reviewer ถอนเงินหรือรับเครดิตได้

Feature:

- payout request
- payout minimum
- payout method
- payout approval workflow
- payout history
- creator application ต่อร้าน/campaign
- creator level
- creator badge
- fraud/manual review queue

Exit gate:

- payout ไม่เกิดโดยไม่มี approved balance
- payout มี audit และ export ได้
- มี policy เรื่องภาษี/เอกสาร/เงื่อนไขการถอนที่ชัดก่อนเปิดเงินจริง

## Phase 7: Store Campaign Marketplace

เป้าหมาย: ร้านค้าสร้าง campaign เพื่อให้ลูกค้า/creator ช่วยรีวิวและขาย

Feature:

- campaign brief
- eligible products
- commission override
- bonus reward
- creator application
- approval/deny creator
- campaign landing page
- campaign performance dashboard
- limited slots เช่น รับ 50 reviewers

Exit gate:

- campaign ไม่ละเมิด consent
- commission rule conflict ถูก resolve ชัด
- ร้านเห็นต้นทุนรวมของ campaign ก่อนเปิดใช้งาน

## Phase 8: Platform Growth Support / Store Achievement Program

เป้าหมาย: เจ้าของระบบช่วยดันร้านค้าที่สร้างคุณค่าให้ ecosystem ผ่าน milestone, mission และ reward โดยยังไม่ใช่ระบบ Ads แบบร้านจ่ายเงินเต็มรูปแบบ

แนวคิด:

```text
ร้านทำผลงานถึง milestone หรือภารกิจ
  -> ระบบตรวจจากข้อมูลจริง
  -> ให้ reward จาก platform
  -> ร้านใช้ reward เพื่อเพิ่มการมองเห็นหรือสร้างแรงจูงใจให้ลูกค้า
  -> ระบบวัดผลและ audit ได้
```

Milestone examples:

- verified members ครบ 500, 1,500, 3,000
- verified followers ครบ 500, 1,500, 3,000
- verified reviews ครบ 50, 100, 300
- paid monthly sales ครบ 100,000 บาท
- completed orders ครบเป้ารายเดือน
- community conversion จากรีวิวครบเป้า
- คะแนนร้านหรือ service quality ผ่านเกณฑ์

Mission examples:

- ชวนลูกค้าเก่ามาสมัครสมาชิกครบ 300 คน
- เก็บ verified review จาก order จริงครบ 50 รีวิว
- ส่งคูปองให้ลูกค้ากลุ่ม consent แล้วเกิดยอดขายตามเป้า
- รักษา refund/cancel rate ต่ำกว่าเกณฑ์
- ทำยอดขายจากรีวิวครบ 30,000 บาทในเดือนนี้

Reward examples:

- boost credit
- featured store slot
- featured product/review slot
- platform coupon support
- free messaging quota
- campaign placement
- trusted store badge
- subscription discount
- early access feature

Feature:

- achievement rule builder สำหรับ platform owner
- milestone tracker ต่อร้าน
- mission tracker ต่อร้าน
- reward grant ledger
- reward expiry
- reward redemption
- store growth dashboard
- platform owner approval override
- fraud/manual review queue
- notification เมื่อใกล้ถึง milestone หรือได้รับ reward

MVP guideline:

- เริ่มจาก metric ที่มีหลักฐานจากระบบจริงก่อน เช่น paid order, completed order, verified member, verified review
- ยังไม่ควรเริ่มจาก follower อย่างเดียว เพราะปั่นง่ายกว่า
- reward ควรเป็น credit หรือ placement ที่มี quota/expiry ชัดเจน
- การช่วยดันต้องมี label/logic โปร่งใส แต่ไม่จำเป็นต้องใช้คำว่า Sponsored ถ้าเป็น organic platform reward

Exit gate:

- milestone คำนวณจากข้อมูลที่ audit ได้
- reward ทุกชิ้นมี ledger, owner, expiry, redeemed status
- refund/cancel ต้องหักหรือ revoke achievement ได้ตาม rule
- มี fraud guard ก่อนให้ reward ที่มีมูลค่า
- ร้านเห็น progress และเงื่อนไขชัดเจน

## Phase 9: Promoted Content / Internal Ads

เป้าหมาย: เจ้าของระบบสร้างรายได้จากการเพิ่มการมองเห็น

Feature:

- boosted review
- boosted product
- boosted coupon
- promoted store
- budget
- daily cap
- targeting by category/interest/store membership
- impression/click/conversion tracking
- sponsored label
- ad moderation

Revenue model:

- fixed budget
- CPM
- CPC
- CPA ในอนาคต

Exit gate:

- organic และ promoted แยก label ชัด
- impression/click log ไม่ซ้ำเกินจริง
- budget cap ทำงาน
- promoted content ต้องผ่าน policy

## Phase 10: Advanced Notification & Automation

เป้าหมาย: สร้าง messaging engine ที่เป็นรายได้และ retention tool

Feature:

- event -> rule -> audience -> template -> channel -> delivery log
- in-app notification
- email
- SMS
- LINE OA adapter
- push notification เมื่อมี app/PWA
- template variable
- unsubscribe/suppression
- automation recipes
- usage-based billing ต่อ provider

Automation examples:

- ลูกค้าสมัครใหม่ -> คูปองต้อนรับ
- ซื้อสำเร็จ -> ชวนรีวิว
- รีวิวขายได้ -> แจ้งค่าคอม
- แต้มใกล้หมดอายุ -> แจ้งเตือน
- ไม่ซื้อ 30 วัน -> โปรดึงกลับ
- วันเกิด -> ของขวัญ
- มีคนคอมเมนต์ -> แจ้งเจ้าของโพสต์

Exit gate:

- ตรวจ consent ก่อน dispatch ทุกครั้ง
- provider usage มี meter
- delivery log มีสถานะ sent/failed/skipped
- ร้านไม่สามารถ spam ลูกค้าเกิน policy/quota

## Phase 11: Network Intelligence

เป้าหมาย: ใช้ข้อมูล community แบบปลอดภัยเพื่อช่วยร้านขายดีขึ้น

Feature:

- trend dashboard
- top tags
- top categories
- review sentiment แบบ aggregate
- creator performance
- product discovery feed
- personalized feed
- recommendation
- fraud signal scoring

ข้อจำกัด:

- ใช้ aggregated/anonymized insight
- ห้ามขายหรือเปิดข้อมูลส่วนตัวลูกค้า
- ห้ามเปิดข้อมูลลับของร้านหนึ่งให้ร้านอื่น

---

# 8. Notification & Messaging Plan

ระบบแจ้งเตือนควรเป็นระบบกลางของ ACOS

Pattern:

```text
Event -> Notification Rule -> Audience -> Consent Check -> Template -> Channel -> Delivery Log
```

Event examples:

- customer_registered
- coupon_claimed
- points_earned
- points_expiring
- order_paid
- review_created
- review_liked
- review_commented
- affiliate_clicked
- attributed_order_created
- commission_approved
- payout_paid
- content_reported

Channels:

- in-app
- email
- SMS
- LINE OA
- push notification

MVP channel:

```text
in-app + email
```

Thailand-focused next channel:

```text
LINE OA
```

ต้องมี:

- notification preferences
- marketing consent
- unsubscribe
- suppression list
- template version
- delivery retry
- delivery cost meter
- store quota
- platform policy

---

# 9. Monetization Model

เจ้าของระบบสามารถสร้างรายได้เพิ่มได้หลายชั้น

## 9.1 SaaS Subscription

รายได้ฐานจากร้านค้าที่เช่าระบบ

ตัวอย่าง:

- Starter
- Growth
- Pro
- Enterprise

## 9.2 Customer Portal / Community Add-on

คิดเพิ่มสำหรับร้านที่ต้องการเปิด:

- customer portal
- loyalty
- coupon wallet
- review
- community
- affiliate

## 9.3 Commerce Take Rate

เก็บ platform fee จากยอดขายที่เกิดจาก community/review/affiliate

ตัวอย่าง:

```text
Reviewer commission: 10%
Platform fee: 2%
Store total acquisition cost: 12%
```

## 9.4 Promoted Content

ร้านจ่ายเพื่อเพิ่มการมองเห็น:

- boost review
- boost product
- boost coupon
- featured store
- campaign promotion

## 9.5 Platform Growth Support

เจ้าของระบบอาจใช้งบหรือ credit ของ platform เพื่อช่วยดันร้านที่ทำผลงานดี

รูปแบบนี้ไม่ใช่รายได้โดยตรงทันที แต่ช่วยเพิ่ม:

- store retention
- store activation
- review volume
- customer signup
- GMV จาก ecosystem
- ความรู้สึกว่า platform เป็น growth partner ของร้าน

ตัวอย่าง reward:

- boost credit จาก platform
- featured placement ฟรี
- platform-funded coupon
- free messaging quota
- trusted store badge
- subscription discount

ต้องแยก ledger ของ reward จาก paid ads ชัดเจน เพื่อรู้ว่าการมองเห็นเกิดจากเงินร้านหรือ platform support

## 9.6 Messaging Usage

คิดตามการใช้งาน provider:

- SMS
- LINE OA
- Email quota เกินแพ็ก
- broadcast automation ขั้นสูง

## 9.7 Advanced Analytics

คิดเพิ่มสำหรับ:

- creator analytics
- campaign attribution
- conversion report
- trend insight
- customer segment
- retention automation

---

# 10. Suggested Data Domains

Entity กลางที่ควรวางแผน:

```text
Organization / Store
Customer
Customer Account
Store Membership
Customer Acquisition Source
Customer Interest
Customer Onboarding State
Customer Public Profile
Customer Consent
Community Terms Acceptance
Creator Terms Acceptance
Feature Entitlement
Feature Flag
System Event
Event Delivery Log
Storefront
Storefront Page
Storefront Theme
Storefront Domain
Storefront Visibility Rule
Product
Service
Service Package
Booking / Appointment
Cart
Cart Item
Checkout Session
Payment Intent
Payment Transaction
Order
Order Item
Coupon
Point Ledger
Notification
Notification Preference
Notification Delivery Log
Post
Review
Review Target
Review CTA Rule
Media
Comment
Reaction
Follow
Collection
Report
Moderation Action
Policy Rule
Policy Violation
Appeal
Affiliate Click
Affiliate Attribution
Conversion Event
Creator Application
Creator Eligibility
Commission Rule
Commission Ledger
Wallet
Payout
Campaign
Campaign Application
Store Achievement Rule
Store Achievement Progress
Store Mission
Platform Reward
Reward Grant Ledger
Reward Redemption
Ad Campaign
Ad Impression
Owner Operating Metric
Audit Log
```

หมายเหตุ:

- tenant-owned data ต้องมี `organization_id`
- customer account กลางอาจไม่มี store membership ในกรณี platform-led signup
- store membership ต้องเกิดจากการสมัครผ่านร้าน, การซื้อ/จอง, การ join ร้าน, หรือ rule ที่ร้านอนุญาต
- customer acquisition source ต้องบันทึกว่าเข้ามาจากร้าน, platform promotion, referral, campaign หรือ channel อื่น
- feature entitlement ต้องคุมการเปิด customer portal, storefront, checkout, booking, community, affiliate, payout, ads, custom domain และ analytics ต่อ plan/tenant
- system event ต้องเป็นภาษากลางของ notification, automation, analytics, attribution, commission และ achievement
- storefront ต้องใช้ product/service/order/payment source เดิมของ Commerce Core
- storefront visibility ต้องเคารพ product status, inventory status, service availability และ plan entitlement
- checkout session ควรเป็นจุดเชื่อม attribution ก่อนเกิด order/booking จริง
- public community data อาจมี `organization_id` เมื่อผูกกับร้าน/สินค้า
- store achievement ต้องคำนวณจาก metric ที่ตรวจสอบได้ เช่น paid sales, completed orders, verified members, verified reviews
- platform reward ต้องมี grant ledger, expiry, redemption และ revoke/reversal rule
- platform-funded boost/coupon/message quota ต้องแยกจาก paid ads budget ของร้าน
- review target ต้องรองรับ product/service/booking/package โดยไม่บังคับให้ทุก review มี product_id
- review CTA ควรถูก resolve จาก target type, current availability, inventory/booking status และ store rule
- out-of-stock หรือ discontinued target ยังเก็บ review ได้ แต่ต้องเปลี่ยน CTA และ commission eligibility
- cross-store public feed ต้องไม่เปิดข้อมูลลับของ tenant
- financial data ต้องมี immutable ledger
- policy/moderation data ต้องเก็บเหตุผลและ actor เพื่อ audit และ appeal ได้
- owner operating metric ต้องแยก metric จริงจาก metric ที่ยังเป็น estimate หรือ delayed
- media ต้องมี quota และ retention policy

---

# 11. System Boundary Map

```text
Commerce Core
  Customer / Product / Order / Payment / Promotion / Loyalty

Storefront Commerce
  Storefront / Product Detail / Cart / Checkout / Payment / Booking / Order Tracking

Customer Engagement
  Customer Portal / Public Profile / Consent / Interest / Segment

Community
  Post / Review / Comment / Reaction / Follow / Feed / Moderation

Commerce Attribution
  Dynamic CTA / Buy From Review / Book From Review / Tracking / Attribution / Conversion

Commission
  Rule / Ledger / Wallet / Payout / Reversal / Audit

Messaging
  Event / Rule / Audience / Template / Channel / Delivery Log

Trust & Policy
  Consent / Policy / Moderation / Report / Appeal / Fraud Signal

Platform Operations
  Feature Flag / Entitlement / Owner Dashboard / Cost / Health Metric

Monetization
  Add-on / Usage Meter / Platform Fee / Platform Growth Support / Ads / Billing
```

---

# 12. Implementation Checklist

ใช้ checklist นี้ก่อนเริ่ม feature ใหม่ใน track นี้

- Feature นี้ใช้ customer/product/order source เดิมหรือไม่
- Feature นี้รองรับทั้ง store-led signup และ platform-led signup หรือไม่
- ถ้าลูกค้ายังไม่มี store membership จะเห็น/ทำอะไรได้บ้าง
- Feature นี้ต้องใช้ community opt-in, creator terms หรือ marketing consent หรือไม่
- Feature นี้ต้องถูกคุมด้วย feature flag หรือ plan entitlement หรือไม่
- Feature นี้ต้องเปิดใน storefront, customer dashboard, community feed หรือ store admin surface ใด
- ถ้าเป็น storefront ต้องใช้ product/service/order/payment source เดิมหรือไม่
- ถ้าเป็น checkout ต้องมี event สำหรับ attribution และ audit หรือไม่
- Feature นี้ผูกกับ product เท่านั้น หรือควรรองรับ service/booking/package ด้วย
- ถ้า target หมดสต็อก เลิกขาย หรือ inactive แล้ว CTA ต้องเปลี่ยนเป็นอะไร
- Feature นี้ต้องมี `organization_id` หรือไม่
- ข้อมูลนี้เป็น public, private, tenant-private หรือ platform-private
- ต้องขอ consent หรือไม่
- ต้องมี audit log หรือไม่
- ต้องมี ledger หรือไม่
- มีผลต่อเงิน แต้ม คูปอง ค่าคอม หรือ payout หรือไม่
- conversion trigger คือ paid order, paid booking, confirmed consultation, enrollment หรือ action อื่น
- ถ้าเป็น milestone/mission metric นี้ audit ได้หรือปั่นง่ายเกินไป
- ถ้าเป็น platform reward ต้องมี grant ledger, expiry, redemption และ revoke rule หรือไม่
- มี report/block/moderation หรือไม่
- มี quota/cost จาก media หรือ provider หรือไม่
- มี event ที่ควร emit หรือไม่
- event นี้จะถูกใช้โดย notification, analytics, attribution, commission หรือ achievement หรือไม่
- ต้องมี policy/moderation/appeal flow หรือไม่
- ต้องเพิ่ม metric ใน owner operating dashboard หรือไม่
- ต้องมี owner dashboard หรือ store dashboard หรือไม่
- ต้องมี migration และ RLS policy หรือไม่
- ต้องมี test case สำหรับ tenant isolation หรือไม่

---

# 13. Recommended Build Order

ลำดับที่แนะนำสำหรับการพัฒนาจริง:

```text
1. Customer Portal read-only
2. Consent + Notification Inbox
3. Coupon/Point customer view
4. Platform-led signup readiness
5. Storefront MVP read-only
6. Storefront cart / checkout / payment MVP
7. Public Profile opt-in
8. Verified Review from order item with review target abstraction
9. Community Feed basic
10. Dynamic CTA + Buy/Book From Review tracking
11. Attribution dashboard
12. Commission ledger
13. Wallet hold balance
14. Payout manual approval
15. Creator campaign
16. Store achievement / platform growth support
17. Promoted content
18. Messaging automation
19. Network intelligence
```

---

# 14. Open Decisions

ต้องให้ Project Owner ตัดสินใจก่อน freeze business rules:

1. ลูกค้ากลาง 1 account สามารถเป็นสมาชิกหลายร้านด้วย phone/email เดียวกันหรือไม่
2. Public profile ต้องเปิดด้วย default หรือ opt-in เท่านั้น
3. Community กลางจะเห็น content ข้ามร้านตั้งแต่ Phase 3 หรือเริ่มแบบ store community ก่อน
4. รีวิวที่รับค่าคอมต้อง public เท่านั้นหรือ store members only ได้ด้วย
5. Attribution window เริ่มต้นกี่วัน
6. ค่าคอมขั้นต่ำของร้านควรบังคับที่ 3% หรือให้ร้านปิด/เปิดเอง
7. Platform fee ควรแยกจาก reviewer commission หรือหักจาก commission
8. Payout เป็นเงินสด, store credit, wallet credit หรือหลายแบบ
9. LINE OA เป็น channel ต่อร้าน หรือ platform-owned LINE OA กลาง
10. Promoted content จะเปิดหลังมี organic review volume เท่าไร
11. Review target type แรกของ MVP จะเริ่มเฉพาะ product หรือเปิด service/booking schema ไว้ตั้งแต่แรก
12. สินค้า out_of_stock จะแสดง CTA ใดเป็น default: notify me, similar products, follow store หรือซ่อน CTA
13. สินค้า discontinued สามารถส่ง attribution ไป replacement product ได้หรือไม่ และต้องให้ร้านตั้ง rule ก่อนหรือไม่
14. ธุรกิจบริการ เช่น คลินิก ต้องใช้คำว่า Verified Booking, Verified Service หรือ Verified Visit
15. Lead/consultation จากรีวิวควรคิดคอมเมื่อใด: เมื่อส่ง lead, เมื่อนัดหมาย, เมื่อชำระเงิน หรือเมื่อบริการเสร็จ
16. Platform-led signup จะเปิดพร้อม Phase ใด และจะโปรโมทด้วยข้อความ positioning แบบใด
17. ลูกค้าที่สมัครตรงกับ platform แต่ยังไม่ได้ซื้อ/จองจริง สามารถโพสต์อะไรได้บ้าง
18. Public profile ของ platform-led signup ควรเปิด default เป็น draft, private หรือ public
19. Store membership จะถูกสร้างอัตโนมัติเมื่อ platform-led customer ซื้อจากร้านหรือจองบริการหรือไม่
20. Creator terms, community terms และ commission terms ต้องถูกยอมรับก่อน action ใด
21. Campaign directory สำหรับ platform-led customer จะเปิดให้ทุกคนเห็น หรือเฉพาะ account ที่ผ่าน creator eligibility
22. Store achievement MVP จะเริ่มจาก metric ใด: paid sales, completed orders, verified members หรือ verified reviews
23. Milestone จาก follower จะเปิดเมื่อใด และต้องมี fraud guard อะไรก่อน
24. Reward ประเภทใดให้ platform owner อนุมัติเอง และประเภทใดให้ระบบ grant อัตโนมัติ
25. Platform-funded coupon จะถือเป็นต้นทุนของ platform, ร้านค้า หรือ co-funded
26. Achievement ที่ได้จาก order แล้วภายหลัง refund/cancel ต้อง revoke reward อย่างไร
27. Platform growth support ควรแสดง label ต่อผู้ใช้ปลายทางอย่างไรเพื่อไม่ให้สับสนกับ paid ads
28. Storefront MVP จะเปิดเฉพาะ product ก่อน หรือรองรับ service/booking ตั้งแต่แรก
29. Checkout MVP จะใช้ payment provider ใด และรองรับ manual payment confirmation หรือไม่
30. Custom domain เป็น feature ของ plan ใด และต้องเปิดเมื่อใด
31. Storefront order จะสร้าง store membership อัตโนมัติหรือไม่
32. Cart จะรองรับสินค้าหลายร้านในตะกร้าเดียวหรือเริ่มจาก single-store cart

---

# 15. MVP Definition

MVP แรกที่ควรส่งมอบโดยไม่ใหญ่เกินไป:

```text
Customer Portal
  + private dashboard
  + consent setting
  + notification inbox
  + order/coupon/point read-only
  + store-led signup membership
  + platform-led account without store membership

Storefront
  + store landing page
  + product/service listing
  + product/service detail
  + join membership / follow store
  + basic cart / checkout / payment path

Verified Review
  + create review from purchased item
  + rating/text/images
  + public profile review tab
  + store admin review list

Basic Community
  + public profile
  + latest review feed
  + like/comment/report
```

ยังไม่ควรใส่ใน MVP แรก:

- payout จริง
- ads/boost
- complex feed algorithm
- creator marketplace
- cross-store recommendation ขั้นสูง
- custom domain / advanced storefront theme

---

# 16. Long-Term Vision

เมื่อระบบโตขึ้น ACOS จะไม่ใช่แค่เครื่องมือร้านค้า แต่เป็น commerce network ที่มี:

- ร้านค้า
- ลูกค้า
- creator/reviewer
- รีวิวจากผู้ซื้อจริง
- community feed
- affiliate commerce
- promoted discovery
- messaging automation
- insight ที่ช่วยร้านขายดีขึ้น

ทิศทางนี้ทำให้ ACOS มีรายได้มากกว่า SaaS subscription และสร้าง network effect ที่ทำให้ร้านค้าอยู่กับระบบนานขึ้น

---

# 17. Next Action

งานถัดไปที่ควรทำหลังเอกสารนี้:

1. Freeze business rules สำหรับ Phase 1: Customer Portal MVP
2. Freeze business rules สำหรับ Phase 1B: Platform-Led Signup Readiness
3. Freeze business rules สำหรับ Phase 1C/1D: Storefront และ Checkout MVP
4. ออกแบบ ER addendum สำหรับ customer account, acquisition source, store membership, public profile, consent, onboarding state, notification inbox
5. ออกแบบ ER addendum สำหรับ storefront, storefront visibility, cart, checkout session, payment intent และ booking request
6. ทำ API contract สำหรับ customer portal read model
7. ทำ API contract สำหรับ platform-led onboarding และ empty-state dashboard
8. ทำ API contract สำหรับ storefront read model และ checkout session
9. ทำ UI contract สำหรับ customer dashboard
10. ทำ UI contract สำหรับ store landing page / product detail / cart / checkout
11. ทำ UI contract สำหรับ platform signup / creator onboarding แบบยังไม่เปิด payout
12. ทำ migration plan สำหรับ Track B phase แรก

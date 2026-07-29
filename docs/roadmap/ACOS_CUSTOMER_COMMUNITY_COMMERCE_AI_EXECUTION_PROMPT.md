# ADORA Commerce OS (ACOS)
# CUSTOMER COMMUNITY COMMERCE AI EXECUTION PROMPT

**Document:** `ACOS_CUSTOMER_COMMUNITY_COMMERCE_AI_EXECUTION_PROMPT.md`  
**Status:** AI EXECUTION INSTRUCTION  
**Created:** 2026-07-29  
**Purpose:** ใช้เป็นคำสั่งมาตรฐานให้ AI/Developer อ่านและยึดคู่มือ Customer Community Commerce ก่อนออกแบบหรือพัฒนาฟีเจอร์ใน Track B

---

# 0. How To Use

เมื่อจะให้ AI/Developer ทำงานที่เกี่ยวกับ Customer Portal, Storefront, Checkout, Finance & Tax, Community, Review, Affiliate, Commission, Wallet, Messaging, Platform Growth Support หรือ Ads ให้เริ่มด้วยคำสั่งนี้:

```text
อ่านและยึดไฟล์นี้ก่อนเริ่มงาน:
docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_AI_EXECUTION_PROMPT.md

จากนั้นอ่านคู่มือหลัก:
docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_GROWTH_GUIDE.md

แล้วทำงาน: [ใส่ชื่องาน/ฟีเจอร์]
```

---

# 1. Required Reading

ก่อนเสนอแผน ออกแบบ schema เขียน migration หรือแก้โค้ด ต้องอ่านเอกสารเหล่านี้:

```text
docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_GROWTH_GUIDE.md
docs/roadmap/ACOS_MASTER_DEVELOPMENT_ROADMAP_V2.md
docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md
docs/governance/ACOS_AI_CODING_CONSTITUTION.md
reference/PROJECT_BLUEPRINT_V13.md
reference/BUSINESS_RULES_V13.md
reference/DATABASE_SCHEMA_V1_FROZEN_V3.md
```

ถ้างานเกี่ยวกับ database, migration, RLS หรือ Supabase ต้องอ่าน migration/status ที่เกี่ยวข้องล่าสุดก่อนด้วย

---

# 2. Mandatory Pre-Implementation Output

ก่อนลงโค้ดหรือสร้าง migration ต้องสรุปให้ Project Owner เห็นอย่างน้อย:

```text
Task:
[ชื่องาน]

Phase Mapping:
[งานนี้อยู่ Phase ใดในคู่มือ]

Domain Boundary:
[แตะ module/domain ใดบ้าง]

Source of Truth:
[ใช้ customer/product/order/payment source เดิมอะไร]

Tenant Boundary:
[ข้อมูลใดต้องมี organization_id / RLS / permission]

Public vs Private Data:
[ข้อมูลใด public, private, tenant-private, platform-private]

Event / Audit / Ledger:
[ต้องมี event, audit log, ledger หรือไม่]

Finance / Tax:
[เกี่ยวกับ receipt, tax invoice, VAT, expense, fee, refund, credit note, accountant export หรือไม่]

Consent / Policy / Moderation:
[ต้องตรวจ consent, policy, report/block/appeal หรือไม่]

Entitlement:
[ต้องคุมด้วย feature flag หรือ plan entitlement หรือไม่]

Migration:
[ต้องมี migration หรือไม่ กระทบ protected core หรือไม่]

Validation:
[จะทดสอบ/validate อะไร]
```

ถ้าตอบข้อใดไม่ได้ ให้หยุดและระบุว่าเป็น `DECISION REQUIRED`

---

# 3. Protected Core Rules

ห้ามทำสิ่งต่อไปนี้โดยไม่มีคำสั่งชัดเจนจาก Project Owner:

- สร้าง customer master ใหม่แทน customer source of truth เดิม
- สร้าง product catalog ใหม่แทน product source of truth เดิม
- สร้าง order/payment history ใหม่แทน Commerce Core
- แก้ migration เก่าที่ถูก freeze แล้ว
- ทำให้ร้านหนึ่งเห็นข้อมูล private ของร้านอื่น
- เปิดข้อมูล private customer ใน public profile
- ข้าม RLS / permission / audit requirement
- เปิด payout, ads หรือ monetization ที่ใช้เงินจริงก่อน trust layer พร้อม
- ทำ unlimited provider usage เช่น SMS/LINE/Email โดยไม่มี metering/quota

---

# 4. Phase Guardrail

ให้ map งานกับ phase จากคู่มือหลักเสมอ

```text
Phase 0: Foundation Alignment
Phase 1: Customer Portal MVP
Phase 1B: Platform-Led Signup Readiness
Phase 1C: Storefront MVP
Phase 1D: Storefront Cart / Checkout / Payment MVP
Phase 1E: Finance & Tax Control MVP
Phase 2: Verified Review MVP
Phase 3: Public Profile + Basic Community Feed
Phase 4: Buy From Review + Attribution
Phase 5: Commission Ledger + Wallet Hold
Phase 6: Payout + Creator Controls
Phase 7: Store Campaign Marketplace
Phase 8: Platform Growth Support / Store Achievement Program
Phase 9: Promoted Content / Internal Ads
Phase 10: Advanced Notification & Automation
Phase 11: Network Intelligence
```

ถ้างานอยู่ phase หลัง แต่ dependency phase ก่อนยังไม่พร้อม ให้รายงาน dependency ก่อนทำงาน

---

# 5. System Completeness Checklist

ทุกฟีเจอร์ใหม่ต้องตรวจ 8 เสาหลักนี้:

```text
1. Identity & Consent
2. Storefront as Conversion Center
3. Trust Layer Before Monetization
4. Event System
5. Ledger for Every Value Movement
6. Policy & Moderation Center
7. Owner Operating Dashboard
8. Feature Flag & Plan Entitlement
```

ให้ตอบสั้น ๆ ว่าแต่ละข้อ:

```text
Required / Not Required / Deferred / Decision Required
```

---

# 6. Data Design Rules

เมื่อออกแบบ table/entity ใหม่:

- tenant-owned data ต้องมี `organization_id`
- public community data ต้องแยกจาก private account data
- storefront ต้องใช้ product/service/order/payment source เดิม
- checkout session ต้องรองรับ attribution event
- finance/tax document ต้องอ้างอิง order/payment/refund/return source เดิม และห้าม rewrite commercial source of truth
- receipt, tax invoice, credit note และ debit note ต้องมีเลขเอกสารที่ audit ได้และไม่ reuse หลังยกเลิก
- output VAT ต้องผูกกับยอดขายหรือ tax invoice rule ส่วน input VAT ต้องผูกกับ expense/purchase/supplier bill
- expense/supplier bill ต้องมี tenant boundary, permission, audit และ attachment policy
- review ต้องรองรับ `review_target` ไม่ lock กับ product อย่างเดียว
- review ที่มี badge ต้องผูกกับ purchase/booking/service จริง
- financial/value movement ต้องใช้ ledger
- reward/boost credit/messaging quota ต้องมี grant, expiry, redemption, reversal
- consent ต้องตรวจซ้ำก่อน marketing delivery
- feature entitlement ต้องคุม feature สำคัญต่อ plan/tenant

---

# 7. Event Naming Guidance

ใช้ event กลางเพื่อเชื่อม notification, automation, analytics, attribution, commission และ achievement

ตัวอย่าง event:

```text
customer_joined_store
customer_opted_into_community
storefront_viewed
product_viewed
service_viewed
checkout_started
checkout_completed
order_paid
order_refunded
booking_created
booking_paid
review_created
review_clicked
review_reported
affiliate_clicked
affiliate_attributed
commission_pending
commission_approved
commission_reversed
payout_requested
payout_paid
milestone_achieved
reward_granted
reward_redeemed
content_reported
```

ห้าม hard-code provider behavior เช่น LINE/SMS/Email ลงใน business module โดยตรง ให้ผ่าน messaging/event boundary

---

# 8. Validation Gates

อย่างน้อยต้องพิจารณา test/validation ต่อไปนี้:

- tenant isolation
- RLS/permission
- private/public profile separation
- consent before marketing delivery
- verified purchase/booking review guard
- storefront visibility
- cart/checkout does not bypass stock/promotion/payment rules
- attribution token behavior
- ledger balance/reversal
- commission hold/reversal
- fraud guard for reward/commission
- moderation report/hide/appeal
- feature entitlement per plan
- owner/store/customer dashboard read model correctness

---

# 9. Stop Conditions

ให้หยุดและถาม Project Owner ก่อนถ้า:

- ต้องเปลี่ยน protected core
- source of truth ไม่ชัด
- tenant boundary ไม่ชัด
- มีข้อมูล private อาจรั่วไป public/community
- ต้องเปิดเงินจริง เช่น payout, paid ads, payment provider, platform-funded coupon
- ต้องใช้ provider cost เช่น SMS/LINE/Email โดยยังไม่มี quota/meter
- business rule ยังไม่ freeze
- migration กระทบ table หลักที่ freeze แล้ว

---

# 10. Recommended Task Prompt Template

ใช้ prompt นี้เมื่อต้องให้ AI ทำงานต่อ:

```text
อ่าน:
docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_AI_EXECUTION_PROMPT.md
docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_GROWTH_GUIDE.md

งาน:
[อธิบายงาน]

ก่อนลงมือ ให้สรุป Mandatory Pre-Implementation Output ก่อน
ถ้างานกระทบ protected core หรือยังมี decision required ให้หยุดถามก่อน
ถ้าพร้อม ให้ทำ implementation ตาม repo pattern และเพิ่ม validation ที่จำเป็น
```

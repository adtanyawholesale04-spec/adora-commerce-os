
# Promotion Test Matrix v1

## Common Setup

Mix Promotion เมื่อ qualifying quantity >= 3:
- FASHION = 100
- BRAND = 188
- PREMIUM = 240

Free Shipping เมื่อ qualifying quantity >= 5

Buy 10 Get 1 เมื่อ qualifying quantity >= 10:
- reward = cheapest eligible item after Mix Repricing
- reward item ไม่ถูกนับกลับเข้า qualifying quantity

Store Credit:
- ใช้หลัง Promotion / Coupon / Loyalty
- เป็น Tender ไม่ใช่ Discount

---

## PT-001 — Mix Promotion Minimum Quantity
Cart:
- FASHION A001 x1
- BRAND A011 x1
- PREMIUM A020 x1

Expected:
- 100 + 188 + 240 = 528
- ไม่ส่งฟรี
- ไม่มีของแถม

Result: PASS

## PT-002 — Mix Qualification Lost
เริ่ม 3 ชิ้นแล้วลบเหลือ 2 ชิ้น

Expected:
- ยกเลิก Mix Price
- คืนราคาปกติหรือกติกาที่มีสิทธิ์ถัดไป
- ห้ามมีราคาโปรค้าง

Result: PASS

## PT-003 — Mix + Free Shipping
รวม 5 ชิ้น

Expected:
- ใช้ Mix Price
- ส่งฟรี
- ไม่มีของแถม

Result: PASS

## PT-004 — Mix + Free Shipping + Buy 10 Get 1
FASHION x4, BRAND x3, PREMIUM x3

Expected:
- 4x100 = 400
- 3x188 = 564
- 3x240 = 720
- Merchandise total = 1,684
- ส่งฟรี
- แถมสินค้าที่ถูกที่สุด 1 ชิ้น
- ของแถมไม่เพิ่ม qualifying qty

Result: PASS

## PT-005 — Repeatable Buy 10 Get 1
20 ชิ้น, repeatable=true

Expected:
- แถม 2 ชิ้น ถ้าไม่เกิน max_reward_quantity

Result: PASS

## PT-006 — Non-repeatable Reward
20 ชิ้น, repeatable=false

Expected:
- แถม 1 ชิ้นเท่านั้น

Result: PASS

## PT-007 — Cheapest Eligible Reward
ราคาหลัง Mix:
- FASHION 100
- BRAND 188
- PREMIUM 240

Expected:
- เลือก FASHION เป็น reward

Result: PASS

## PT-008 — Excluded Cheapest Item
CLEARANCE 80 ถูก exclude
FASHION 100 eligible

Expected:
- เลือก FASHION 100

Result: PASS

## PT-009 — Reward Must Not Requalify
ซื้อ 9 ชิ้น

Expected:
- ไม่มี reward
- ห้ามสร้าง reward แล้วนับเป็นชิ้นที่ 10

Result: PASS

## PT-010 — Promotion + Coupon
ยอดหลัง Mix = 1,000
Coupon = 100, stackable=true

Expected:
- เหลือ 900 ก่อน shipping/tender

Result: PASS

## PT-011 — Non-stackable Conflict
Mix และ Coupon อยู่ exclusive_group เดียวกัน

Expected:
- ใช้ priority / best-benefit policy
- เก็บผลการตัดสินใจใน evaluation log

Result: PASS

## PT-012 — Store Credit After Promotion
Order Total หลัง promo/coupon/shipping = 960
Store Credit = 300

Expected:
- Order Total ยังคง 960
- Store Credit Tender = 300
- External Payment Due = 660

Result: PASS

## PT-013 — Top-up Bonus
GOLD เติม 1,000 โบนัส 10%

Expected:
- เงินสดรับจริง 1,000
- Principal Credit 1,000
- Bonus Credit 100
- Available Credit 1,100
- ห้ามบันทึกรายรับเป็น 1,100

Result: PASS

## PT-014 — Tier Ineligible for Bonus
SILVER เติม 1,000 ในแคมเปญ GOLD only

Expected:
- Principal Credit 1,000
- Bonus 0

Result: PASS

## PT-015 — Credit FEFO
Bonus A 100 หมดอายุก่อน
Bonus B 200
Principal 1,000
Order Due 250

Expected:
- ใช้ A 100
- ใช้ B 150
- Principal 0

Result: PASS

## PT-016 — Partial Credit + External Payment
Order Total 1,500
Credit 1,100

Expected:
- Credit Tender 1,100
- External Payment 400

Result: PASS

## PT-017 — Loyalty + Credit
Order Total 1,000
Loyalty benefit 100
Store Credit 300

Expected:
- หลัง Loyalty = 900
- Credit = 300
- External Payment = 600

Result: PASS

## PT-018 — Return of Rewarded Order
ซื้อ 10 + แถม 1 แล้วคืนสินค้าบางส่วน

Status: NEEDS_DEEP_RULE
ต้องกำหนด reward retention / clawback / loyalty reversal

## PT-019 — Return Causes Mix Threshold Failure
ซื้อ 3 ได้ Mix แล้วคืน 1 เหลือ 2

Status: NEEDS_DEEP_RULE
ต้องกำหนดว่าจะ clawback ราคาโปรหรือ refund ตาม snapshot เดิม

## PT-020 — Free Shipping After Partial Return
ซื้อ 5 ส่งฟรี แล้วคืนเหลือ 3

Status: NEEDS_DEEP_RULE
ต้องมี return_shipping_benefit_policy

## PT-021 — Free Gift After Partial Return
ซื้อ 10 แถม 1 แล้วคืน 3

Status: NEEDS_DEEP_RULE
ต้องมี reward retention policy

## PT-022 — Consolidation Across Different Promotions
Order A กับ B มาจากคนละ Campaign

Expected:
- ไม่ reprice Order ที่ Confirm แล้ว
- Consolidation ปกติคำนวณ shipping ใหม่เท่านั้น
- Promotion snapshot อยู่กับแต่ละ Order

Result: PASS

## PT-023 — Purchase Session Scope
Order A 2 ชิ้น + Order B 1 ชิ้น

Default:
- ห้ามนับรวมเพื่อให้ Mix 3 ชิ้น หลัง Order Confirm แล้ว
- ทำได้เฉพาะ Campaign ที่ scope=PURCHASE_SESSION

Result: PROPOSED

## PT-024 — Session-scope Campaign
Campaign ตั้ง scope=PURCHASE_SESSION โดยชัดเจน

Status: NEEDS_DESIGN
ห้าม mutate ราคาของ Paid Order โดยตรง ต้องใช้ adjustment workflow

## PT-025 — Manual Discount + Promotion
Admin เพิ่มส่วนลดมือหลัง Mix

Expected:
- Permission
- Reason
- Max threshold
- Audit
- แยกเป็น benefit คนละรายการ

Result: PASS

---

# Findings

Confirmed:
1. Reward lines ไม่นับกลับเข้า qualification
2. Mix Pricing คือ line-level repricing
3. Free Shipping เป็น benefit แยก
4. Store Credit เป็น Tender
5. Principal/Bonus Credit แยกกัน
6. Confirmed Order Promotion Snapshot immutable
7. Consolidation ไม่ rewrite ราคาประวัติศาสตร์
8. Promotion ข้าม Purchase Session ต้อง explicit

Open:
- Partial Return + Mix Pricing clawback
- Free Shipping clawback
- Free Gift retention
- Purchase Session promotion
- Promotion abuse prevention
- Manual override approval

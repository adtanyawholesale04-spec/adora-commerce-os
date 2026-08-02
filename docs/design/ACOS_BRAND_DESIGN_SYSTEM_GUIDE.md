# ADORA Commerce OS (ACOS)
# Brand & Design System Guide

**Document:** `ACOS_BRAND_DESIGN_SYSTEM_GUIDE.md`  
**Status:** PROPOSED FOR OWNER REVIEW  
**Created:** 2026-07-29  
**Companion Presentation:** `docs/design/ACOS_BRAND_DESIGN_SYSTEM_PRESENTATION.html`  
**Purpose:** คู่มือทิศทาง Brand, UI, สี, สัญลักษณ์, component และหน้าจอหลักของ ACOS เพื่อใช้ร่วมกับ AI/Developer ก่อนพัฒนา UI จริง

---

# 1. Brand Positioning

ACOS คือ Commerce Operating System สำหรับร้านค้าไทยที่ต้องคุมงานขาย ลูกค้า ไลฟ์ สต๊อก ออเดอร์ การเงิน ภาษี และ community ในระบบเดียว

บุคลิกของระบบ:

- มืออาชีพ
- น่าเชื่อถือ
- ใช้งานจริงทุกวัน
- เร็วต่อการขาย
- คุมข้อมูลและเอกสารได้
- เติบโตต่อเป็น community commerce ได้

ระบบไม่ควรรู้สึกเหมือน:

- landing page โฆษณาที่เน้นภาพใหญ่เกินงานจริง
- SaaS ที่เย็นชาและซับซ้อนเกินร้านค้าไทย
- dashboard ที่ใช้สีเยอะจนแยกสถานะไม่ออก
- mobile web ที่เป็นแค่ desktop ย่อส่วน

---

# 2. Recommended Visual Direction

ใช้แนวทาง `Commerce Trust + Operational Clarity`

ความหมาย:

- Trust: เอกสาร ยอดเงิน ภาษี สิทธิ์ และ audit ต้องดูน่าเชื่อถือ
- Commerce: ปุ่มขาย ปิดบิล live checkout และ customer action ต้องเห็นเร็ว
- Operational: ตาราง filter drawer badge และ status ต้องอ่านง่ายสำหรับงานซ้ำ
- Growth: community, review, affiliate และ storefront ต้องดูทันสมัย แต่ไม่กลบงานหลัก

---

# 3. Color System

## 3.0 Typography

- ฟอนต์หลักสำหรับภาษาไทยคือ `Noto Sans Thai` จาก Google Fonts
- ภาษาอังกฤษใช้ `Noto Sans Thai` ร่วมกับ fallback system sans เพื่อให้ visual language เป็นชุดเดียวกัน
- CSS font stack มาตรฐาน:

```css
font-family: "Noto Sans Thai", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
```

- ต้องโหลดน้ำหนักที่ใช้จริงอย่างน้อย `400`, `500`, `600`, `700`
- ตัวเลข ราคา รหัสสินค้า และข้อมูลในตารางต้องใช้ font เดียวกันเพื่อให้ความกว้างคอลัมน์คงที่
- ห้ามใช้ฟอนต์คนละชุดระหว่าง Admin, Customer Portal, Storefront และ Live Helper โดยไม่มีเหตุผลด้าน product

## 3.1 Recommended Palette

```text
Dark Purple / Brand   #210B2C
Wisteria / Secondary  #BC96E6
Sunglow / Accent      #FFD166
Ink / Main Text       #210B2C
Muted Text            #665A72
Surface               #FAF7FD
Panel                 #FFFFFF
Line / Border         #E7DFF2
```

### Brand Color Ratio: 60 / 30 / 10

```text
Dark Purple  60%  โครงสร้างหลัก, sidebar, topbar, heading, พื้นที่สำคัญ และภาพจำของ ACOS
Wisteria     30%  secondary surface, selected state, panel, illustration, navigation support
Sunglow      10%  CTA, notification, highlight, reward, promotion และจุดที่ต้องการให้หยุดสายตา
```

ความหมายของสีแบรนด์:

- Dark Purple คือความเป็นระบบ ความมั่นใจ และตัวตนหลักของ ACOS ใช้เป็นสีที่ผู้ใช้จำได้ทันที
- Wisteria ทำให้หน้าจอมีมิติและเป็นมิตร ใช้กับพื้นที่รองและสถานะ selected โดยไม่แย่งความสำคัญจาก action
- Sunglow ใช้ในปริมาณจำกัดเพื่อดึงสายตา เช่น สร้างออเดอร์, รับคูปอง, ใช้แต้ม, โปรโมชัน และ achievement
- สีแบรนด์ไม่ควรใช้แทนสถานะธุรกิจ เช่น ห้ามใช้ Sunglow แทนทั้ง pending และ campaign พร้อมกัน

กฎการใช้งาน:

- พื้นที่ navigation และ shell ใช้ Dark Purple เป็นหลัก
- พื้นที่ content ใช้ Panel/Surface ที่อ่อนลง ไม่เทสีเข้มเต็มหน้าจอ
- Wisteria ใช้เป็นพื้นรองหรือ border ที่มี tint; หลีกเลี่ยงการใช้ตัวอักษร Wisteria บนพื้นขาวที่ contrast ต่ำ
- Sunglow ต้องมีข้อความหรือไอคอนสี Dark Purple คู่กันเพื่อให้อ่านง่าย
- ห้ามเพิ่มสีหลักใหม่โดยไม่มีเหตุผลด้าน brand หรือ accessibility

## 3.2 Status Colors

```text
Success / Paid / Completed       Green
Pending / Waiting / Draft        Amber
Info / Processing / Shipping     Blue
Danger / Cancel / Refund         Orange-Red
Tax / Finance Document           Purple
Neutral / Archived / Inactive    Gray
```

กฎ:

- สถานะเดียวกันต้องใช้สีเดียวกันทุก module
- Badge ต้องอ่านได้บนพื้นขาวและพื้นเทาอ่อน
- สีแดง/ส้มเข้มใช้เฉพาะ error, refund, cancel, risk, overdue
- สีม่วงใช้กับ tax/finance document เพื่อแยกจาก payment success

## 3.3 Language & Appearance Preferences

### ภาษา

- ภาษาเริ่มต้นของระบบคือภาษาไทย (`th-TH`)
- รองรับภาษาอังกฤษ (`en-US`) ผ่าน language switcher ใน user preference และ organization setting
- ต้องแปลให้ครบทั้ง navigation, page title, table header, filter, action, status, notification, validation, empty state และ error message
- ชื่อสินค้า ชื่อลูกค้า ที่อยู่ หมายเหตุ และข้อมูลที่ผู้ใช้กรอกเองไม่ถูกแปลอัตโนมัติ
- วันที่ เวลา จำนวนเงิน และตัวเลขต้องใช้ locale ของภาษาที่เลือก แต่ต้องมี timezone ขององค์กรกำกับ
- ใช้ translation key แทน hard-coded text เพื่อให้เพิ่มภาษาในอนาคตได้โดยไม่แก้ business logic
- หากยังไม่มีคำแปล ให้ fallback เป็นภาษาไทยและบันทึก missing translation สำหรับทีมพัฒนา

### Light / Dark Mode

- รองรับ `Light`, `Dark` และ `System default` โดยค่าเริ่มต้นคือ `Light`
- ผู้ใช้เลือก theme ส่วนตัวได้ และองค์กรกำหนด default theme สำหรับสมาชิกใหม่ได้
- การสลับ theme ต้องใช้ design tokens เดิม ไม่สร้างสีชุดใหม่แบบกระจายตามหน้า
- Dark mode ต้องคงอัตราส่วนแบรนด์ 60/30/10 โดยใช้ Dark Purple เป็นพื้นฐานเข้ม, Wisteria เป็น secondary highlight และ Sunglow เป็น accent อย่างจำกัด
- ตาราง, drawer, modal, tooltip, chart, badge, image preview และ focus state ต้องมีคู่สีของทั้งสอง theme
- ต้องรองรับ keyboard focus และ contrast ที่อ่านได้ในทั้ง Light/Dark รวมถึงสถานะ disabled และ error
- บันทึก preference ที่ระดับ user; หากไม่มีค่าของ user ให้ใช้ organization setting และสุดท้ายใช้ system default

---

# 4. Module Identity

แต่ละ module ควรมีสีและสัญลักษณ์คงที่ เพื่อช่วยให้ผู้ใช้จำตำแหน่งงานได้เร็ว

```text
Dashboard        Dark Purple  ภาพรวมธุรกิจ
Customers / CRM  Wisteria     ลูกค้า สมาชิก consent profile
Orders           Dark Purple  คำสั่งซื้อ สถานะ fulfillment
Products         Sunglow      สินค้า ตัวเลือก ราคา visibility
Inventory        Wisteria     สต๊อก movement warehouse
Payments         Dark Purple  การรับเงิน transaction refund
Finance & Tax    Wisteria     ใบเสร็จ ใบกำกับ ภาษีซื้อ ภาษีขาย ค่าใช้จ่าย
Live Commerce    Sunglow      live session รหัสสินค้า บิล แชท
Storefront       Dark Purple  หน้าร้าน product detail checkout booking
Community        Wisteria     รีวิว โพสต์ comment follow
Settings         Dark Purple  organization plan permission configuration
```

กฎ:

- สี module ใช้เป็น accent ไม่ใช่พื้นหลังทั้งหน้า
- Navigation icon, badge และ empty state อ้างอิงสี module ได้
- ห้ามสร้างสี module ใหม่โดยไม่มีเหตุผลด้าน product

---

# 5. Layout Principles

## 5.1 Admin Web

โครงหลัก:

```text
Sidebar
Topbar
Page header
Filter/action row
Primary table or workflow panel
Detail drawer / modal
```

เหมาะสำหรับ:

- Orders
- Payments
- Inventory
- Finance & Tax
- Customers
- Live Commerce staff console

กฎ:

- sidebar ต้อง permission-aware
- sidebar บนคอมพิวเตอร์และแท็บเล็ตต้องมีปุ่มซ่อน/แสดงเมนู
- collapsed sidebar ต้องเหลือเฉพาะไอคอนเมนูเพื่อเพิ่มพื้นที่ทำงาน
- เมื่อ hover หรือ focus ที่ไอคอนใน collapsed sidebar ต้องแสดง tooltip/popover ชื่อเมนู
- expanded/collapsed state ควรถูกจำต่อผู้ใช้หรือ device preference
- topbar ต้องรองรับ organization switcher และ notification
- topbar ต้อง sticky/fixed อยู่ด้านบนของ workspace ขณะ scroll ตารางหรือ content
- topbar ไม่ควรถูกซ่อนเมื่อ sidebar collapse
- primary action มีได้ 1-2 จุดต่อหน้า
- action ที่เสี่ยงต้องอยู่ใน drawer/modal พร้อม confirmation
- table ต้องรองรับ empty, loading, error, permission denied

Desktop / tablet navigation behavior:

```text
Expanded sidebar:
  แสดงไอคอน + ชื่อเมนู

Collapsed sidebar:
  แสดงเฉพาะไอคอน
  hover/focus แสดง tooltip ชื่อเมนู
  active state ยังต้องเห็นชัด

Sticky topbar:
  อยู่คงที่ด้านบนของ content
  มี organization switcher, search, notification, quick action
```

Mobile behavior:

- ไม่บังคับใช้ sidebar แบบ desktop
- ใช้ bottom navigation, compact drawer หรือ module switcher ตามหน้าจอ
- ต้องรักษา quick action หลักให้เข้าถึงง่าย

## 5.2 Customer Portal

โครงหลัก:

```text
Mobile-first dashboard
Profile summary
Coupon / Points / Orders
Bill / Receipt
Review / Community
Notification inbox
Consent settings
```

กฎ:

- ลูกค้าต้องเห็นข้อมูลของตัวเองเท่านั้น
- ข้อมูล private จากร้านต้องไม่เปิด public profile
- action เช่น claim coupon, use points, request tax invoice ต้องมี event/audit
- mobile ต้องใช้งานง่ายกว่าหน้า desktop

## 5.3 Storefront

โครงหลัก:

```text
Store profile
Product/service list
Product/service detail
Cart / Checkout
Review summary
Join / Follow / Claim benefit
```

กฎ:

- storefront ต้องใช้ product/service/order/payment source เดิม
- ไม่เปิดสินค้าที่ inactive/hidden
- CTA ต้องเปลี่ยนตามสถานะสินค้า เช่น in stock, out of stock, discontinued

---

# 6. Component Rules

## 6.1 Buttons

ประเภทปุ่ม:

```text
Primary      action หลักของหน้า
Secondary    action รอง
Ghost        ดูรายละเอียด / เปิด drawer / filter
Danger       cancel / refund / risky action
Icon Button  action สั้น เช่น search, filter, export, refresh
```

กฎ:

- หน้า operational ไม่ควรมี primary action หลายปุ่มเกินไป
- action ที่เขียนข้อมูลจริงต้องผ่าน guarded action/service contract
- ปุ่ม disabled ต้องมีเหตุผลที่แสดงใน tooltip หรือ helper text

## 6.2 Badges

ใช้สำหรับ:

- order status
- payment status
- fulfillment status
- tax document status
- review visibility
- moderation status
- entitlement/plan state

กฎ:

- ใช้ text สั้น
- ใช้สีจาก status token เท่านั้น
- ไม่ใช้ badge แทนปุ่ม action

## 6.3 Tables

กฎ:

- column แรกควรเป็น identity เช่น order number, customer, document number
- column สถานะต้องใช้ badge
- column เงินต้องจัดรูปแบบ currency ชัดเจน
- row action เปิด detail drawer ก่อน action จริง
- mobile table ต้องเปลี่ยนเป็น list/card ที่อ่านง่าย

### ACOS Data Table Standard

ตารางของ ACOS เป็น work surface กลางสำหรับข้อมูลจำนวนมาก เช่น สินค้า ลูกค้า ออเดอร์ รีวิว การจอง ไลฟ์ และเอกสารการเงิน จึงควรใช้โครงเดียวกันทุกโมดูล:

```text
Page header
  └─ primary action + export / refresh / help
Query bar
  └─ keyword + filter chips + date range + saved view
Table toolbar
  └─ selected count + bulk actions + density + column settings
Data table
  └─ row number + select + identity + metrics + status + row actions
Footer
  └─ total count + page size + page navigation + go to page
```

ความสามารถที่ต้องรองรับ:

- ปรับความกว้างคอลัมน์ด้วย drag handle และ double-click เพื่อพอดีกับข้อมูล
- sort แบบ 3 สถานะ: ยังไม่เรียง, น้อยไปมาก/เก่าไปใหม่, มากไปน้อย/ใหม่ไปเก่า พร้อมบอกคอลัมน์ที่กำลังเรียง
- checkbox ระดับ header และระดับแถว พร้อม indeterminate state เมื่อเลือกบางรายการ
- bulk action เช่น เปิด/ปิดใช้งาน, เปลี่ยนสถานะ, ใส่ tag, ส่งข้อความ, export, assign และ archive
- bulk action ต้องตรวจสิทธิ์ราย action และแสดงเหตุผลเมื่อ disabled; ห้ามทำ action ที่ผู้ใช้ไม่มีสิทธิ์แม้จะเลือกแถวได้
- column settings สำหรับซ่อน/แสดง, เรียงลำดับ, reset เป็นค่าเริ่มต้น และบันทึกเป็น saved view
- saved view แยกตามผู้ใช้และองค์กร รองรับ default view ของผู้ดูแลระบบ
- sticky header, sticky identity column และ sticky action column เมื่อเลื่อนแนวนอนบนจอใหญ่หรือแท็บเล็ต
- รูปภาพใช้ thumbnail ขนาดคงที่; กดเพื่อเปิด preview ไม่ทำให้ความสูงแถวกระโดด
- cell แสดงข้อความยาวด้วย ellipsis และ tooltip; ตัวเลขชิดขวา, รหัส/วันที่ใช้รูปแบบที่ copy ได้
- inline edit ใช้เฉพาะ field ที่ปลอดภัยและมี permission เฉพาะ; field สำคัญให้เปิด drawer พร้อม validation และ audit log
- row click เปิด detail drawer; action ที่แก้ข้อมูลต้องแยกจาก row click เพื่อไม่ให้กดผิด
- footer ต้องแสดงจำนวนทั้งหมด, page size 20/50/100, หน้าปัจจุบัน, หน้าสุดท้าย และช่องไปหน้าที่ต้องการ
- เมื่อเปลี่ยน filter หรือ sort ให้ reset เป็นหน้าแรก; เมื่อกลับเข้าหน้าเดิมให้คืนค่า view ที่บันทึกไว้
- รองรับ loading skeleton, empty result, error/retry, partial data และ permission denied

### Permission Model ของตาราง

สิทธิ์ควรแยกเป็นความสามารถ ไม่ผูกไว้กับปุ่มเดียว:

```text
table.view              ดูรายการ
table.select            เลือกหลายรายการ
table.inline_edit       แก้ไขใน cell
table.bulk_edit         แก้ไขหลายรายการ
table.export            ส่งออกข้อมูล
table.configure_columns ปรับคอลัมน์และ saved view
table.delete/archive    ลบหรือเก็บถาวร
```

### Responsive Behavior

- Desktop: แสดงคอลัมน์หลักหลายชุด, resize ได้, มี sticky identity/action และ horizontal scroll ในพื้นที่ตาราง
- Tablet: เปิดโหมด compact โดยอัตโนมัติ, ตรึงคอลัมน์รหัส/ชื่อและ action, filter เปิดเป็น drawer เพื่อไม่บีบตาราง
- Mobile: เปลี่ยนเป็น list row หรือ card โดยคง identity, status, metric สำคัญ และ action หลัก; รายละเอียดเต็มเปิด drawer/page
- ห้ามย่อ font จนอ่านยาก และห้ามทำให้ปุ่ม action ชนกันเพราะคอลัมน์แคบ

### ตารางตามโมดูล

```text
สินค้า       รูป, SKU, ชื่อ, ราคา, stock, status, updated, action
ลูกค้า        avatar, ชื่อ, ร้านต้นทาง, ยอดซื้อ, แต้ม, last active, consent
ออเดอร์       order no., customer, channel/live, payment, fulfillment, total
รีวิว         product/service, rating, media, verified, moderation, commission
การจอง        booking no., customer, service, slot, payment, status
Finance/Tax  document no., source order, tax type, amount, VAT, status, export
```

หลักการสำคัญคือใช้ component เดียวกัน แต่ให้แต่ละโมดูลกำหนด column preset, filter schema, bulk actions และ permission ของตัวเองผ่าน configuration ไม่ copy ตารางคนละชุดจนพฤติกรรมไม่เหมือนกัน

## 6.4 Dropdowns

ใช้รูปแบบตามชนิดของงาน:

```text
Basic Select       ค่าเดียว รายการไม่มาก
Searchable Select  ค่าเดียว รายการจำนวนมาก เช่น SKU / ลูกค้า
Multi Select       หลายค่า พร้อม checkbox
Filter Dropdown    ตัวกรองตาราง แสดงค่าที่เลือกเป็น chip
Action Dropdown    คำสั่งหลายรายการ เช่น bulk action / export
Column Settings    ซ่อน แสดง เรียง และบันทึก saved view
```

กฎการออกแบบ:

- Desktop/Tablet ใช้ popover ใต้ปุ่มและจัดตำแหน่งไม่ให้หลุดขอบ viewport
- Mobile ใช้ bottom sheet เมื่อรายการมีหลายตัวเลือกหรือมี search field
- ใช้ chevron icon ขนาดเล็กที่จัดกึ่งกลางแนวตั้งแทนตัวอักษร `v` หรือ `⌄`; ไม่ใส่วงกลมหรือกรอบซ้อนรอบ chevron โดยไม่จำเป็น
- Dropdown trigger ทุกประเภทของระบบต้องใช้ chevron รูปแบบเดียวกัน รวมถึง Basic Select, Searchable Select, Multi Select, Filter, Action และ Column Settings
- รายการที่เลือกแล้วใช้ Wisteria เป็น selected state; CTA สำคัญใช้ Sunglow; action อันตรายใช้ danger token
- Dropdown ต้องมี keyboard navigation, focus state, escape to close และปิดเมื่อเลือกเสร็จตามชนิดของ control
- Searchable/Multi Select ต้องมี empty result, loading และ clear selection state
- Filter ที่ active ต้องมองเห็นบน toolbar และ reset ได้ในครั้งเดียว
- Action Dropdown ต้องตรวจ permission ก่อนแสดงหรือกด action และต้องมี confirmation สำหรับงานเสี่ยง
- ห้ามใช้ Dropdown ซ้อน Dropdown ในพื้นที่แคบ; เปลี่ยนเป็น drawer หรือ modal เมื่อ workflow ซับซ้อน

## 6.5 Drawers / Modals

ใช้สำหรับ:

- detail preview
- guarded action
- confirmation
- edit form ที่ไม่ใหญ่เกินไป

กฎ:

- drawer เหมาะกับอ่านรายละเอียดระหว่างยังไม่ออกจาก list
- modal เหมาะกับ decision/action ที่ต้อง confirm
- action เสี่ยงต้องมี audit reason เมื่อจำเป็น

## 6.6 Core UI Component Inventory

HTML presentation ต้องใช้เป็น visual reference ของ component กลางชุดนี้:

```text
Button       primary / secondary / ghost / danger / icon action
Input        text / search / date / number / focus / validation
Dropdown     basic / searchable / multi / filter / action / columns
Badge        success / pending / info / danger / tax / neutral
Toggle       on / off / disabled พร้อม label ที่ชัดเจน
Tabs         active / inactive / overflow
Table        select / sort / resize / sticky / pagination / bulk action
Toast        success / warning / error / info พร้อม dismiss
Drawer       detail preview / edit / filter / mobile bottom sheet
Modal        confirm / guarded action / form
Upload       image / video / document พร้อม progress และ error
Empty State  no data / no result / permission denied / retry
```

ทุก component ต้องมี default, hover, focus, active, disabled, loading, error และ responsive state ตามความเหมาะสม ไม่สร้าง component ใหม่ถ้าสามารถใช้ชุดกลางและ configuration ได้

---

# 7. Required States

ทุกหน้าหลักต้องออกแบบ state เหล่านี้:

```text
Loading
Empty
Error
Permission denied
Read-only
Filtered empty
Action pending
Action success
Action failed
```

ตัวอย่าง:

- Orders empty: ยังไม่มีออเดอร์ในช่วงเวลานี้
- Finance empty: ยังไม่มีเอกสารภาษีหรือค่าใช้จ่าย
- Live empty: ยังไม่มี live session ที่เปิดอยู่
- Community empty: ยังไม่มีรีวิวหรือโพสต์ที่เผยแพร่

---

# 8. Screen Priority

ลำดับหน้าที่ควรทำ prototype หลัง owner อนุมัติ design direction:

1. Admin Dashboard
2. Orders List + Detail Drawer
3. Payments Read Model
4. Live Commerce Helper Console
5. Finance & Tax Dashboard
6. Customer Portal Mobile Dashboard
7. Storefront Product Detail / Checkout
8. Community Review Feed

เหตุผล:

- Dashboard และ Orders เป็น pattern กลางของระบบ admin
- Payments และ Finance & Tax ใช้พิสูจน์ status, money, document และ audit
- Live Commerce ใช้พิสูจน์ quick action และ mobile helper
- Customer Portal และ Storefront ใช้พิสูจน์ customer-facing mobile design

---

# 9. Finance & Tax UI Guidance

Finance & Tax เป็น module ที่ต้องดูน่าเชื่อถือเป็นพิเศษ

หน้าหลักควรมี:

- sales summary
- paid amount
- refund amount
- output VAT
- input VAT
- expense
- gross margin estimate
- pending tax invoice request
- document export

Action สำคัญ:

- create receipt
- create tax invoice
- record expense
- attach supplier bill
- issue credit note/debit note
- export accountant file

กฎ:

- ห้ามแก้ order/payment เดิมเพื่อให้ภาษีตรง
- ใช้ document/reversal model เมื่อเอกสารผิด
- เลขเอกสารต้อง audit ได้
- ทุก export ต้องระบุช่วงเวลาและ generated_at
- ระบบช่วยจัดข้อมูล ไม่ใช่คำปรึกษาภาษีตามกฎหมาย

---

# 10. Live Commerce UI Guidance

Live Commerce มีสองแบบ:

```text
Facebook Live Core Integration
TikTok / External Live Helper via ACOS Chat
```

หน้าจอควรเน้น:

- live session status
- quick product/code board
- chat/order activity
- pending bill
- payment status
- customer matching
- stock warning

Mobile rule:

- ใช้งานมือเดียวได้
- ปุ่มหลักต้องชัด เช่น copy link, open chat, create bill, send payment link
- ไม่บังคับให้ staff สลับหลายหน้าจอเกินจำเป็น

---

# 11. AI / Developer Instructions

ก่อนทำ UI ใหม่ ต้องตอบ:

```text
Screen:
[ชื่อหน้าจอ]

User:
[admin / staff / customer / platform owner]

Module:
[module]

Data Source:
[อ่านจาก source ใด]

Actions:
[read-only / guarded action / write]

States:
[loading / empty / error / denied / success]

Mobile:
[ต้องรองรับ mobile อย่างไร]

Design Tokens:
[ใช้สี/status/component กลางอะไร]
```

ห้าม:

- สร้างสีใหม่โดยไม่เพิ่ม token
- สร้าง status badge ใหม่โดยไม่ map กับ status token
- ทำหน้า operational เป็น landing page
- ใช้ mock data แล้ว claim ว่า connected จริง
- เพิ่ม write action โดยไม่มี service contract, permission, audit และ validation

---

# 12. Owner Decisions Required

ต้องให้ Project Owner ตัดสินใจก่อน freeze design system:

1. Palette หลักอนุมัติแล้ว: Dark Purple 60% (#210B2C) / Wisteria 30% (#BC96E6) / Sunglow 10% (#FFD166)
2. เลือก density: compact / balanced / spacious
3. เลือก icon direction: letter mark ชั่วคราว / lucide icon / custom icon set
4. เลือก first UI prototype: Dashboard / Orders / Live Commerce / Finance & Tax / Customer Portal
5. เลือก mobile priority: admin quick view / live helper / customer portal
6. ภาษา UI อนุมัติแล้ว: Thai default (`th-TH`) + English (`en-US`)
7. Appearance อนุมัติแล้ว: Light / Dark / System default โดย user override organization default ได้
8. เลือกระดับความเป็น brand ใน admin: quiet system / branded system

---

# 13. Next Action

หลัง Project Owner ตรวจ presentation:

1. เลือก palette และ module identity
2. Freeze design tokens v1
3. สร้าง UI contract สำหรับ Admin Dashboard
4. สร้าง UI contract สำหรับ Orders List + Detail Drawer
5. สร้าง UI contract สำหรับ Finance & Tax Dashboard
6. ทำ prototype หน้าจอแรกด้วย mock/read-only data

# PRODUCT_CODE_MODEL_V1.md

## Coding Model

ระบบแยกรหัสสินค้าเป็น 4 แนวคิด:

1. `product_code` — รหัสสินค้าแม่
2. `variant_id` — UUID ภายในระบบ
3. `stock_code` — รหัสหลังบ้าน/คลัง
4. `sale_code` / `live_code` — รหัสขายหน้า Live/Chat

## product_code
- ระบุ Product แม่
- Unique ต่อ organization
- Auto-generate ได้
- ไม่จำเป็นต้องใช้หน้า Live

## variant_id
- UUID ภายในระบบ
- ใช้เป็น FK หลักใน Inventory, Cart, Order, Promotion, Fulfillment

## stock_code
- รหัสเสถียรของ Variant
- Unique ต่อ organization
- ใช้ใน Inventory, Warehouse, Import/Export, Audit
- ผู้ใช้กำหนดเองได้หรือระบบสร้างให้

## sale_code / live_code
- รหัสที่แม่ค้าใช้ขาย เช่น A01
- ไม่ต้อง Unique ทั้งระบบ
- ต้อง Unique ภายใน Sales Context ที่ Active
- reuse ข้าม Live Session ได้

## sales_code_assignments
Fields:
- id
- organization_id
- sale_code
- variant_id
- context_type: GLOBAL / CHANNEL / LIVE_SESSION / PURCHASE_SESSION
- channel_account_id nullable
- live_session_id nullable
- purchase_session_id nullable
- active_from nullable
- active_until nullable
- status
- created_by
- created_at
- updated_at

Recommended uniqueness:
- organization_id + live_session_id + sale_code
หรือ unique แบบ context-aware

## Parser Resolution
1. Active Live Session Sale Code
2. Active Channel Sale Code
3. Active Global Sale Code
4. Stock/Product Code fallback ถ้าเปิดใช้

หากเจอมากกว่า 1 รายการใน scope เดียวกัน:
- ห้ามเดา
- mark ambiguous
- ให้ staff/customer confirm

## Variant Options
ควรมี:
- product_options
- product_option_values
- product_variant_option_values

ตัวอย่าง:
- Color = Black
- Size = M

`variant_name` เป็นเพียง display text เช่น `Black / M`

## Product Form
### Product Parent
- Product Name
- Product Code
- Category
- Brand
- Description
- Product Tags
- Status

### Variant
- Variant Name
- Stock Code
- Barcode
- Base Price
- Cost Price
- Promotion Class
- Weight / Dimensions
- Status

### Live / Sales Code
- Sale Code
- Assignment Context
- Active Period
- Live Session / Channel

## Inventory Rule
Stock อ้าง `variant_id` เสมอ
Sale Code ไม่เกี่ยวกับ Inventory

Opening stock:
`inventory_movements.movement_type = OPENING_BALANCE`

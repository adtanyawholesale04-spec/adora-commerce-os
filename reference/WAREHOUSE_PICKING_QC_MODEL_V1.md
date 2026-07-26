# WAREHOUSE_PICKING_QC_MODEL_V1.md

Project: ADORA Commerce OS (ACOS)
Status: APPROVED FOR SCHEMA / MIGRATION

---

# 1. Purpose

Warehouse Picking & QC ทำหน้าที่ตรวจสอบสินค้าที่หยิบก่อนแพ็กและสร้าง Final Shipping Label

Canonical flow:

```text
Order / Consolidation
→ Fulfillment
→ Pick
→ QC Scan
→ QC Passed
→ Pack
→ Create Shipment
→ Generate Tracking
→ Print Final Label
→ Handoff
```

---

# 2. Scan Inputs

รองรับ:

```text
BARCODE
STOCK_CODE
SALE_CODE
MANUAL
```

Resolution priority:

```text
1. Barcode
2. Stock Code
3. Sale Code resolved from source Order/Live/Sales Context
4. Manual authorized selection
```

Sale Code ห้าม resolve แบบ global ถ้า context ไม่ชัด

---

# 3. QC Is Not Stock Deduction

QC Scan ไม่สร้าง inventory movement โดยตรง

QC มีหน้าที่ตรวจว่า item ที่หยิบตรงกับ `fulfillment_items`

Stock deduction occurs at fulfillment/shipping confirmation:

```text
inventory_movements
movement_type = SALE_FULFILLMENT
quantity_delta < 0
```

and allocation transitions:

```text
ACTIVE → FULFILLED
```

---

# 4. QC Rules

For each fulfillment item:

```text
required_quantity
scanned_quantity
```

Pass when:

```text
scanned_quantity = required_quantity
```

Reject:
- wrong variant
- over-scan
- invalid/ambiguous sale code
- inactive/cancelled fulfillment

---

# 5. Label Gate

Final shipping label may be created/printed only when:

```text
fulfillment_qc_session.status = PASSED
```

and all QC item totals are complete

Override requires:
- permission `warehouse.qc.override`
- reason
- approver or authorized actor
- audit log

---

# 6. Tables

## fulfillment_qc_sessions

```text
id
organization_id
fulfillment_id
status
started_by
started_at
completed_by
completed_at
failure_reason
created_at
updated_at
```

Statuses:

```text
PENDING
IN_PROGRESS
PASSED
FAILED
CANCELLED
```

## fulfillment_qc_scans

```text
id
organization_id
qc_session_id
fulfillment_item_id
variant_id
scan_type
scan_value
expected_variant_id
matched
quantity_increment
scanned_by
scanned_at
error_code
metadata_json
```

## fulfillment_qc_item_totals

Projection/cache:

```text
id
organization_id
qc_session_id
fulfillment_item_id
required_quantity
scanned_quantity
status
updated_at
```

Statuses:

```text
PENDING
PARTIAL
PASSED
FAILED
```

---

# 7. Multi-order Consolidation

QC traces every item to source:

```text
fulfillment_item
→ order_item
→ order
```

Therefore combined fulfillment remains auditable even when one package contains lines from multiple orders.

---

# 8. Multi-package

Package assignment can be added after QC or during packing.

Recommended future table:

```text
shipment_package_items
package_id
fulfillment_item_id
quantity
```

Final labels can identify package sequence such as 1/2 and 2/2.

---

# 9. UI State

Before pass:

```text
QC 2 / 3
Print Label disabled
```

After pass:

```text
QC PASSED
Confirm Pack enabled
Create Shipment enabled
Print Label enabled after shipment/tracking exists
```

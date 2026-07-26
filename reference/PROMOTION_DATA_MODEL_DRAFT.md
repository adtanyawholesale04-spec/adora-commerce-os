# Promotion Data Model Draft v1

## Goal
ใช้ Generic Model เดียวรองรับ Mix Pricing, Tiered Pricing, Bundle, Free Shipping, Buy X Get Y, Trigger Code, Coupon, Credit Bonus และ Targeting

## Core Model
```text
PROMOTION_CAMPAIGN
  ├─ CONDITION_GROUPS
  │   └─ CONDITIONS
  ├─ RULES
  ├─ ACTIONS
  │   ├─ PRICE_MAPPINGS
  │   ├─ TIERS
  │   └─ REWARD_RULES
  ├─ TARGET_SCOPES
  ├─ TRIGGER_CODES
  └─ APPLIED_BENEFITS
```

## Core Tables

### promotion_campaigns
- id
- organization_id
- code
- name
- description
- status: DRAFT / VALIDATING / ACTIVE / PAUSED / ENDED / ARCHIVED
- scope: CART / ORDER / PURCHASE_SESSION / CUSTOMER_PERIOD
- priority
- stackable
- exclusive_group
- starts_at
- ends_at
- usage_limit
- usage_limit_per_customer
- currency
- created_by
- created_at
- updated_at

### promotion_condition_groups
รองรับ nested AND / OR / NOT
- id
- campaign_id
- parent_group_id
- operator: AND / OR
- negate
- sort_order

### promotion_conditions
Atomic conditions:
- CUSTOMER_TIER
- CUSTOMER_TAG
- CUSTOMER_SEGMENT
- SKU / PRODUCT / VARIANT / CATEGORY / BRAND
- PRODUCT_GROUP / PROMOTION_CLASS / PRODUCT_TAG
- CHANNEL / LIVE_SESSION / PURCHASE_SESSION
- MIN_SPEND / MIN_QUANTITY
- PAYMENT_METHOD / SHIPPING_METHOD
- DAY_OF_WEEK / TIME_WINDOW

fields:
- id
- condition_group_id
- condition_type
- operator
- reference_type
- reference_id
- value_json
- sort_order

### promotion_target_scopes
กำหนดสิ่งที่ Benefit กระทบ
- SKU
- VARIANT
- PRODUCT
- CATEGORY
- PRODUCT_GROUP
- PROMOTION_CLASS
- PRODUCT_TAG
- WHOLE_ORDER
- SHIPPING

### promotion_rules
Qualification:
- MIN_QUANTITY
- QUANTITY_RANGE
- MIN_SPEND
- BUNDLE_MATCH
- TRIGGER_CODE
- FIRST_PURCHASE
- CUSTOMER_METRIC

fields:
- id
- campaign_id
- rule_type
- scope_type
- min_quantity
- max_quantity
- min_spend
- max_spend
- repeatable
- max_repeat_count
- value_json
- priority

### promotion_actions
Benefit:
- FIXED_DISCOUNT
- PERCENT_DISCOUNT
- FIXED_UNIT_PRICE
- TIERED_UNIT_PRICE
- FREE_SHIPPING
- BUY_X_GET_Y
- FREE_GIFT
- CREDIT_BONUS
- COUPON_REWARD
- LOYALTY_REWARD

fields:
- id
- campaign_id
- rule_id
- action_type
- priority
- stackable
- exclusive_group
- max_discount_amount
- value_json

### promotion_price_mappings
ใช้กับ Mix Pricing
ตัวอย่าง:
- FASHION → 100
- BRAND → 188
- PREMIUM → 240

fields:
- id
- action_id
- mapping_type
- reference_id
- fixed_unit_price
- currency

### promotion_tiers
ใช้กับ Tiered Pricing
ตัวอย่าง:
- 1–3 ปกติ
- 4–6 ลด 10%
- 7–10 ลด 30%
- 11+ 99/ชิ้น

fields:
- id
- action_id
- min_quantity
- max_quantity
- benefit_type
- percent_discount
- fixed_discount
- fixed_unit_price
- value_json
- sort_order

### promotion_bundles
รองรับ:
- EXACT_SET
- MIN_TOTAL_QUANTITY
- PER_COMPONENT_MINIMUM
- MIX_AND_MATCH

fields:
- id
- campaign_id
- name
- qualification_type
- repeatable
- max_bundle_count
- bundle_price_type
- bundle_price_value

### promotion_bundle_components
- id
- bundle_id
- component_type
- reference_id
- min_quantity
- max_quantity
- required

### promotion_reward_rules
รองรับ:
- SPECIFIC_SKU
- CATEGORY_POOL
- PRODUCT_GROUP_POOL
- PROMOTION_CLASS_POOL
- CHEAPEST_ELIGIBLE
- CUSTOMER_CHOICE

fields:
- id
- action_id
- reward_selection_type
- reward_quantity
- repeatable
- max_reward_quantity
- selection_price_basis
- value_json

### promotion_trigger_codes
Virtual Promotion SKU เช่น FREESHIP01
- id
- organization_id
- campaign_id
- code
- trigger_type
- status
- active_from
- active_until
- usage_limit
- usage_limit_per_customer
- channel_scope
- live_session_id

### promotion_trigger_redemptions
- id
- trigger_code_id
- customer_id
- conversation_id
- live_session_id
- cart_id
- order_id
- status
- rejection_reason
- redeemed_at

### coupons
- id
- organization_id
- campaign_id
- code
- status
- starts_at
- ends_at
- usage_limit
- usage_limit_per_customer
- customer_id

### coupon_redemptions
- id
- coupon_id
- customer_id
- cart_id
- order_id
- status: RESERVED / CONSUMED / RELEASED / REVERSED
- reserved_at
- consumed_at

### promotion_applied_benefits
Historical source หลัง Confirm Order
- id
- organization_id
- order_id
- order_item_id
- campaign_id
- rule_id
- action_id
- benefit_type
- original_amount
- benefit_amount
- final_amount
- quantity
- reference_order_item_id
- snapshot_json
- created_at

### promotion_reward_allocations
- id
- applied_benefit_id
- reward_order_item_id
- source_order_item_id
- reward_quantity
- normal_unit_price
- applied_unit_price

### product_promotion_classes
เช่น FASHION / BRAND / PREMIUM

### product_variant_promotion_classes
เชื่อม Variant กับ Promotion Class

## Example: Mix + Free Shipping + Free Gift
Campaign MIX-JULY

Rules:
- qty >= 3
- qty >= 5
- qty >= 10

Actions:
- qty >= 3 → FIXED_UNIT_PRICE mapping
  - FASHION 100
  - BRAND 188
  - PREMIUM 240
- qty >= 5 → FREE_SHIPPING
- qty >= 10 → BUY_X_GET_Y cheapest eligible

## Example: Set 12
Bundle:
- qualification = MIX_AND_MATCH
- Product Group = SET12
- min_total_qty = 12
- fixed package price = 1,500
- repeatable = true

## Example: Trigger Code
ลูกค้าพิมพ์ `CF FREESHIP01`

Flow:
1. หา Product SKU
2. ถ้าไม่พบ หา Promotion Trigger Code
3. Validate Campaign
4. Create Redemption
5. Apply Free Shipping

Trigger Code ไม่มี Stock และไม่เข้า Fulfillment

## Engine Boundary
Database:
- definitions
- constraints
- snapshots
- audit

Application Promotion Engine:
- evaluation
- conflict resolution
- pricing
- reward allocation
- explanation
- simulation

## JSONB Rule
Normalize สิ่งที่ query/index/join บ่อย
ใช้ JSONB สำหรับ config เฉพาะทางและ snapshots

## Versioning
MVP:
- clone campaign
- activate new version
- archive old

ห้ามแก้ Campaign ที่ Active แล้วจนทำให้ historical interpretation เปลี่ยน

## Recommended ER v1.1 Promotion Tables
Core:
- promotion_campaigns
- promotion_condition_groups
- promotion_conditions
- promotion_rules
- promotion_actions
- promotion_target_scopes
- promotion_price_mappings
- promotion_tiers
- promotion_bundles
- promotion_bundle_components
- promotion_reward_rules
- promotion_trigger_codes
- promotion_trigger_redemptions
- coupons
- coupon_redemptions
- promotion_applied_benefits
- promotion_reward_allocations
- product_promotion_classes
- product_variant_promotion_classes

Operational/optional:
- promotion_evaluations
- promotion_campaign_versions
- promotion_simulation_runs

## Decision
Status: PASS FOR ER V1.1 DRAFTING

Open issues:
- Return/Refund promotion clawback
- Purchase Session promotion recalculation
- campaign versioning depth
- performance strategy when rule count grows

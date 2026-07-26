# SAAS_ACCESS_AND_SUBSCRIPTION_MODEL_V1.md

Project: Conversational Commerce Platform
Status: APPROVED FOR DATABASE SCHEMA

---

# 1. User Types

ระบบแยกผู้ใช้ออกเป็น:

1. Platform Staff
   - ทีมเจ้าของ SaaS
   - Platform Admin / Support / Billing / Operations

2. Merchant Organization Users
   - Owner
   - Admin
   - Manager
   - Sales
   - Warehouse
   - Accounting
   - Customer Service
   - Viewer

3. End Customers
   - ลูกค้าที่ซื้อสินค้าจากร้าน
   - ไม่ใช่ user ที่ login เข้า Backoffice โดย default

---

# 2. Authentication

Primary authentication:

```text
Supabase Auth
Email + Password
```

Future:
- Google OAuth
- Magic Link
- OTP

User identity:

```text
auth.users
    ↓
profiles
    ↓
organization_memberships
```

หนึ่ง Profile สามารถอยู่หลาย Organization ได้

---

# 3. Organization Membership

`organization_memberships`

Purpose:
ระบุว่า Profile คนใดมีสิทธิ์เข้าร้านใด

Recommended fields:

```text
id
organization_id
profile_id
status
is_default
joined_at
invited_by
created_at
updated_at
```

Statuses:

```text
INVITED
ACTIVE
SUSPENDED
REMOVED
```

Role ต้องผูกกับ Membership ไม่ใช่ Profile โดยตรง

---

# 4. Access Control Layers

ทุก protected action ต้องผ่าน:

```text
1. Authentication
2. Organization Membership
3. Subscription / Entitlement
4. Role / Permission
```

Example:

```text
promotion.create
```

ตรวจ:
- login แล้ว?
- อยู่ใน organization?
- subscription active?
- plan เปิด Promotion?
- user มี permission promotion.create?

---

# 5. Plans

`plans`

Examples:

```text
STARTER
BUSINESS
PRO
ENTERPRISE
```

Recommended fields:

```text
id
code
name
description
billing_interval
base_price
currency_code
status
is_public
created_at
updated_at
```

---

# 6. Features

`features`

Feature catalog เช่น:

```text
products
inventory
orders
unified_inbox
live_commerce
advanced_promotion
store_credit
loyalty
multiple_warehouse
api_access
advanced_reports
```

Recommended fields:

```text
id
code
name
description
feature_type
unit
status
```

Feature types:

```text
BOOLEAN
LIMIT
METERED
```

---

# 7. Plan Features

`plan_features`

Examples:

```text
BUSINESS + live_commerce = enabled
BUSINESS + max_users = 10
BUSINESS + max_channels = 5
BUSINESS + monthly_orders = 5000
```

Fields:

```text
plan_id
feature_id
enabled
limit_value
config_json
```

---

# 8. Organization Subscription

`organization_subscriptions`

One current commercial subscription per organization.

Fields:

```text
id
organization_id
plan_id
status
billing_cycle
current_period_start
current_period_end
trial_ends_at
cancel_at_period_end
cancelled_at
started_at
created_at
updated_at
```

Statuses:

```text
TRIALING
ACTIVE
PAST_DUE
SUSPENDED
CANCELLED
EXPIRED
```

---

# 9. Organization Entitlements

`organization_entitlements`

Purpose:
effective feature access after plan + override

Fields:

```text
id
organization_id
feature_id
source_type
source_id
enabled
limit_value
valid_from
valid_until
created_at
updated_at
```

Source:

```text
PLAN
ADDON
MANUAL_OVERRIDE
PROMOTION
ENTERPRISE_CONTRACT
```

This is effective access layer.

---

# 10. Usage Metering

`subscription_usage`

Examples:
- active users
- connected channels
- monthly orders
- API calls
- storage

Fields:

```text
id
organization_id
feature_id
usage_period_start
usage_period_end
used_quantity
updated_at
```

Usage check must be transactional for hard limits where oversubscription matters.

---

# 11. Invitations

`organization_invitations`

Fields:

```text
id
organization_id
email
status
invited_by
expires_at
accepted_by_profile_id
accepted_at
created_at
```

Statuses:

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

Owner/Admin invites employee.
Employee sets own credentials through Supabase Auth.
Owner must never manually assign employee password.

---

# 12. Default Merchant Roles

Recommended seed roles:

```text
OWNER
ADMIN
MANAGER
SALES
WAREHOUSE
ACCOUNTING
CUSTOMER_SERVICE
VIEWER
```

Roles remain customizable by merchant where allowed.

---

# 13. Platform Roles

Platform-side roles must be separate from merchant roles:

```text
PLATFORM_SUPER_ADMIN
PLATFORM_SUPPORT
PLATFORM_BILLING
PLATFORM_OPERATIONS
```

Do not represent platform staff as organization OWNER.

---

# 14. Support Access

Platform staff access to merchant data must be explicit and audited.

Recommended:

`support_access_grants`

Fields:

```text
id
organization_id
platform_profile_id
reason
ticket_reference
scope_json
status
starts_at
expires_at
approved_by
created_at
```

Statuses:

```text
PENDING
ACTIVE
EXPIRED
REVOKED
```

All support impersonation/access must emit audit logs.

---

# 15. Subscription Gate Behavior

Recommended behavior:

ACTIVE:
normal access

TRIALING:
normal access according to trial entitlements

PAST_DUE:
grace period configurable

SUSPENDED:
read-only or blocked based on policy

CANCELLED/EXPIRED:
merchant data retained according to retention policy, but write operations disabled

Never delete merchant commercial history immediately after subscription expiry.

---

# 16. Recommended Login Flow

```text
Login
  ↓
Supabase Auth verifies identity
  ↓
Load Profile
  ↓
Load ACTIVE organization memberships
  ↓
0 org → onboarding / invitation page
1 org → enter organization
>1 org → organization switcher
  ↓
Load subscription + entitlements
  ↓
Load membership roles + permissions
  ↓
Dashboard
```

---

# 17. Authorization Decision

Canonical access decision:

```text
ALLOW =
authenticated
AND active_membership
AND active_entitlement
AND permission_granted
```

Certain read-only pages may allow access during suspended/grace states according to subscription policy.

---

# 18. Schema Decision

Add these tables before migration:

```text
plans
features
plan_features
organization_subscriptions
organization_entitlements
subscription_usage
organization_invitations
support_access_grants
```

Use existing:

```text
profiles
organization_memberships
roles
permissions
membership_roles
role_permissions
```


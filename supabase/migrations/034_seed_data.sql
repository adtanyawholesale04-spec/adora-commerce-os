-- ADORA Commerce OS (ACOS)
-- 034_seed_data.sql

insert into public.permissions (code, name, description)
values
  ('organization.settings.view', 'View organization settings', null),
  ('organization.settings.edit', 'Edit organization settings', null),
  ('members.view', 'View members', null),
  ('members.manage', 'Manage members', null),
  ('product.view', 'View products', null),
  ('product.create', 'Create products', null),
  ('product.edit', 'Edit products', null),
  ('product.cost.view', 'View product cost', null),
  ('product.cost.edit', 'Edit product cost', null),
  ('inventory.view', 'View inventory', null),
  ('inventory.adjust', 'Adjust inventory', null),
  ('inventory.transfer', 'Transfer inventory', null),
  ('customer.view', 'View customers', null),
  ('customer.edit', 'Edit customers', null),
  ('customer.merge', 'Merge customers', null),
  ('conversation.view', 'View conversations', null),
  ('conversation.reply', 'Reply to conversations', null),
  ('conversation.assign', 'Assign conversations', null),
  ('order.view', 'View orders', null),
  ('order.create', 'Create orders', null),
  ('order.edit', 'Edit eligible orders', null),
  ('order.cancel', 'Cancel orders', null),
  ('order.consolidate', 'Consolidate orders', null),
  ('promotion.view', 'View promotions', null),
  ('promotion.create', 'Create promotions', null),
  ('promotion.publish', 'Publish promotions', null),
  ('payment.view', 'View payments', null),
  ('payment.verify', 'Verify payments', null),
  ('payment.refund', 'Refund payments', null),
  ('credit.view', 'View store credit', null),
  ('credit.adjust', 'Adjust store credit', null),
  ('loyalty.view', 'View loyalty', null),
  ('loyalty.adjust', 'Adjust loyalty points', null),
  ('warehouse.pick', 'Pick fulfillment items', null),
  ('warehouse.qc', 'Perform warehouse QC', null),
  ('warehouse.qc.override', 'Override warehouse QC', null),
  ('warehouse.pack', 'Pack fulfillment', null),
  ('shipping.create', 'Create shipment', null),
  ('shipping.print_label', 'Print shipping label', null),
  ('return.view', 'View returns', null),
  ('return.manage', 'Manage returns', null),
  ('return.inspect', 'Inspect returned goods', null),
  ('report.view', 'View reports', null),
  ('audit.view', 'View audit log', null)
on conflict (code) do update
set name = excluded.name, description = excluded.description;

insert into public.features (code, name, description, feature_type, unit, status)
values
  ('products', 'Products', null, 'BOOLEAN', null, 'ACTIVE'),
  ('inventory', 'Inventory', null, 'BOOLEAN', null, 'ACTIVE'),
  ('orders', 'Orders', null, 'BOOLEAN', null, 'ACTIVE'),
  ('unified_inbox', 'Unified Inbox', null, 'BOOLEAN', null, 'ACTIVE'),
  ('live_commerce', 'Live Commerce', null, 'BOOLEAN', null, 'ACTIVE'),
  ('advanced_promotion', 'Advanced Promotion', null, 'BOOLEAN', null, 'ACTIVE'),
  ('store_credit', 'Store Credit', null, 'BOOLEAN', null, 'ACTIVE'),
  ('loyalty', 'Loyalty', null, 'BOOLEAN', null, 'ACTIVE'),
  ('multiple_warehouse', 'Multiple Warehouses', null, 'BOOLEAN', null, 'ACTIVE'),
  ('api_access', 'API Access', null, 'BOOLEAN', null, 'ACTIVE'),
  ('advanced_reports', 'Advanced Reports', null, 'BOOLEAN', null, 'ACTIVE'),
  ('max_users', 'Maximum Users', null, 'LIMIT', 'users', 'ACTIVE'),
  ('max_channels', 'Maximum Connected Channels', null, 'LIMIT', 'channels', 'ACTIVE'),
  ('monthly_orders', 'Monthly Orders', null, 'METERED', 'orders', 'ACTIVE')
on conflict (code) do update
set name = excluded.name, feature_type = excluded.feature_type,
    unit = excluded.unit, status = excluded.status;

insert into public.plans (
  code, name, description, billing_interval,
  base_price, currency_code, status, is_public
)
values
  ('STARTER', 'Starter', 'Entry plan for small merchants', 'MONTHLY', 0, 'THB', 'ACTIVE', true),
  ('BUSINESS', 'Business', 'Growing social commerce teams', 'MONTHLY', 0, 'THB', 'ACTIVE', true),
  ('PRO', 'Pro', 'Advanced commerce operations', 'MONTHLY', 0, 'THB', 'ACTIVE', true),
  ('ENTERPRISE', 'Enterprise', 'Custom enterprise plan', 'CUSTOM', 0, 'THB', 'ACTIVE', false)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    billing_interval = excluded.billing_interval,
    status = excluded.status,
    is_public = excluded.is_public;

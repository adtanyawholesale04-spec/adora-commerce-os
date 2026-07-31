\set ON_ERROR_STOP on

begin;

do $$
declare v_name text;
begin
  foreach v_name in array array[
    'internal_begin_checkout_idempotency',
    'internal_complete_checkout_idempotency',
    'internal_checkout_order_response',
    'internal_evaluate_storefront_coupon',
    'internal_release_storefront_checkout'
  ] loop
    if exists (
      select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=v_name and (
        has_function_privilege('anon',p.oid,'EXECUTE')
        or has_function_privilege('authenticated',p.oid,'EXECUTE')
        or has_function_privilege('service_role',p.oid,'EXECUTE')
      )
    ) then raise exception 'Data API role can execute Layer 3 helper %',v_name; end if;
  end loop;
  if not has_function_privilege('authenticated','public.api_submit_storefront_checkout(uuid,uuid,uuid,jsonb,text,uuid)','EXECUTE')
     or has_function_privilege('anon','public.api_submit_storefront_checkout(uuid,uuid,uuid,jsonb,text,uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.api_expire_storefront_checkout(uuid,uuid,uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.api_expire_storefront_checkout(uuid,uuid,uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.api_compensate_storefront_checkout(uuid,uuid,text,uuid)','EXECUTE') then
    raise exception 'Layer 3 API grants are incorrect';
  end if;
end;
$$;

insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('d0000000-0000-4000-8000-000000000001','authenticated','authenticated','layer3@example.test',now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now());
insert into public.organizations (id,name,slug,status,currency_code)
values ('d1000000-0000-4000-8000-000000000001','Layer 3 Test','layer3-test','ACTIVE','THB');
insert into public.profiles (id,auth_user_id,display_name,status)
values ('d2000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','Layer 3 Customer','ACTIVE');
insert into public.organization_memberships (id,organization_id,profile_id,status,is_default,joined_at)
values ('d3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'd2000000-0000-4000-8000-000000000001','ACTIVE',true,now());
insert into public.customers (id,organization_id,customer_code,display_name,status)
values ('d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','L3-CUSTOMER','Layer 3 Customer','ACTIVE');
insert into public.customer_profile_links (id,organization_id,customer_id,profile_id,link_status,link_source,verification_method,verified_at)
values ('d5000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','ACTIVE','VERIFIED_SIGNUP','EMAIL_OTP',now());
insert into public.organization_storefronts (id,organization_id,publication_status,tagline,published_at,published_by)
values ('d6000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','PUBLISHED','Layer 3',now(),
  'd2000000-0000-4000-8000-000000000001');
insert into public.organization_checkout_settings (organization_id,status,currency_code,flat_shipping_charge,reservation_minutes,payment_due_minutes)
values ('d1000000-0000-4000-8000-000000000001','ACTIVE','THB',35,15,60);
insert into public.organization_entitlements (organization_id,feature_id,source_type,enabled,valid_from)
select 'd1000000-0000-4000-8000-000000000001',id,'MANUAL_OVERRIDE',true,now()-interval '1 day'
from public.features where code='storefront.checkout';
insert into public.products (id,organization_id,product_code,name,status)
values ('d7000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','L3-PRODUCT','Layer 3 Product','ACTIVE');
insert into public.product_variants (id,organization_id,product_id,stock_code,variant_name,base_price,cost_price,minimum_selling_price,status)
values ('d8000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'd7000000-0000-4000-8000-000000000001','L3-SKU','Standard',100,30,50,'ACTIVE');
insert into public.storefront_product_listings (id,organization_id,storefront_id,product_id,public_handle,visibility,visible_at)
values ('d9000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'd6000000-0000-4000-8000-000000000001','d7000000-0000-4000-8000-000000000001','layer3-product','VISIBLE',now());
insert into public.warehouses (id,organization_id,code,name,status)
values ('da000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','B','Warehouse B','ACTIVE'),
  ('da000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001','A','Warehouse A','ACTIVE');
insert into public.inventory_balances (organization_id,warehouse_id,variant_id,on_hand,reserved,allocated,available)
values ('d1000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001',1,0,0,1),
  ('d1000000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000001',2,0,0,2);

insert into public.promotion_campaigns (id,organization_id,code,name,status,scope,priority,stackable,currency_code)
values ('db000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','L3-COUPON','Layer 3 Coupon','ACTIVE','ORDER',10,true,'THB');
insert into public.promotion_campaign_versions (id,organization_id,campaign_id,version_number,status)
values ('dc000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'db000000-0000-4000-8000-000000000001',1,'ACTIVE');
insert into public.promotion_rules (id,organization_id,campaign_version_id,rule_type,scope_type,min_spend,repeatable,priority)
values ('dd000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'dc000000-0000-4000-8000-000000000001','MIN_SPEND','ORDER',100,false,10);
insert into public.promotion_actions (id,organization_id,campaign_version_id,rule_id,action_type,priority,stackable,value_json)
values ('de000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'dc000000-0000-4000-8000-000000000001','dd000000-0000-4000-8000-000000000001','PERCENT_DISCOUNT',10,true,'{"percent":10}');
insert into public.coupons (id,organization_id,campaign_version_id,code,status,usage_limit,usage_limit_per_customer)
values ('df000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'dc000000-0000-4000-8000-000000000001','SAVE10','ACTIVE',10,2);

insert into public.carts (id,organization_id,customer_id,source,status,currency_code,subtotal,discount_total,shipping_estimate,grand_total,created_by)
values ('e0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001','STOREFRONT','READY','THB',200,0,35,235,'d2000000-0000-4000-8000-000000000001');
insert into public.cart_items (id,organization_id,cart_id,variant_id,requested_quantity,reserved_quantity,original_unit_price,
  calculated_unit_price,line_discount_total,line_total,pricing_snapshot_json)
values ('e1000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001','d8000000-0000-4000-8000-000000000001',2,0,100,100,0,200,
  '{"schema_version":1,"currency_code":"THB","base_unit_price":"100.00","applied_unit_price":"100.00","line_benefit_total":"0.00","applied_actions":[]}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','d0000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $$
declare v_result jsonb; v_retry jsonb; v_order_id uuid;
begin
  v_result:=public.api_submit_storefront_checkout(
    'd1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001',null,
    '{"recipient_name":"Test Customer","phone":"0812345678","address_line1":"1 Test Road","subdistrict":"Test","district":"Test","province":"Bangkok","postal_code":"10100","country_code":"th"}',
    ' save10 ','e2000000-0000-4000-8000-000000000001');
  v_order_id:=(v_result->>'order_id')::uuid;
  if v_result->>'grand_total'<>'215.00' or v_result->>'order_discount_total'<>'20.00'
     or v_result->>'order_status'<>'PENDING_CONFIRMATION' or (v_result->>'idempotency_reused')::boolean then
    raise exception 'Atomic checkout response is incorrect: %',v_result;
  end if;
  v_retry:=public.api_submit_storefront_checkout(
    'd1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001',null,
    '{"recipient_name":"Test Customer","phone":"0812345678","address_line1":"1 Test Road","subdistrict":"Test","district":"Test","province":"Bangkok","postal_code":"10100","country_code":"th"}',
    'SAVE10','e2000000-0000-4000-8000-000000000001');
  if not (v_retry->>'idempotency_reused')::boolean or v_retry->>'order_id'<>v_order_id::text then
    raise exception 'Atomic checkout retry is not deterministic: %',v_retry;
  end if;
end;
$$;

reset role;

do $$
declare v_order_id uuid; v_inventory bigint; v_coupon bigint; v_payment bigint; v_benefit bigint;
begin
  select id into strict v_order_id from public.orders where source_cart_id='e0000000-0000-4000-8000-000000000001';
  select count(*) into v_inventory from public.inventory_reservations where order_id=v_order_id and status='ACTIVE';
  select count(*) into v_coupon from public.coupon_redemptions where order_id=v_order_id and status='RESERVED';
  select count(*) into v_payment from public.payments where order_id=v_order_id and status='UNPAID';
  select count(*) into v_benefit from public.promotion_applied_benefits where order_id=v_order_id and order_item_id is null;
  if v_inventory<>1 or v_coupon<>1 or v_payment<>1 or v_benefit<>1
     or not exists (
       select 1 from public.inventory_reservations
       where order_id=v_order_id and warehouse_id='da000000-0000-4000-8000-000000000002'
         and quantity=2 and status='ACTIVE'
     ) then
    raise exception 'Atomic checkout evidence is incomplete: inventory %, coupon %, payment %, benefit %',
      v_inventory,v_coupon,v_payment,v_benefit;
  end if;
end;
$$;

select set_config('test.layer3_order_id',(
  select id::text from public.orders where source_cart_id='e0000000-0000-4000-8000-000000000001'
),true);

set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);

do $$
declare v_order_id uuid; v_result jsonb;
begin
  v_order_id:=current_setting('test.layer3_order_id')::uuid;
  begin
    perform public.api_compensate_storefront_checkout('d1000000-0000-4000-8000-000000000001',v_order_id,'PROVIDER_TEXT',
      'e3000000-0000-4000-8000-000000000001');
    raise exception 'Unsafe compensation code unexpectedly succeeded';
  exception when invalid_parameter_value then
    if sqlerrm<>'COMPENSATION_REASON_INVALID' then raise; end if;
  end;
  v_result:=public.api_compensate_storefront_checkout('d1000000-0000-4000-8000-000000000001',v_order_id,
    'CHECKOUT_POST_COMMIT_FAILED','e3000000-0000-4000-8000-000000000002');
  if v_result->>'order_status'<>'CANCELLED' or v_result->>'released_hold_count'<>'1' then
    raise exception 'Compensation response is incorrect: %',v_result;
  end if;
end;
$$;

reset role;

do $$
declare v_order_id uuid:=current_setting('test.layer3_order_id')::uuid;
begin
  if exists(select 1 from public.inventory_reservations where order_id=v_order_id and status='ACTIVE')
     or exists(select 1 from public.coupon_redemptions where order_id=v_order_id and status='RESERVED')
     or (select sum(available) from public.inventory_balances where organization_id='d1000000-0000-4000-8000-000000000001')<>3
     or not exists(select 1 from public.payments where order_id=v_order_id) then
    raise exception 'Compensation did not preserve evidence or restore holds';
  end if;
end;
$$;

insert into public.carts (id,organization_id,customer_id,source,status,currency_code,subtotal,discount_total,shipping_estimate,grand_total,created_by)
values ('e0000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001','STOREFRONT','READY','THB',100,0,35,135,'d2000000-0000-4000-8000-000000000001');
insert into public.cart_items (id,organization_id,cart_id,variant_id,requested_quantity,reserved_quantity,original_unit_price,
  calculated_unit_price,line_discount_total,line_total,pricing_snapshot_json)
values ('e1000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002','d8000000-0000-4000-8000-000000000001',1,0,100,100,0,100,
  '{"schema_version":1,"currency_code":"THB","base_unit_price":"100.00","applied_unit_price":"100.00","line_benefit_total":"0.00","applied_actions":[]}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub','d0000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
select public.api_submit_storefront_checkout(
  'd1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002',null,
  '{"recipient_name":"Test Customer","phone":"0812345678","address_line1":"1 Test Road","country_code":"TH"}',
  null,'e2000000-0000-4000-8000-000000000002');
reset role;
update public.orders set payment_due_at=statement_timestamp()-interval '1 minute'
where source_cart_id='e0000000-0000-4000-8000-000000000002';
select set_config('test.layer3_expiry_order_id',(
  select id::text from public.orders where source_cart_id='e0000000-0000-4000-8000-000000000002'
),true);
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
do $$
declare v_result jsonb;
begin
  v_result:=public.api_expire_storefront_checkout(
    'd1000000-0000-4000-8000-000000000001',current_setting('test.layer3_expiry_order_id')::uuid,
    'e4000000-0000-4000-8000-000000000001');
  if v_result->>'order_status'<>'PAYMENT_EXPIRED' or v_result->>'released_hold_count'<>'1' then
    raise exception 'Expiry response is incorrect: %',v_result;
  end if;
end;
$$;
reset role;

insert into public.carts (id,organization_id,customer_id,source,status,currency_code,subtotal,discount_total,shipping_estimate,grand_total,created_by)
values ('e0000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000001',
  'd4000000-0000-4000-8000-000000000001','STOREFRONT','READY','THB',90,0,35,125,'d2000000-0000-4000-8000-000000000001');
insert into public.cart_items (id,organization_id,cart_id,variant_id,requested_quantity,reserved_quantity,original_unit_price,
  calculated_unit_price,line_discount_total,line_total,pricing_snapshot_json)
values ('e1000000-0000-4000-8000-000000000003','d1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000003','d8000000-0000-4000-8000-000000000001',1,0,90,90,0,90,
  '{"schema_version":1,"currency_code":"THB","base_unit_price":"90.00","applied_unit_price":"90.00","line_benefit_total":"0.00","applied_actions":[]}'::jsonb);
set local role authenticated;
select set_config('request.jwt.claim.sub','d0000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$
declare v_result jsonb;
begin
  v_result:=public.api_submit_storefront_checkout(
    'd1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000003',null,
    '{"recipient_name":"Test Customer","phone":"0812345678","address_line1":"1 Test Road","country_code":"TH"}',
    null,'e2000000-0000-4000-8000-000000000003');
  if coalesce((v_result->>'ok')::boolean,true) or v_result->>'code'<>'CHECKOUT_REPRICE_REQUIRED' then
    raise exception 'Reprice gate response is incorrect: %',v_result;
  end if;
end;
$$;
reset role;
do $$
begin
  if exists(select 1 from public.orders where source_cart_id='e0000000-0000-4000-8000-000000000003')
     or exists(select 1 from public.inventory_reservations where cart_id='e0000000-0000-4000-8000-000000000003')
     or (select grand_total from public.carts where id='e0000000-0000-4000-8000-000000000003')<>135 then
    raise exception 'Reprice gate created evidence or failed to persist the new price';
  end if;
end;
$$;

select 'phase_1d_atomic_checkout_layer3|pass';
rollback;

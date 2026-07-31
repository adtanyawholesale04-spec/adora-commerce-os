import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  dbContainer,
  dockerBin,
  runPsql,
  runSqlSuite,
  runSupabaseDbLint,
} from "./supabase-validation-runner.mjs";

runSqlSuite([
  {
    name: "phase_1d_atomic_checkout_layer3",
    file: "supabase/validation/052_phase_1d_atomic_checkout_layer3_test.sql",
    requiredRows: ["phase_1d_atomic_checkout_layer3|pass"],
  },
]);

const fixture = {
  organizationId: randomUUID(),
  storefrontId: randomUUID(),
  productId: randomUUID(),
  variantId: randomUUID(),
  warehouseId: randomUUID(),
  campaignId: randomUUID(),
  versionId: randomUUID(),
  ruleId: randomUUID(),
  actionId: randomUUID(),
  couponId: randomUUID(),
  users: [0, 1].map(() => ({
    authId: randomUUID(),
    profileId: randomUUID(),
    membershipId: randomUUID(),
    customerId: randomUUID(),
    linkId: randomUUID(),
    cartId: randomUUID(),
    cartItemId: randomUUID(),
    requestId: randomUUID(),
  })),
};
const suffix = fixture.organizationId.slice(0, 8);

try {
  runPsql(`
    insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values
      ('${fixture.users[0].authId}','authenticated','authenticated','l3-race-a-${suffix}@example.test',now(),'{}','{}',now(),now()),
      ('${fixture.users[1].authId}','authenticated','authenticated','l3-race-b-${suffix}@example.test',now(),'{}','{}',now(),now());
    insert into public.organizations (id,name,slug,status,currency_code)
    values ('${fixture.organizationId}','Layer 3 Race ${suffix}','layer3-race-${suffix}','ACTIVE','THB');
    insert into public.profiles (id,auth_user_id,display_name,status) values
      ('${fixture.users[0].profileId}','${fixture.users[0].authId}','Race A','ACTIVE'),
      ('${fixture.users[1].profileId}','${fixture.users[1].authId}','Race B','ACTIVE');
    insert into public.organization_memberships (id,organization_id,profile_id,status,is_default,joined_at) values
      ('${fixture.users[0].membershipId}','${fixture.organizationId}','${fixture.users[0].profileId}','ACTIVE',true,now()),
      ('${fixture.users[1].membershipId}','${fixture.organizationId}','${fixture.users[1].profileId}','ACTIVE',true,now());
    insert into public.customers (id,organization_id,customer_code,display_name,status) values
      ('${fixture.users[0].customerId}','${fixture.organizationId}','RACE-A-${suffix}','Race A','ACTIVE'),
      ('${fixture.users[1].customerId}','${fixture.organizationId}','RACE-B-${suffix}','Race B','ACTIVE');
    insert into public.customer_profile_links (id,organization_id,customer_id,profile_id,link_status,link_source,verification_method,verified_at) values
      ('${fixture.users[0].linkId}','${fixture.organizationId}','${fixture.users[0].customerId}','${fixture.users[0].profileId}','ACTIVE','VERIFIED_SIGNUP','EMAIL_OTP',now()),
      ('${fixture.users[1].linkId}','${fixture.organizationId}','${fixture.users[1].customerId}','${fixture.users[1].profileId}','ACTIVE','VERIFIED_SIGNUP','EMAIL_OTP',now());
    insert into public.organization_storefronts (id,organization_id,publication_status,tagline,published_at,published_by)
    values ('${fixture.storefrontId}','${fixture.organizationId}','PUBLISHED','Race',now(),'${fixture.users[0].profileId}');
    insert into public.organization_checkout_settings (organization_id,status,currency_code,flat_shipping_charge)
    values ('${fixture.organizationId}','ACTIVE','THB',0);
    insert into public.organization_entitlements (organization_id,feature_id,source_type,enabled,valid_from)
    select '${fixture.organizationId}',id,'MANUAL_OVERRIDE',true,now() from public.features where code='storefront.checkout';
    insert into public.products (id,organization_id,product_code,name,status)
    values ('${fixture.productId}','${fixture.organizationId}','RACE-P-${suffix}','Race Product','ACTIVE');
    insert into public.product_variants (id,organization_id,product_id,stock_code,variant_name,base_price,cost_price,minimum_selling_price,status)
    values ('${fixture.variantId}','${fixture.organizationId}','${fixture.productId}','RACE-SKU-${suffix}','Standard',100,30,50,'ACTIVE');
    insert into public.storefront_product_listings (organization_id,storefront_id,product_id,public_handle,visibility,visible_at)
    values ('${fixture.organizationId}','${fixture.storefrontId}','${fixture.productId}','race-${suffix}','VISIBLE',now());
    insert into public.warehouses (id,organization_id,code,name,status)
    values ('${fixture.warehouseId}','${fixture.organizationId}','A','Race Warehouse','ACTIVE');
    insert into public.inventory_balances (organization_id,warehouse_id,variant_id,on_hand,reserved,allocated,available)
    values ('${fixture.organizationId}','${fixture.warehouseId}','${fixture.variantId}',10,0,0,10);
    insert into public.promotion_campaigns (id,organization_id,code,name,status,scope,stackable,currency_code,usage_limit)
    values ('${fixture.campaignId}','${fixture.organizationId}','RACE-C-${suffix}','Race Coupon','ACTIVE','ORDER',true,'THB',1);
    insert into public.promotion_campaign_versions (id,organization_id,campaign_id,version_number,status)
    values ('${fixture.versionId}','${fixture.organizationId}','${fixture.campaignId}',1,'ACTIVE');
    insert into public.promotion_rules (id,organization_id,campaign_version_id,rule_type,scope_type,min_spend,repeatable)
    values ('${fixture.ruleId}','${fixture.organizationId}','${fixture.versionId}','MIN_SPEND','ORDER',1,false);
    insert into public.promotion_actions (id,organization_id,campaign_version_id,rule_id,action_type,stackable,value_json)
    values ('${fixture.actionId}','${fixture.organizationId}','${fixture.versionId}','${fixture.ruleId}','FIXED_DISCOUNT',true,'{"amount":10}');
    insert into public.coupons (id,organization_id,campaign_version_id,code,status,usage_limit)
    values ('${fixture.couponId}','${fixture.organizationId}','${fixture.versionId}','LASTONE','ACTIVE',1);
    insert into public.carts (id,organization_id,customer_id,source,status,currency_code,subtotal,shipping_estimate,grand_total,created_by) values
      ('${fixture.users[0].cartId}','${fixture.organizationId}','${fixture.users[0].customerId}','STOREFRONT','READY','THB',100,0,100,'${fixture.users[0].profileId}'),
      ('${fixture.users[1].cartId}','${fixture.organizationId}','${fixture.users[1].customerId}','STOREFRONT','READY','THB',100,0,100,'${fixture.users[1].profileId}');
    insert into public.cart_items (id,organization_id,cart_id,variant_id,requested_quantity,original_unit_price,calculated_unit_price,line_total,pricing_snapshot_json) values
      ('${fixture.users[0].cartItemId}','${fixture.organizationId}','${fixture.users[0].cartId}','${fixture.variantId}',1,100,100,100,'{"schema_version":1,"currency_code":"THB","base_unit_price":"100.00","applied_unit_price":"100.00","line_benefit_total":"0.00","applied_actions":[]}'),
      ('${fixture.users[1].cartItemId}','${fixture.organizationId}','${fixture.users[1].cartId}','${fixture.variantId}',1,100,100,100,'{"schema_version":1,"currency_code":"THB","base_unit_price":"100.00","applied_unit_price":"100.00","line_benefit_total":"0.00","applied_actions":[]}');
  `);

  const attempts = await Promise.allSettled(
    fixture.users.map((user) => runConcurrentPsql(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub','${user.authId}',true);
      select set_config('request.jwt.claim.role','authenticated',true);
      select public.api_submit_storefront_checkout(
        '${fixture.organizationId}','${user.cartId}',null,
        '{"recipient_name":"Race Customer","phone":"0800000000","address_line1":"1 Race Road","country_code":"TH"}',
        'lastone','${user.requestId}'
      )->>'order_id';
      commit;
    `)),
  );
  const succeeded = attempts.filter((attempt) => attempt.status === "fulfilled");
  const failed = attempts.filter((attempt) => attempt.status === "rejected");
  const counts = runPsql(`
    select concat_ws('|',
      (select count(*) from public.orders where organization_id='${fixture.organizationId}'),
      (select count(*) from public.coupon_redemptions where organization_id='${fixture.organizationId}' and status='RESERVED'),
      (select count(*) from public.inventory_reservations where organization_id='${fixture.organizationId}' and status='ACTIVE'),
      (select count(*) from public.payments where organization_id='${fixture.organizationId}'),
      (select available from public.inventory_balances where organization_id='${fixture.organizationId}')
    );
  `).trim();
  if (succeeded.length !== 1 || failed.length !== 1 || counts !== "1|1|1|1|9.000"
      || !String(failed[0].reason).includes("COUPON_UNAVAILABLE")) {
    throw new Error(`coupon race failed: success=${succeeded.length}, failure=${failed.length}, counts=${counts}, reason=${String(failed[0]?.reason)}`);
  }
  console.log("phase_1d_atomic_checkout_coupon_race pass");
} finally {
  runPsql(`
    set session_replication_role=replica;
    delete from public.audit_logs where organization_id='${fixture.organizationId}';
    delete from public.cart_events where organization_id='${fixture.organizationId}';
    delete from public.commerce_idempotency_keys where organization_id='${fixture.organizationId}';
    delete from public.promotion_applied_benefits where organization_id='${fixture.organizationId}';
    delete from public.coupon_redemptions where organization_id='${fixture.organizationId}';
    delete from public.inventory_reservations where organization_id='${fixture.organizationId}';
    delete from public.payments where organization_id='${fixture.organizationId}';
    delete from public.order_status_history where organization_id='${fixture.organizationId}';
    delete from public.order_addresses where organization_id='${fixture.organizationId}';
    delete from public.order_items where organization_id='${fixture.organizationId}';
    delete from public.orders where organization_id='${fixture.organizationId}';
    delete from public.cart_items where organization_id='${fixture.organizationId}';
    delete from public.carts where organization_id='${fixture.organizationId}';
    delete from public.coupons where organization_id='${fixture.organizationId}';
    delete from public.promotion_actions where organization_id='${fixture.organizationId}';
    delete from public.promotion_rules where organization_id='${fixture.organizationId}';
    delete from public.promotion_campaign_versions where organization_id='${fixture.organizationId}';
    delete from public.promotion_campaigns where organization_id='${fixture.organizationId}';
    delete from public.inventory_balances where organization_id='${fixture.organizationId}';
    delete from public.warehouses where organization_id='${fixture.organizationId}';
    delete from public.storefront_product_listings where organization_id='${fixture.organizationId}';
    delete from public.product_variants where organization_id='${fixture.organizationId}';
    delete from public.products where organization_id='${fixture.organizationId}';
    delete from public.organization_entitlements where organization_id='${fixture.organizationId}';
    delete from public.organization_checkout_settings where organization_id='${fixture.organizationId}';
    delete from public.organization_storefronts where organization_id='${fixture.organizationId}';
    delete from public.customer_profile_links where organization_id='${fixture.organizationId}';
    delete from public.customers where organization_id='${fixture.organizationId}';
    delete from public.organization_memberships where organization_id='${fixture.organizationId}';
    delete from public.profiles where id in ('${fixture.users[0].profileId}','${fixture.users[1].profileId}');
    delete from auth.users where id in ('${fixture.users[0].authId}','${fixture.users[1].authId}');
    delete from public.organizations where id='${fixture.organizationId}';
    set session_replication_role=origin;
  `);
}

runSupabaseDbLint();

console.log("phase_1d_atomic_checkout_layer3_suite pass");

function runConcurrentPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(dockerBin,["exec","-i",dbContainer,"psql","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-q","-t","-A"],
      { stdio: ["pipe","pipe","pipe"] });
    let stdout=""; let stderr="";
    child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
    child.stdout.on("data",(chunk)=>{ stdout+=chunk; });
    child.stderr.on("data",(chunk)=>{ stderr+=chunk; });
    child.on("error",reject);
    child.on("close",(code)=> code===0 ? resolve(stdout) : reject(new Error(stderr)));
    child.stdin.end(sql);
  });
}

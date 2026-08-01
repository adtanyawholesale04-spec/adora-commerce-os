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
    name: "phase_1d_manual_payment_additive_schema",
    file: "supabase/validation/053_phase_1d_manual_payment_additive_schema_test.sql",
    requiredRows: ["phase_1d_manual_payment_additive_schema|pass"],
  },
]);

const fixture = {
  organizationId: randomUUID(),
  customerId: randomUUID(),
  productId: randomUUID(),
  variantId: randomUUID(),
  warehouseId: randomUUID(),
  reservationId: randomUUID(),
  orders: [0, 1, 2].map(() => ({
    orderId: randomUUID(),
    orderItemId: randomUUID(),
    paymentId: randomUUID(),
  })),
};
const suffix = fixture.organizationId.slice(0, 8);

try {
  runPsql(`
    insert into public.organizations (id,name,slug,status,currency_code)
    values ('${fixture.organizationId}','Manual Payment Race ${suffix}','manual-payment-race-${suffix}','ACTIVE','THB');
    insert into public.customers (id,organization_id,customer_code,display_name,status)
    values ('${fixture.customerId}','${fixture.organizationId}','MP-RACE-${suffix}','Manual Payment Race','ACTIVE');
    insert into public.products (id,organization_id,product_code,name,status)
    values ('${fixture.productId}','${fixture.organizationId}','MP-RACE-P-${suffix}','Manual Race Product','ACTIVE');
    insert into public.product_variants (id,organization_id,product_id,stock_code,variant_name,base_price,cost_price,status)
    values ('${fixture.variantId}','${fixture.organizationId}','${fixture.productId}','MP-RACE-SKU-${suffix}','Standard',100,50,'ACTIVE');
    insert into public.warehouses (id,organization_id,code,name,status)
    values ('${fixture.warehouseId}','${fixture.organizationId}','MP-RACE-WH-${suffix}','Manual Race Warehouse','ACTIVE');
    insert into public.orders (id,organization_id,customer_id,order_number,source,order_status,payment_status,fulfillment_status,subtotal,grand_total,amount_due,payment_due_at) values
      ('${fixture.orders[0].orderId}','${fixture.organizationId}','${fixture.customerId}','MP-RACE-A-${suffix}','STOREFRONT','PENDING_CONFIRMATION','UNPAID','UNFULFILLED',100,100,100,now()+interval '15 minutes'),
      ('${fixture.orders[1].orderId}','${fixture.organizationId}','${fixture.customerId}','MP-RACE-B-${suffix}','STOREFRONT','PENDING_CONFIRMATION','UNPAID','UNFULFILLED',100,100,100,now()+interval '15 minutes'),
      ('${fixture.orders[2].orderId}','${fixture.organizationId}','${fixture.customerId}','MP-RACE-C-${suffix}','STOREFRONT','PENDING_CONFIRMATION','UNPAID','UNFULFILLED',100,100,100,now()+interval '15 minutes');
    insert into public.order_items (id,organization_id,order_id,variant_id,sku_snapshot,product_name_snapshot,variant_name_snapshot,quantity,original_unit_price,applied_unit_price,line_total) values
      ('${fixture.orders[0].orderItemId}','${fixture.organizationId}','${fixture.orders[0].orderId}','${fixture.variantId}','MP-RACE-SKU-${suffix}','Manual Race Product','Standard',1,100,100,100),
      ('${fixture.orders[1].orderItemId}','${fixture.organizationId}','${fixture.orders[1].orderId}','${fixture.variantId}','MP-RACE-SKU-${suffix}','Manual Race Product','Standard',1,100,100,100),
      ('${fixture.orders[2].orderItemId}','${fixture.organizationId}','${fixture.orders[2].orderId}','${fixture.variantId}','MP-RACE-SKU-${suffix}','Manual Race Product','Standard',1,100,100,100);
    insert into public.payments (id,organization_id,order_id,status,amount_expected,amount_received,currency_code) values
      ('${fixture.orders[0].paymentId}','${fixture.organizationId}','${fixture.orders[0].orderId}','UNPAID',100,0,'THB'),
      ('${fixture.orders[1].paymentId}','${fixture.organizationId}','${fixture.orders[1].orderId}','UNPAID',100,0,'THB'),
      ('${fixture.orders[2].paymentId}','${fixture.organizationId}','${fixture.orders[2].orderId}','UNPAID',100,0,'THB');
    insert into public.inventory_reservations (id,organization_id,warehouse_id,variant_id,order_id,order_item_id,quantity,status,expires_at)
    values ('${fixture.reservationId}','${fixture.organizationId}','${fixture.warehouseId}','${fixture.variantId}','${fixture.orders[0].orderId}','${fixture.orders[0].orderItemId}',1,'ACTIVE',now()+interval '15 minutes');
  `);

  await expectOneWinner("pending attempt", [
    concurrentInsertTransaction(fixture.orders[0].paymentId, "MP-RACE-ATTEMPT-A"),
    concurrentInsertTransaction(fixture.orders[0].paymentId, "MP-RACE-ATTEMPT-B"),
  ]);

  const pendingTransactionId = runPsql(`
    select id from public.payment_transactions
    where organization_id='${fixture.organizationId}'
      and payment_id='${fixture.orders[0].paymentId}'
      and status='PENDING';
  `).trim();

  await expectOneWinner("pending proof", [
    runConcurrentPsql(`
      insert into public.payment_proofs (organization_id,payment_transaction_id,storage_path,mime_type,submitted_by_type,verification_status)
      values ('${fixture.organizationId}','${pendingTransactionId}','private/race-a.png','image/png','CUSTOMER','PENDING');
    `),
    runConcurrentPsql(`
      insert into public.payment_proofs (organization_id,payment_transaction_id,storage_path,mime_type,submitted_by_type,verification_status)
      values ('${fixture.organizationId}','${pendingTransactionId}','private/race-b.png','image/png','CUSTOMER','PENDING');
    `),
  ]);

  await expectOneWinner("normalized active reference", [
    concurrentInsertTransaction(fixture.orders[1].paymentId, "MP-RACE-NORMALIZED"),
    concurrentInsertTransaction(fixture.orders[2].paymentId, " mp-race-normalized "),
  ]);

  await expectOneWinner("reservation allocation", [
    concurrentInsertAllocation(),
    concurrentInsertAllocation(),
  ]);

  const counts = runPsql(`
    select concat_ws('|',
      (select count(*) from public.payment_transactions where organization_id='${fixture.organizationId}' and payment_id='${fixture.orders[0].paymentId}' and status='PENDING'),
      (select count(*) from public.payment_proofs where organization_id='${fixture.organizationId}' and payment_transaction_id='${pendingTransactionId}' and verification_status='PENDING'),
      (select count(*) from public.payment_transactions where organization_id='${fixture.organizationId}' and upper(btrim(external_reference))='MP-RACE-NORMALIZED' and status in ('PENDING','SUCCEEDED')),
      (select count(*) from public.inventory_allocations where organization_id='${fixture.organizationId}' and source_reservation_id='${fixture.reservationId}')
    );
  `).trim();

  if (counts !== "1|1|1|1") {
    throw new Error(`manual payment concurrency counts failed: ${counts}`);
  }

  console.log("phase_1d_manual_payment_additive_schema_concurrency pass");
} finally {
  runPsql(`
    set session_replication_role=replica;
    delete from public.payment_proofs where organization_id='${fixture.organizationId}';
    delete from public.payment_transactions where organization_id='${fixture.organizationId}';
    delete from public.inventory_allocations where organization_id='${fixture.organizationId}';
    delete from public.inventory_reservations where organization_id='${fixture.organizationId}';
    delete from public.payments where organization_id='${fixture.organizationId}';
    delete from public.order_items where organization_id='${fixture.organizationId}';
    delete from public.orders where organization_id='${fixture.organizationId}';
    delete from public.warehouses where organization_id='${fixture.organizationId}';
    delete from public.product_variants where organization_id='${fixture.organizationId}';
    delete from public.products where organization_id='${fixture.organizationId}';
    delete from public.customers where organization_id='${fixture.organizationId}';
    delete from public.organizations where id='${fixture.organizationId}';
    set session_replication_role=origin;
  `);
}

runSupabaseDbLint();

console.log("phase_1d_manual_payment_additive_schema_suite pass");

function concurrentInsertTransaction(paymentId, reference) {
  return runConcurrentPsql(`
    insert into public.payment_transactions (
      organization_id,payment_id,transaction_type,payment_method,
      amount,currency_code,external_reference,status
    ) values (
      '${fixture.organizationId}','${paymentId}','PAYMENT','BANK_TRANSFER',
      100,'THB','${reference}','PENDING'
    );
  `);
}

function concurrentInsertAllocation() {
  return runConcurrentPsql(`
    insert into public.inventory_allocations (
      organization_id,warehouse_id,variant_id,order_id,order_item_id,
      source_reservation_id,quantity,status
    ) values (
      '${fixture.organizationId}','${fixture.warehouseId}','${fixture.variantId}',
      '${fixture.orders[0].orderId}','${fixture.orders[0].orderItemId}',
      '${fixture.reservationId}',1,'ACTIVE'
    );
  `);
}

async function expectOneWinner(name, attempts) {
  const results = await Promise.allSettled(attempts);
  const winners = results.filter((result) => result.status === "fulfilled");
  const losers = results.filter((result) => result.status === "rejected");

  if (winners.length !== 1 || losers.length !== 1) {
    throw new Error(`${name} race failed: winners=${winners.length}, losers=${losers.length}`);
  }
}

function runConcurrentPsql(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      dockerBin,
      [
        "exec", "-i", dbContainer, "psql", "-U", "postgres", "-d",
        "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`concurrent psql failed (${code}): ${stderr}`));
      }
    });
    child.stdin.end(sql);
  });
}

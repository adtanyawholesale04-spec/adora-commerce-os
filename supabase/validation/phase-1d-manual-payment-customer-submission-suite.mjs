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
    name: "phase_1d_manual_payment_customer_submission",
    file: "supabase/validation/054_phase_1d_manual_payment_customer_submission_test.sql",
    requiredRows: ["phase_1d_manual_payment_customer_submission|pass"],
  },
]);

const fixture = {
  authId: randomUUID(),
  profileId: randomUUID(),
  membershipId: randomUUID(),
  organizationId: randomUUID(),
  customerId: randomUUID(),
  linkId: randomUUID(),
  storefrontId: randomUUID(),
  submissionOrderId: randomUUID(),
  submissionPaymentId: randomUUID(),
  expiryOrderId: randomUUID(),
  expiryPaymentId: randomUUID(),
};
const suffix = fixture.organizationId.slice(0, 8);

try {
  runPsql(`
    insert into auth.users (id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    values ('${fixture.authId}','authenticated','authenticated','payment-submit-race-${suffix}@example.test',now(),'{}','{}',now(),now());
    insert into public.organizations (id,name,slug,status,currency_code)
    values ('${fixture.organizationId}','Payment Submit Race ${suffix}','payment-submit-race-${suffix}','ACTIVE','THB');
    insert into public.profiles (id,auth_user_id,display_name,status)
    values ('${fixture.profileId}','${fixture.authId}','Payment Submit Race','ACTIVE');
    insert into public.organization_memberships (id,organization_id,profile_id,status,is_default,joined_at)
    values ('${fixture.membershipId}','${fixture.organizationId}','${fixture.profileId}','ACTIVE',true,now());
    insert into public.customers (id,organization_id,customer_code,display_name,status)
    values ('${fixture.customerId}','${fixture.organizationId}','PAY-RACE-${suffix}','Payment Submit Race','ACTIVE');
    insert into public.customer_profile_links (id,organization_id,customer_id,profile_id,link_status,link_source,verification_method,verified_at)
    values ('${fixture.linkId}','${fixture.organizationId}','${fixture.customerId}','${fixture.profileId}','ACTIVE','VERIFIED_SIGNUP','EMAIL_OTP',now());
    insert into public.organization_storefronts (id,organization_id,publication_status,tagline,published_at,published_by)
    values ('${fixture.storefrontId}','${fixture.organizationId}','PUBLISHED','Payment Race',now(),'${fixture.profileId}');
    insert into public.organization_checkout_settings (organization_id,status,currency_code,reservation_minutes,payment_due_minutes)
    values ('${fixture.organizationId}','ACTIVE','THB',15,15);
    insert into public.organization_entitlements (organization_id,feature_id,source_type,enabled,valid_from)
    select '${fixture.organizationId}',id,'MANUAL_OVERRIDE',true,now()-interval '1 day'
    from public.features where code='storefront.checkout';
    insert into public.orders (id,organization_id,customer_id,order_number,source,currency_code,order_status,payment_status,fulfillment_status,subtotal,grand_total,amount_paid,amount_due,payment_due_at) values
      ('${fixture.submissionOrderId}','${fixture.organizationId}','${fixture.customerId}','PAY-RACE-A-${suffix}','STOREFRONT','THB','PENDING_CONFIRMATION','UNPAID','UNFULFILLED',100,100,0,100,now()+interval '15 minutes'),
      ('${fixture.expiryOrderId}','${fixture.organizationId}','${fixture.customerId}','PAY-RACE-B-${suffix}','STOREFRONT','THB','PENDING_CONFIRMATION','UNPAID','UNFULFILLED',100,100,0,100,now()-interval '1 second');
    insert into public.payments (id,organization_id,order_id,status,amount_expected,amount_received,currency_code) values
      ('${fixture.submissionPaymentId}','${fixture.organizationId}','${fixture.submissionOrderId}','UNPAID',100,0,'THB'),
      ('${fixture.expiryPaymentId}','${fixture.organizationId}','${fixture.expiryOrderId}','UNPAID',100,0,'THB');
  `);

  const submissionRace = await Promise.allSettled([
    submitReference("PAY-RACE-REFERENCE-A", randomUUID()),
    submitReference("PAY-RACE-REFERENCE-B", randomUUID()),
  ]);
  const submissionWinners = submissionRace.filter((result) => result.status === "fulfilled");
  const submissionLosers = submissionRace.filter((result) => result.status === "rejected");
  if (submissionWinners.length !== 1 || submissionLosers.length !== 1
      || !String(submissionLosers[0].reason).includes("PAYMENT_ATTEMPT_PENDING")) {
    throw new Error(
      `submission race failed: winners=${submissionWinners.length}, losers=${submissionLosers.length}, reason=${String(submissionLosers[0]?.reason)}`,
    );
  }
  console.log("phase_1d_manual_payment_customer_submission_race pass");

  const expiryRace = await Promise.allSettled([
    submitReference("PAY-RACE-EXPIRED", randomUUID(), fixture.expiryOrderId),
    expireOrder(randomUUID()),
  ]);
  const expiryWinners = expiryRace.filter((result) => result.status === "fulfilled");
  const expiryLosers = expiryRace.filter((result) => result.status === "rejected");
  if (expiryWinners.length !== 1 || expiryLosers.length !== 1
      || !String(expiryLosers[0].reason).match(/PAYMENT_EXPIRED|ORDER_NOT_PAYABLE/)) {
    throw new Error(
      `submission-expiry race failed: winners=${expiryWinners.length}, losers=${expiryLosers.length}, reason=${String(expiryLosers[0]?.reason)}`,
    );
  }

  const counts = runPsql(`
    select concat_ws('|',
      (select count(*) from public.payment_transactions where organization_id='${fixture.organizationId}' and payment_id='${fixture.submissionPaymentId}' and status='PENDING'),
      (select count(*) from public.payment_proofs pp join public.payment_transactions pt on pt.organization_id=pp.organization_id and pt.id=pp.payment_transaction_id where pp.organization_id='${fixture.organizationId}' and pt.payment_id='${fixture.submissionPaymentId}' and pp.verification_status='PENDING'),
      (select count(*) from public.audit_logs where organization_id='${fixture.organizationId}' and action='PAYMENT_PROOF_SUBMITTED'),
      (select order_status from public.orders where id='${fixture.expiryOrderId}')
    );
  `).trim();
  if (counts !== "1|1|1|PAYMENT_EXPIRED") {
    throw new Error(`submission concurrency evidence failed: ${counts}`);
  }
  console.log("phase_1d_manual_payment_submission_expiry_race pass");
} finally {
  runPsql(`
    set session_replication_role=replica;
    delete from public.audit_logs where organization_id='${fixture.organizationId}';
    delete from public.commerce_idempotency_keys where organization_id='${fixture.organizationId}';
    delete from public.payment_proofs where organization_id='${fixture.organizationId}';
    delete from public.payment_transactions where organization_id='${fixture.organizationId}';
    delete from public.order_status_history where organization_id='${fixture.organizationId}';
    delete from public.payments where organization_id='${fixture.organizationId}';
    delete from public.orders where organization_id='${fixture.organizationId}';
    delete from public.organization_entitlements where organization_id='${fixture.organizationId}';
    delete from public.organization_checkout_settings where organization_id='${fixture.organizationId}';
    delete from public.organization_storefronts where organization_id='${fixture.organizationId}';
    delete from public.customer_profile_links where organization_id='${fixture.organizationId}';
    delete from public.customers where organization_id='${fixture.organizationId}';
    delete from public.organization_memberships where organization_id='${fixture.organizationId}';
    delete from public.profiles where id='${fixture.profileId}';
    delete from auth.users where id='${fixture.authId}';
    delete from public.organizations where id='${fixture.organizationId}';
    set session_replication_role=origin;
  `);
}

runSupabaseDbLint();

console.log("phase_1d_manual_payment_customer_submission_suite pass");

function submitReference(reference, requestId, orderId = fixture.submissionOrderId) {
  return runConcurrentPsql(`
    begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub','${fixture.authId}',true);
    select set_config('request.jwt.claim.role','authenticated',true);
    select public.api_submit_storefront_payment_proof(
      '${fixture.organizationId}','${orderId}','${reference}','${requestId}'
    );
    commit;
  `);
}

function expireOrder(requestId) {
  return runConcurrentPsql(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claim.role','service_role',true);
    select public.api_expire_storefront_checkout(
      '${fixture.organizationId}','${fixture.expiryOrderId}','${requestId}'
    );
    commit;
  `);
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

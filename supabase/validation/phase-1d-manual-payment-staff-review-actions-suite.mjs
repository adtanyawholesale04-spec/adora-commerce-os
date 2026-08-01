import { spawn } from "node:child_process";
import {
  dbContainer,
  dockerBin,
  dockerPath,
  runCommand,
  runPsql,
  runSqlSuite,
  runSupabaseDbLint,
  supabaseCli,
} from "./supabase-validation-runner.mjs";

function resetLocalDatabase() {
  runCommand(
    supabaseCli.command,
    [...supabaseCli.argsPrefix, "supabase", "db", "reset", "--local", "--yes"],
    {
      env: {
        ...process.env,
        PATH: `${dockerPath};${process.env.PATH}`,
      },
      silent: true,
    },
  );
}

function runConcurrentPsql(sql) {
  return new Promise((resolve) => {
    const child = spawn(dockerBin, [
      "exec", "-i", dbContainer, "psql", "-U", "postgres", "-d", "postgres",
      "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A",
    ], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(sql);
  });
}

const reviewerSession = `
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
`;

resetLocalDatabase();

try {
  runSqlSuite([
    {
      name: "phase_1d_manual_payment_staff_review_actions",
      file: "supabase/validation/057_phase_1d_manual_payment_staff_review_actions_test.sql",
      requiredRows: ["phase_1d_manual_payment_staff_review_actions|pass"],
    },
  ]);

  const raceResults = await Promise.all([
    runConcurrentPsql(`${reviewerSession}
      select public.api_verify_storefront_payment(
        'a1000000-0000-4000-8000-000000000001',
        'a7500000-0000-4000-8000-000000000004',
        'PENDING', 'Concurrent approval decision',
        'a9000000-0000-4000-8000-000000000006'
      );
    `),
    runConcurrentPsql(`${reviewerSession}
      select public.api_reject_storefront_payment(
        'a1000000-0000-4000-8000-000000000001',
        'a7500000-0000-4000-8000-000000000004',
        'PENDING', 'Concurrent rejection decision',
        'a9000000-0000-4000-8000-000000000007'
      );
    `),
  ]);

  const successes = raceResults.filter((result) => result.code === 0);
  const losers = raceResults.filter((result) => result.code !== 0);
  if (successes.length !== 1 || losers.length !== 1
      || !losers[0].stderr.includes("PAYMENT_ALREADY_REVIEWED")) {
    throw new Error(`Staff Review race contract failed: ${JSON.stringify(raceResults)}`);
  }

  const raceEvidence = runPsql(`
    do $$
    declare
      v_transaction_status text;
      v_proof_status text;
      v_order_status text;
      v_payment_status text;
      v_verified_audits bigint;
      v_rejected_audits bigint;
      v_allocations bigint;
      v_terminal_keys bigint;
    begin
      select transaction_row.status, proof.verification_status,
             order_row.order_status, payment.status
      into v_transaction_status, v_proof_status, v_order_status, v_payment_status
      from public.payment_transactions transaction_row
      join public.payment_proofs proof
        on proof.organization_id = transaction_row.organization_id
       and proof.payment_transaction_id = transaction_row.id
      join public.payments payment
        on payment.organization_id = transaction_row.organization_id
       and payment.id = transaction_row.payment_id
      join public.orders order_row
        on order_row.organization_id = payment.organization_id
       and order_row.id = payment.order_id
      where transaction_row.id = 'a7500000-0000-4000-8000-000000000004';

      select count(*) filter (where action = 'PAYMENT_VERIFIED'),
             count(*) filter (where action = 'PAYMENT_REJECTED')
      into v_verified_audits, v_rejected_audits
      from public.audit_logs
      where entity_id = 'a7500000-0000-4000-8000-000000000004';

      select count(*) into v_allocations
      from public.inventory_allocations
      where source_reservation_id = 'a7300000-0000-4000-8000-000000000004';

      select count(*) into v_terminal_keys
      from public.commerce_idempotency_keys
      where request_id in (
        'a9000000-0000-4000-8000-000000000006',
        'a9000000-0000-4000-8000-000000000007'
      ) and state = 'SUCCEEDED';

      if v_terminal_keys <> 1
         or not (
           v_transaction_status = 'SUCCEEDED'
           and v_proof_status = 'VERIFIED'
           and v_order_status = 'CONFIRMED'
           and v_payment_status = 'PAID'
           and v_verified_audits = 1 and v_rejected_audits = 0
           and v_allocations = 1
         ) and not (
           v_transaction_status = 'FAILED'
           and v_proof_status = 'REJECTED'
           and v_order_status = 'PENDING_CONFIRMATION'
           and v_payment_status = 'UNPAID'
           and v_verified_audits = 0 and v_rejected_audits = 1
           and v_allocations = 0
         ) then
        raise exception 'Staff Review race evidence is inconsistent';
      end if;
    end;
    $$;
    select 'phase_1d_manual_payment_staff_review_race|pass';
  `);

  if (!raceEvidence.includes("phase_1d_manual_payment_staff_review_race|pass")) {
    throw new Error(`Staff Review race evidence missing: ${raceEvidence}`);
  }

  console.log("phase_1d_manual_payment_staff_review_race pass");
  runSupabaseDbLint();
} finally {
  resetLocalDatabase();
}

console.log("phase_1d_manual_payment_staff_review_actions_suite pass");

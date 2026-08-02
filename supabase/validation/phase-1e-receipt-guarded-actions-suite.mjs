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

function parseResponse(result) {
  if (result.code !== 0) {
    throw new Error(`Receipt action command failed: ${JSON.stringify(result)}`);
  }

  const line = result.stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .findLast((value) => value.startsWith("{"));

  if (!line) {
    throw new Error(`Receipt action response is missing: ${JSON.stringify(result)}`);
  }

  return JSON.parse(line);
}

const actorSession = `
set role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', false);
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', false);
`;
const organizationId = "b1000000-0000-4000-8000-000000000001";

resetLocalDatabase();

try {
  runSqlSuite([
    {
      name: "phase_1e_receipt_guarded_actions",
      file: "supabase/validation/060_phase_1e_receipt_guarded_actions_test.sql",
      requiredRows: ["phase_1e_receipt_guarded_actions|pass"],
    },
  ]);

  const sameRequestResults = await Promise.all([
    runConcurrentPsql(`${actorSession}
      select public.api_create_receipt_document(
        '${organizationId}',
        'b7400000-0000-4000-8000-000000000008',
        'b9000000-0000-4000-8000-000000000080',
        null
      );
    `),
    runConcurrentPsql(`${actorSession}
      select public.api_create_receipt_document(
        '${organizationId}',
        'b7400000-0000-4000-8000-000000000008',
        'b9000000-0000-4000-8000-000000000080',
        null
      );
    `),
  ]).then((results) => results.map(parseResponse));

  if (sameRequestResults.some((result) => result.ok !== true)
      || sameRequestResults[0].document_id !== sameRequestResults[1].document_id
      || sameRequestResults.filter((result) => result.idempotency_reused === false).length !== 1
      || sameRequestResults.filter((result) => result.idempotency_reused === true).length !== 1) {
    throw new Error(`Same-request Receipt race failed: ${JSON.stringify(sameRequestResults)}`);
  }

  const differentRequestResults = await Promise.all([
    runConcurrentPsql(`${actorSession}
      select public.api_create_receipt_document(
        '${organizationId}',
        'b7400000-0000-4000-8000-000000000006',
        'b9000000-0000-4000-8000-000000000060',
        null
      );
    `),
    runConcurrentPsql(`${actorSession}
      select public.api_create_receipt_document(
        '${organizationId}',
        'b7400000-0000-4000-8000-000000000006',
        'b9000000-0000-4000-8000-000000000061',
        null
      );
    `),
  ]).then((results) => results.map(parseResponse));

  if (differentRequestResults.filter((result) => result.ok === true).length !== 1
      || differentRequestResults.filter(
        (result) => result.ok === false && result.error_code === "INVALID_LIFECYCLE",
      ).length !== 1) {
    throw new Error(`Different-request Receipt race failed: ${JSON.stringify(differentRequestResults)}`);
  }

  const lifecycleDocumentId = runPsql(`
    select document.id
    from public.finance_documents document
    where document.organization_id = '${organizationId}'
      and document.payment_id = 'b7400000-0000-4000-8000-000000000007';
  `).trim();

  if (!/^[0-9a-f-]{36}$/.test(lifecycleDocumentId)) {
    throw new Error(`Lifecycle Receipt document is missing: ${lifecycleDocumentId}`);
  }

  const lifecycleResults = await Promise.all([
    runConcurrentPsql(`${actorSession}
      select public.api_void_receipt_document(
        '${organizationId}',
        '${lifecycleDocumentId}',
        'Concurrent lifecycle void',
        'b9000000-0000-4000-8000-000000000070'
      );
    `),
    runConcurrentPsql(`${actorSession}
      select public.api_reverse_receipt_document(
        '${organizationId}',
        '${lifecycleDocumentId}',
        'Concurrent lifecycle reversal',
        'b9000000-0000-4000-8000-000000000071',
        'b7600000-0000-4000-8000-000000000007',
        null
      );
    `),
  ]).then((results) => results.map(parseResponse));

  if (lifecycleResults.filter((result) => result.ok === true).length !== 1
      || lifecycleResults.filter(
        (result) => result.ok === false && result.error_code === "INVALID_LIFECYCLE",
      ).length !== 1) {
    throw new Error(`Receipt lifecycle race failed: ${JSON.stringify(lifecycleResults)}`);
  }

  const raceEvidence = runPsql(`
    do $$
    declare
      v_document_count bigint;
      v_sequence_value bigint;
      v_lifecycle_status text;
      v_void_audits bigint;
      v_reverse_audits bigint;
    begin
      select count(*) into v_document_count
      from public.finance_documents
      where organization_id = '${organizationId}';

      select current_value into v_sequence_value
      from public.document_sequences
      where organization_id = '${organizationId}'
        and document_type = 'RECEIPT';

      select status into v_lifecycle_status
      from public.finance_documents
      where organization_id = '${organizationId}'
        and id = '${lifecycleDocumentId}';

      select count(*) filter (where action = 'RECEIPT_VOIDED'),
             count(*) filter (where action = 'RECEIPT_REVERSED')
      into v_void_audits, v_reverse_audits
      from public.audit_logs
      where organization_id = '${organizationId}'
        and entity_type = 'finance_document'
        and entity_id = '${lifecycleDocumentId}';

      if v_document_count <> 8
         or v_sequence_value <> 8
         or (select count(*) from public.finance_documents
             where organization_id = '${organizationId}'
               and payment_id = 'b7400000-0000-4000-8000-000000000006'
               and replaces_document_id is null) <> 1
         or (select count(*) from public.finance_documents
             where organization_id = '${organizationId}'
               and payment_id = 'b7400000-0000-4000-8000-000000000008'
               and replaces_document_id is null) <> 1
         or (select count(*) from public.commerce_idempotency_keys
             where organization_id = '${organizationId}'
               and operation = 'RECEIPT_CREATE'
               and request_id = 'b9000000-0000-4000-8000-000000000080'
               and state = 'SUCCEEDED') <> 1
         or (select count(*) filter (where state = 'SUCCEEDED') from public.commerce_idempotency_keys
             where organization_id = '${organizationId}'
               and operation = 'RECEIPT_CREATE'
               and request_id in (
                 'b9000000-0000-4000-8000-000000000060',
                 'b9000000-0000-4000-8000-000000000061'
               )) <> 1
         or (select count(*) filter (where state = 'FAILED' and failure_code = 'INVALID_LIFECYCLE')
             from public.commerce_idempotency_keys
             where organization_id = '${organizationId}'
               and operation = 'RECEIPT_CREATE'
               and request_id in (
                 'b9000000-0000-4000-8000-000000000060',
                 'b9000000-0000-4000-8000-000000000061'
               )) <> 1
         or (select count(*) filter (where state = 'SUCCEEDED') from public.commerce_idempotency_keys
             where organization_id = '${organizationId}'
               and request_id in (
                 'b9000000-0000-4000-8000-000000000070',
                 'b9000000-0000-4000-8000-000000000071'
               )) <> 1
         or (select count(*) filter (where state = 'FAILED' and failure_code = 'INVALID_LIFECYCLE')
             from public.commerce_idempotency_keys
             where organization_id = '${organizationId}'
               and request_id in (
                 'b9000000-0000-4000-8000-000000000070',
                 'b9000000-0000-4000-8000-000000000071'
               )) <> 1
         or exists (
           select 1 from public.commerce_idempotency_keys
           where organization_id = '${organizationId}'
             and operation like 'RECEIPT_%'
             and state = 'IN_PROGRESS'
         )
         or not (
           v_lifecycle_status = 'VOID'
           and v_void_audits = 1
           and v_reverse_audits = 0
         ) and not (
           v_lifecycle_status = 'REVERSED'
           and v_void_audits = 0
           and v_reverse_audits = 1
         ) then
        raise exception 'Receipt race evidence is inconsistent';
      end if;

      if not exists (
        select 1 from public.orders
        where id = 'b7100000-0000-4000-8000-000000000007'
          and order_status = 'CONFIRMED'
          and payment_status = 'PAID'
          and amount_paid = 700
          and amount_due = 0
      ) or not exists (
        select 1 from public.payments
        where id = 'b7400000-0000-4000-8000-000000000007'
          and status = 'PAID'
          and amount_received = 700
      ) or not exists (
        select 1 from public.refunds
        where id = 'b7600000-0000-4000-8000-000000000007'
          and status = 'COMPLETED'
          and amount = 700
      ) then
        raise exception 'Receipt race changed a canonical financial source';
      end if;
    end;
    $$;
    select 'phase_1e_receipt_guarded_actions_race|pass';
  `);

  if (!raceEvidence.includes("phase_1e_receipt_guarded_actions_race|pass")) {
    throw new Error(`Receipt race evidence missing: ${raceEvidence}`);
  }

  console.log("phase_1e_receipt_guarded_actions_race pass");
  runSupabaseDbLint();
} finally {
  resetLocalDatabase();
}

console.log("phase_1e_receipt_guarded_actions_suite pass");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const serviceSource = readFileSync(
  "src/lib/storefront/manual-payment.ts",
  "utf8",
);
const actions = readFileSync("src/app/store/actions.ts", "utf8");
const environment = readFileSync(".env.example", "utf8");
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART3B_CUSTOMER_SUBMISSION_SERVICE_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

const IDS = {
  organization: "10000000-0000-4000-8000-000000000001",
  order: "10000000-0000-4000-8000-000000000002",
  payment: "10000000-0000-4000-8000-000000000003",
  transaction: "10000000-0000-4000-8000-000000000004",
  proof: "10000000-0000-4000-8000-000000000005",
  request: "10000000-0000-4000-8000-000000000006",
};

function loadService() {
  const prepared = serviceSource
    .replace('import "server-only";', "")
    .replace(
      /import \{ createSupabaseServerClient \} from "@\/lib\/supabase\/server";/,
      "const createSupabaseServerClient = async () => { throw new Error('uninjected client'); };",
    )
    .replaceAll("export ", "")
    .concat(
      "\nmodule.exports = { createManualPaymentSubmissionService, isStorefrontManualPaymentAvailable };",
    );
  const output = ts.transpileModule(prepared, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const sandbox = {
    module: { exports: {} },
    exports: {},
    process: { env: {} },
  };
  vm.runInNewContext(output, sandbox);
  return sandbox.module.exports;
}

function successPayload(overrides = {}) {
  return {
    ok: true,
    operation: "PAYMENT_PROOF_SUBMIT",
    order_id: IDS.order,
    payment_id: IDS.payment,
    payment_transaction_id: IDS.transaction,
    payment_proof_id: IDS.proof,
    transaction_status: "PENDING",
    proof_status: "PENDING",
    evidence_type: "REFERENCE_ONLY",
    payment_due_at: "2026-08-01T12:00:00.000Z",
    idempotency_reused: false,
    ...overrides,
  };
}

function createClient({ user = { id: "auth-user" }, rpcData, rpcError } = {}) {
  const calls = [];
  const organizationQuery = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    async maybeSingle() {
      return {
        data: {
          id: IDS.organization,
          slug: "adora-shop",
          status: "ACTIVE",
        },
        error: null,
      };
    },
  };
  return {
    calls,
    client: {
      auth: {
        async getUser() {
          return { data: { user }, error: null };
        },
      },
      from(table) {
        assert.equal(table, "organizations");
        return organizationQuery;
      },
      async rpc(name, args) {
        calls.push({ name, args });
        return { data: rpcData, error: rpcError ?? null };
      },
    },
  };
}

function submissionInput(overrides = {}) {
  return {
    organizationSlug: " ADORA-SHOP ",
    orderId: IDS.order,
    paymentReference: " bank.ref-001 ",
    requestId: IDS.request,
    ...overrides,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Part 3C defaults disabled and does not create a customer client", async () => {
  const { createManualPaymentSubmissionService } = loadService();
  let clientCreated = false;
  const service = createManualPaymentSubmissionService({
    available: () => false,
    createClient: async () => {
      clientCreated = true;
      throw new Error("must not run");
    },
  });
  const result = await service.submitPaymentProof(submissionInput());
  assert.deepEqual(plain(result), {
    ok: false,
    code: "feature_disabled",
    retryable: false,
  });
  assert.equal(clientCreated, false);
});

test("Part 3C requires an authenticated cookie session before RPC", async () => {
  const { createManualPaymentSubmissionService } = loadService();
  const fake = createClient({ user: null });
  const service = createManualPaymentSubmissionService({
    available: () => true,
    createClient: async () => fake.client,
  });
  const result = await service.submitPaymentProof(submissionInput());
  assert.equal(result.code, "auth_required");
  assert.equal(fake.calls.length, 0);
});

test("Part 3C validates bounded input before creating a customer client", async () => {
  const { createManualPaymentSubmissionService } = loadService();
  let clientCreated = false;
  const service = createManualPaymentSubmissionService({
    available: () => true,
    createClient: async () => {
      clientCreated = true;
      throw new Error("must not run");
    },
  });
  assert.equal(
    (await service.submitPaymentProof(submissionInput({ orderId: "invalid" }))).code,
    "order_not_payable",
  );
  assert.equal(
    (await service.submitPaymentProof(submissionInput({ requestId: "invalid" }))).code,
    "request_conflict",
  );
  assert.equal(
    (
      await service.submitPaymentProof(
        submissionInput({ paymentReference: "bad reference" }),
      )
    ).code,
    "payment_reference_invalid",
  );
  assert.equal(clientCreated, false);
});

test("Part 3C resolves tenant and sends only canonical RPC arguments", async () => {
  const { createManualPaymentSubmissionService } = loadService();
  const fake = createClient({ rpcData: successPayload() });
  const service = createManualPaymentSubmissionService({
    available: () => true,
    createClient: async () => fake.client,
  });
  const result = await service.submitPaymentProof(submissionInput());
  assert.equal(result.ok, true);
  assert.equal(result.code, "payment_proof_submitted");
  assert.equal("paymentReference" in result, false);
  assert.deepEqual(plain(fake.calls), [
    {
      name: "api_submit_storefront_payment_proof",
      args: {
        p_organization_id: IDS.organization,
        p_order_id: IDS.order,
        p_payment_reference: "BANK.REF-001",
        p_request_id: IDS.request,
      },
    },
  ]);
});

test("Part 3C fails closed on overbroad success and sanitizes RPC errors", async () => {
  const { createManualPaymentSubmissionService } = loadService();
  const overbroad = createClient({
    rpcData: successPayload({ payment_reference: "MUST-NOT-LEAK" }),
  });
  const overbroadService = createManualPaymentSubmissionService({
    available: () => true,
    createClient: async () => overbroad.client,
  });
  assert.deepEqual(
    plain(await overbroadService.submitPaymentProof(submissionInput())),
    { ok: false, code: "persistence_error", retryable: true },
  );

  const foreign = createClient({
    rpcError: { message: "MEMBERSHIP_REQUIRED private detail" },
  });
  const foreignService = createManualPaymentSubmissionService({
    available: () => true,
    createClient: async () => foreign.client,
  });
  assert.deepEqual(
    plain(await foreignService.submitPaymentProof(submissionInput())),
    { ok: false, code: "order_not_payable", retryable: false },
  );
});

test("Part 3C source and action preserve secret, Storage and UI gates", () => {
  assert.match(serviceSource, /import "server-only"/);
  assert.match(serviceSource, /createSupabaseServerClient/);
  assert.match(serviceSource, /client\.auth\.getUser\(\)/);
  assert.match(serviceSource, /hasExactKeys\(row, SUCCESS_KEYS\)/);
  assert.doesNotMatch(
    serviceSource,
    /createSupabaseAuthAdminClient|SUPABASE_(SECRET|SERVICE_ROLE)|\.storage\.|console\./,
  );
  assert.match(actions, /submitStorefrontPaymentProofAction/);
  assert.match(actions, /paymentReference: String\(formData\.get\("paymentReference"\)/);
  assert.doesNotMatch(actions, /api_submit_storefront_payment_proof|\.rpc\(/);
  assert.match(environment, /ACOS_STOREFRONT_MANUAL_PAYMENT_ENABLED=false/);
  assert.match(environment, /ACOS_STOREFRONT_MANUAL_PAYMENT_KILL_SWITCH=true/);
});

test("Part 3C status records local implementation and the next UI review gate", () => {
  assert.match(contract, /IMPLEMENTED LOCALLY \/ VALIDATED/);
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3C CUSTOMER SUBMISSION SERVICE IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3C LOCAL VALIDATED \/ FLAGS DISABLED \/ UI AND PRODUCTION NOT ACTIVATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D STOREFRONT SUBMISSION UI CONTRACT REVIEW/,
  );
});

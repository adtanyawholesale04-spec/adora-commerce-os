import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

const serviceSource = readFileSync(
  "src/lib/admin/manual-payment-review.ts",
  "utf8",
);
const handoffSource = readFileSync(
  "src/lib/admin/manual-payment-review-handoff.ts",
  "utf8",
);
const actions = readFileSync("src/app/admin/payments/actions.ts", "utf8");
const environment = readFileSync(".env.example", "utf8");
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4F_SERVER_ACTION_SERVICE_IMPLEMENTATION.md",
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
      /import \{[\s\S]*?\} from "@\/lib\/admin\/context";/,
      "const getAdminShellContext = async () => { throw new Error('uninjected context'); };",
    )
    .replace(
      /import \{[\s\S]*?\} from "@\/lib\/admin\/manual-payment-review-handoff";/,
      "const createManualPaymentReviewHandoffService = () => ({ recordOrderPaid: async () => 'retry_pending', recordPaymentFailed: async () => 'retry_pending' });",
    )
    .replace(
      /import \{ createSupabaseServerClient \} from "@\/lib\/supabase\/server";/,
      "const createSupabaseServerClient = async () => { throw new Error('uninjected client'); };",
    )
    .replaceAll("export ", "")
    .concat(
      "\nmodule.exports = { createManualPaymentReviewService, isAdminManualPaymentReviewAvailable };",
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

function loadHandoff() {
  const prepared = handoffSource
    .replace('import "server-only";', "")
    .replace(
      /import \{ createSupabaseAuthAdminClient \} from "@\/lib\/supabase\/admin";/,
      "const createSupabaseAuthAdminClient = () => { throw new Error('uninjected secret client'); };",
    )
    .replaceAll("export ", "")
    .concat(
      "\nmodule.exports = { createManualPaymentReviewHandoffService, deriveOrderPaidRequestId };",
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
    require,
    Buffer,
  };
  vm.runInNewContext(output, sandbox);
  return sandbox.module.exports;
}

function context(permissions = ["payment.view", "payment.verify"]) {
  return {
    mode: "configured",
    userEmail: "reviewer@example.test",
    profileId: "10000000-0000-4000-8000-000000000007",
    activeOrganizationId: IDS.organization,
    organizationName: "Adora",
    organizationStatus: "ACTIVE",
    membershipStatus: "ACTIVE",
    memberships: [],
    permissions,
  };
}

function actionPayload(operation = "PAYMENT_VERIFY", overrides = {}) {
  const verified = operation === "PAYMENT_VERIFY";
  return {
    operation,
    order_id: IDS.order,
    payment_id: IDS.payment,
    payment_transaction_id: IDS.transaction,
    payment_proof_id: IDS.proof,
    transaction_status: verified ? "SUCCEEDED" : "FAILED",
    proof_status: verified ? "VERIFIED" : "REJECTED",
    order_status: verified ? "CONFIRMED" : "PENDING_CONFIRMATION",
    order_payment_status: verified ? "PAID" : "UNPAID",
    payment_status: verified ? "PAID" : "UNPAID",
    reviewed_at: "2026-08-01T10:00:00.000Z",
    allocation_count: verified ? 2 : 0,
    coupon_consumed: verified,
    idempotency_reused: false,
    ...overrides,
  };
}

function createClient(responses) {
  const calls = [];
  return {
    calls,
    client: {
      async rpc(name, args) {
        calls.push({ name, args });
        const response = responses[name];
        return response ?? { data: null, error: { message: "unexpected" } };
      },
    },
  };
}

function actionInput(overrides = {}) {
  return {
    paymentTransactionId: IDS.transaction,
    expectedStatus: "PENDING",
    reason: "  Verified against approved bank statement  ",
    requestId: IDS.request,
    ...overrides,
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Part 4F defaults disabled before resolving Admin context or client", async () => {
  const { createManualPaymentReviewService } = loadService();
  let touched = false;
  const service = createManualPaymentReviewService({
    available: () => false,
    getContext: async () => {
      touched = true;
      return context();
    },
    createClient: async () => {
      touched = true;
      throw new Error("must not run");
    },
  });
  const result = await service.verifyReview(actionInput());
  assert.deepEqual(plain(result), {
    ok: false,
    code: "feature_disabled",
    retryable: false,
  });
  assert.equal(touched, false);
});

test("queue uses payment.view, canonical tenant and exact keyset arguments", async () => {
  const { createManualPaymentReviewService } = loadService();
  const fake = createClient({
    api_list_storefront_payment_reviews: {
      data: {
        items: [{
          payment_transaction_id: IDS.transaction,
          payment_proof_id: IDS.proof,
          payment_id: IDS.payment,
          order_id: IDS.order,
          amount: 1250,
          currency_code: "THB",
          submitted_at: "2026-08-01T09:00:00.000Z",
          payment_due_at: "2026-08-01T11:00:00.000Z",
          can_review: false,
        }],
        next_cursor: null,
      },
      error: null,
    },
  });
  const service = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(["payment.view"]),
    createClient: async () => fake.client,
  });
  const result = await service.listReviews({ limit: 25 });
  assert.equal(result.ok, true);
  assert.equal(result.items[0].amount, "1250.00");
  assert.equal("paymentReference" in result.items[0], false);
  assert.deepEqual(plain(fake.calls), [{
    name: "api_list_storefront_payment_reviews",
    args: {
      p_organization_id: IDS.organization,
      p_cursor_submitted_at: null,
      p_cursor_transaction_id: null,
      p_limit: 25,
    },
  }]);
});

test("private detail requires payment.verify before creating a client", async () => {
  const { createManualPaymentReviewService } = loadService();
  let clientCreated = false;
  const service = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(["payment.view"]),
    createClient: async () => {
      clientCreated = true;
      throw new Error("must not run");
    },
  });
  const result = await service.getReview({ paymentTransactionId: IDS.transaction });
  assert.equal(result.code, "permission_denied");
  assert.equal(clientCreated, false);

  const verifyOnlyService = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(["payment.verify"]),
    createClient: async () => {
      clientCreated = true;
      throw new Error("must not run");
    },
  });
  const verifyOnly = await verifyOnlyService.getReview({
    paymentTransactionId: IDS.transaction,
  });
  assert.equal(verifyOnly.code, "permission_denied");
  assert.equal(clientCreated, false);
});

test("verification sends only frozen RPC input and settlement survives handoff failure", async () => {
  const { createManualPaymentReviewService } = loadService();
  const fake = createClient({
    api_verify_storefront_payment: { data: actionPayload(), error: null },
  });
  const handoffs = [];
  const service = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(),
    createClient: async () => fake.client,
    recordOrderPaid: async (...args) => {
      handoffs.push(args);
      throw new Error("provider unavailable after commit");
    },
  });
  const result = await service.verifyReview(actionInput());
  assert.equal(result.ok, true);
  assert.equal(result.code, "payment_verified");
  assert.equal("paymentReference" in result, false);
  assert.deepEqual(plain(handoffs), [[IDS.organization, IDS.order]]);
  assert.deepEqual(plain(fake.calls[0]), {
    name: "api_verify_storefront_payment",
    args: {
      p_organization_id: IDS.organization,
      p_payment_transaction_id: IDS.transaction,
      p_expected_status: "PENDING",
      p_reason: "Verified against approved bank statement",
      p_request_id: IDS.request,
    },
  });
});

test("ORDER_PAID handoff re-reads canonical truth and uses stable event identity", async () => {
  const {
    createManualPaymentReviewHandoffService,
    deriveOrderPaidRequestId,
  } = loadHandoff();
  const calls = [];
  const query = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() {
      return {
        data: {
          id: IDS.order,
          organization_id: IDS.organization,
          customer_id: "10000000-0000-4000-8000-000000000008",
          source: "STOREFRONT",
          order_status: "CONFIRMED",
          payment_status: "PAID",
          currency_code: "THB",
          grand_total: "1250.00",
          confirmed_at: "2026-08-01T10:00:00.000Z",
        },
        error: null,
      };
    },
  };
  const service = createManualPaymentReviewHandoffService({
    createClient: () => ({
      from(table) {
        assert.equal(table, "orders");
        return query;
      },
      async rpc(name, args) {
        calls.push({ name, args });
        return {
          data: [{
            event_id: "10000000-0000-4000-8000-000000000009",
            idempotency_reused: false,
          }],
          error: null,
        };
      },
    }),
  });
  assert.equal(await service.recordOrderPaid(IDS.organization, IDS.order), "recorded");
  assert.equal(calls[0].name, "api_record_attribution_event");
  assert.equal(calls[0].args.p_event_type, "ORDER_PAID");
  assert.equal(
    calls[0].args.p_client_request_id,
    deriveOrderPaidRequestId(IDS.organization, IDS.order),
  );
  assert.equal(
    deriveOrderPaidRequestId(IDS.organization, IDS.order),
    deriveOrderPaidRequestId(IDS.organization, IDS.order),
  );
});

test("payment_failed handoff preserves the committed audit request on retry", async () => {
  const { createManualPaymentReviewHandoffService } = loadHandoff();
  const calls = [];
  const service = createManualPaymentReviewHandoffService({
    createClient: () => ({
      async rpc(name, args) {
        calls.push({ name, args });
        return {
          data: {
            event_id: "10000000-0000-4000-8000-000000000009",
            idempotency_reused: true,
          },
          error: null,
        };
      },
    }),
  });
  assert.equal(
    await service.recordPaymentFailed(
      IDS.organization,
      IDS.transaction,
      IDS.request,
    ),
    "recorded",
  );
  assert.deepEqual(plain(calls), [{
    name: "api_record_storefront_payment_failed_event",
    args: {
      p_organization_id: IDS.organization,
      p_payment_transaction_id: IDS.transaction,
      p_review_request_id: IDS.request,
    },
  }]);
});

test("rejection selects only the audited payment_failed handoff", async () => {
  const { createManualPaymentReviewService } = loadService();
  const fake = createClient({
    api_reject_storefront_payment: {
      data: actionPayload("PAYMENT_REJECT"),
      error: null,
    },
  });
  const failed = [];
  const service = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(),
    createClient: async () => fake.client,
    recordPaymentFailed: async (...args) => {
      failed.push(args);
      return "recorded";
    },
  });
  const result = await service.rejectReview(actionInput({
    reason: "Reference could not be matched safely",
  }));
  assert.equal(result.code, "payment_rejected");
  assert.deepEqual(plain(failed), [[
    IDS.organization,
    IDS.transaction,
    IDS.request,
  ]]);
});

test("invalid intent and private reason fail before context or RPC", async () => {
  const { createManualPaymentReviewService } = loadService();
  let touched = false;
  const service = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => {
      touched = true;
      return context();
    },
  });
  assert.equal(
    (await service.verifyReview(actionInput({ expectedStatus: "PAID" }))).code,
    "state_conflict",
  );
  assert.equal(
    (await service.verifyReview(actionInput({ reason: "OTP 12345678" }))).code,
    "reason_invalid",
  );
  assert.equal(touched, false);
});

test("strict response parsing and controlled errors fail closed", async () => {
  const { createManualPaymentReviewService } = loadService();
  const overbroad = createClient({
    api_verify_storefront_payment: {
      data: actionPayload("PAYMENT_VERIFY", { payment_reference: "PRIVATE" }),
      error: null,
    },
  });
  const service = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(),
    createClient: async () => overbroad.client,
  });
  assert.equal((await service.verifyReview(actionInput())).code, "unexpected_error");

  const denied = createClient({
    api_verify_storefront_payment: {
      data: null,
      error: { message: "PAYMENT_REVIEW_SELF_ACTION_DENIED private detail" },
    },
  });
  const deniedService = createManualPaymentReviewService({
    available: () => true,
    getContext: async () => context(),
    createClient: async () => denied.client,
  });
  assert.equal((await deniedService.verifyReview(actionInput())).code, "self_review_denied");
});

test("source boundaries isolate secrets, explicit actions and disabled flags", () => {
  assert.match(serviceSource, /import "server-only"/);
  assert.match(serviceSource, /createSupabaseServerClient/);
  assert.doesNotMatch(
    serviceSource,
    /createSupabaseAuthAdminClient|SUPABASE_(SECRET|SERVICE_ROLE)|console\./,
  );
  assert.match(handoffSource, /createSupabaseAuthAdminClient/);
  assert.match(handoffSource, /ORDER_PAID/);
  assert.match(handoffSource, /api_record_storefront_payment_failed_event/);
  assert.match(handoffSource, /deriveOrderPaidRequestId/);
  assert.doesNotMatch(handoffSource, /address|phone|email|payment_reference|console\./i);
  assert.match(actions, /verifyManualPaymentAction/);
  assert.match(actions, /rejectManualPaymentAction/);
  assert.doesNotMatch(actions, /\.rpc\(|organizationId|reviewer|SUPABASE_/);
  assert.match(environment, /^ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_ENABLED=false$/m);
  assert.match(environment, /^ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_KILL_SWITCH=true$/m);
  assert.match(contract, /IMPLEMENTED LOCALLY \/ VALIDATED/);
});

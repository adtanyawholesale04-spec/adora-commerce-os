import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const serviceSource = readFileSync("src/lib/storefront/manual-payment.ts", "utf8");
const pageSource = readFileSync(
  "src/app/store/[organizationSlug]/orders/[orderId]/payment/page.tsx",
  "utf8",
);
const formSource = readFileSync(
  "src/app/store/_components/manual-payment-form.tsx",
  "utf8",
);
const actionsSource = readFileSync("src/app/store/actions.ts", "utf8");
const copySource = readFileSync("src/lib/storefront/i18n.ts", "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

const IDS = {
  organization: "b0000000-0000-4000-8000-000000000001",
  order: "b0000000-0000-4000-8000-000000000002",
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
      "\nmodule.exports = { createManualPaymentSnapshotService, isStorefrontManualPaymentPageAvailable };",
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
  return { exports: sandbox.module.exports, env: sandbox.process.env };
}

function snapshot(overrides = {}) {
  return {
    available: true,
    order: {
      id: IDS.order,
      order_number: "ORDER-001",
      order_status: "PENDING_CONFIRMATION",
      payment_status: "UNPAID",
      fulfillment_status: "UNFULFILLED",
      currency_code: "THB",
      grand_total: "100.00",
      amount_due: "100.00",
      payment_due_at: "2026-08-01T13:00:00.000Z",
      ...overrides,
    },
    pending_attempt: { exists: false, proof_status: null },
  };
}

function createClient({ user = { id: "auth-user" }, rpcData, rpcError } = {}) {
  const calls = [];
  const organizationQuery = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() {
      return {
        data: {
          id: IDS.organization,
          slug: "adora-shop",
          name: "Adora Shop",
          timezone: "Asia/Bangkok",
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
        async getUser() { return { data: { user }, error: null }; },
      },
      from(table) {
        calls.push({ table });
        return organizationQuery;
      },
      async rpc(name, args) {
        calls.push({ name, args });
        return { data: rpcData, error: rpcError ?? null };
      },
    },
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("Part 3D-B payment read defaults disabled before creating a client", async () => {
  const { exports } = loadService();
  let created = false;
  const service = exports.createManualPaymentSnapshotService({
    available: () => false,
    createClient: async () => {
      created = true;
      throw new Error("must not run");
    },
  });
  assert.deepEqual(
    plain(await service.getPaymentPage({ organizationSlug: "adora-shop", orderId: IDS.order })),
    { state: "feature_disabled" },
  );
  assert.equal(created, false);
});

test("Part 3D-B requires both Checkout and Manual Payment server flags", () => {
  const { exports, env } = loadService();
  env.ACOS_STOREFRONT_MANUAL_PAYMENT_ENABLED = "true";
  env.ACOS_STOREFRONT_MANUAL_PAYMENT_KILL_SWITCH = "false";
  env.ACOS_STOREFRONT_CHECKOUT_ENABLED = "false";
  env.ACOS_STOREFRONT_CHECKOUT_KILL_SWITCH = "false";
  assert.equal(exports.isStorefrontManualPaymentPageAvailable(), false);
  env.ACOS_STOREFRONT_CHECKOUT_ENABLED = "true";
  assert.equal(exports.isStorefrontManualPaymentPageAvailable(), true);
  env.ACOS_STOREFRONT_MANUAL_PAYMENT_KILL_SWITCH = "true";
  assert.equal(exports.isStorefrontManualPaymentPageAvailable(), false);
});

test("Part 3D-B requires an authenticated cookie session", async () => {
  const { exports } = loadService();
  const fake = createClient({ user: null });
  const service = exports.createManualPaymentSnapshotService({
    available: () => true,
    createClient: async () => fake.client,
  });
  const result = await service.getPaymentPage({ organizationSlug: "adora-shop", orderId: IDS.order });
  assert.equal(result.state, "auth_required");
  assert.equal(fake.calls.length, 0);
});

test("Part 3D-B parses the exact snapshot and derives eligibility", async () => {
  const { exports } = loadService();
  const fake = createClient({ rpcData: snapshot() });
  const service = exports.createManualPaymentSnapshotService({
    available: () => true,
    createClient: async () => fake.client,
    now: () => new Date("2026-08-01T12:00:00.000Z"),
  });
  const result = await service.getPaymentPage({ organizationSlug: " ADORA-SHOP ", orderId: IDS.order });
  assert.equal(result.state, "ready");
  assert.equal(result.eligibility, "eligible");
  assert.equal(result.storeName, "Adora Shop");
  assert.equal("paymentReference" in result.snapshot, false);
  assert.deepEqual(plain(fake.calls), [
    { table: "organizations" },
    {
      name: "api_get_storefront_order_payment_snapshot",
      args: { p_organization_id: IDS.organization, p_order_id: IDS.order },
    },
  ]);
});

test("Part 3D-B fails closed on unavailable, overbroad and inconsistent snapshots", async () => {
  const { exports } = loadService();
  for (const [rpcData, expected] of [
    [{ available: false }, "unavailable"],
    [{ ...snapshot(), payment_reference: "MUST-NOT-LEAK" }, "query_error"],
    [snapshot({ amount_due: "99.00" }), "ready"],
  ]) {
    const fake = createClient({ rpcData });
    const service = exports.createManualPaymentSnapshotService({
      available: () => true,
      createClient: async () => fake.client,
      now: () => new Date("2026-08-01T12:00:00.000Z"),
    });
    const result = await service.getPaymentPage({ organizationSlug: "adora-shop", orderId: IDS.order });
    assert.equal(result.state, expected);
    if (result.state === "ready" && rpcData.order.amount_due === "99.00") {
      assert.equal(result.eligibility, "closed");
    }
  }
});

test("Part 3D-B distinguishes pending and expired canonical states", async () => {
  const { exports } = loadService();
  const pendingData = snapshot();
  pendingData.pending_attempt = { exists: true, proof_status: "PENDING" };
  for (const [rpcData, now, expected] of [
    [pendingData, "2026-08-01T12:00:00.000Z", "pending"],
    [snapshot(), "2026-08-01T14:00:00.000Z", "expired"],
  ]) {
    const fake = createClient({ rpcData });
    const service = exports.createManualPaymentSnapshotService({
      available: () => true,
      createClient: async () => fake.client,
      now: () => new Date(now),
    });
    const result = await service.getPaymentPage({ organizationSlug: "adora-shop", orderId: IDS.order });
    assert.equal(result.eligibility, expected);
  }
});

test("Part 3D-B route and form preserve the approved privacy boundary", () => {
  assert.match(pageSource, /createManualPaymentSnapshotService/);
  assert.match(pageSource, /\/store\/\$\{model\.canonicalSlug\}\/orders\/\$\{model\.snapshot\.order\.id\}\/payment/);
  assert.doesNotMatch(pageSource, /\.rpc\(|\.from\(|createSupabaseAuthAdminClient|SUPABASE_(SECRET|SERVICE_ROLE)/);
  assert.match(formSource, /submitStorefrontPaymentProofAction/);
  assert.match(formSource, /window\.crypto\.randomUUID\(\)/);
  assert.match(formSource, /autoComplete="off"/);
  assert.doesNotMatch(formSource, /localStorage|sessionStorage|document\.cookie|\.rpc\(|\.from\(|supabase/i);
  assert.doesNotMatch(actionsSource, /console\./);
  assert.doesNotMatch(actionsSource, /revalidatePath\(`[^`]*paymentReference/);
  assert.match(actionsSource, /orders\/\$\{orderId\}\/payment/);
});

test("Part 3D-B includes complete Thai and English payment copy", () => {
  for (const key of [
    "paymentTitle",
    "paymentReferenceLabel",
    "paymentReferenceInvalid",
    "paymentSubmittedTitle",
    "paymentPendingTitle",
    "paymentExpiredTitle",
    "paymentReferenceConflict",
    "paymentRequestConflict",
    "paymentPersistenceError",
    "paymentOfflineTitle",
  ]) {
    assert.equal(copySource.match(new RegExp(`${key}:`, "g"))?.length, 2);
  }
});

test("Part 3D-B evidence remains valid after Part 3D-C local completion", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-A OWNER DECISION FREEZE COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(status, /P16 remains mandatory for Production/);
});

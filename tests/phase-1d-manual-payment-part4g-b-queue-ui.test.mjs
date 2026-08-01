import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const queuePage = readFileSync("src/app/admin/payments/review/page.tsx", "utf8");
const loadingPage = readFileSync("src/app/admin/payments/review/loading.tsx", "utf8");
const paymentsPage = readFileSync("src/app/admin/payments/page.tsx", "utf8");
const copy = readFileSync("src/lib/admin/i18n.ts", "utf8");
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4G_B_ADMIN_REVIEW_QUEUE_UI.md",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4G-B queue uses only the guarded server read service", () => {
  assert.match(queuePage, /export const dynamic = "force-dynamic"/);
  assert.match(queuePage, /export const revalidate = 0/);
  assert.match(queuePage, /reviewService\.listReviews\(\{[\s\S]*limit: 25/);
  assert.doesNotMatch(
    queuePage,
    /\.rpc\(|\.from\(|createSupabaseAuthAdminClient|createSupabaseServerClient|SUPABASE_(SECRET|SERVICE_ROLE)/,
  );
  assert.doesNotMatch(queuePage, /getReview|verifyReview|rejectReview/);
});

test("reference-free queue omits private and unrelated canonical identifiers", () => {
  assert.doesNotMatch(
    queuePage,
    /paymentReference|paymentProofId|paymentId|orderId|customer|bank|provider|reason/i,
  );
  assert.match(queuePage, /shortIdentity\(item\.paymentTransactionId\)/);
  assert.match(queuePage, /item\.amount/);
  assert.match(queuePage, /item\.submittedAt/);
  assert.match(queuePage, /item\.paymentDueAt/);
});

test("keyset continuation keeps an exact privacy-safe URL allowlist", () => {
  assert.match(queuePage, /cursorSubmittedAt/);
  assert.match(queuePage, /cursorTransactionId/);
  assert.doesNotMatch(queuePage, /offset|totalCount|pageNumber|paymentReference/);
  assert.match(contract, /Invalid or partial cursors collapse to the controlled unavailable state/);
});

test("Payments entry is permission and feature aware", () => {
  assert.match(paymentsPage, /permissions\.includes\("payment\.view"\)/);
  assert.match(paymentsPage, /isAdminManualPaymentReviewAvailable\(\)/);
  assert.match(paymentsPage, /href="\/admin\/payments\/review"/);
});

test("queue is responsive and private detail remains locked", () => {
  assert.match(queuePage, /hidden[^"]*md:block/);
  assert.match(queuePage, /md:hidden/);
  assert.match(queuePage, /<PendingDetailControl/);
  assert.match(queuePage, /disabled/);
  assert.equal(
    existsSync("src/app/admin/payments/review/[paymentTransactionId]/page.tsx"),
    false,
  );
  assert.match(loadingPage, /aria-busy="true"/);
});

test("queue copy is complete in Thai and English", () => {
  for (const key of [
    "pageTitle",
    "queueEntry",
    "queueTitle",
    "referenceProtected",
    "readyForReview",
    "detailPending",
    "emptyTitle",
    "disabledTitle",
    "permissionTitle",
    "errorTitle",
  ]) {
    const reviewBlocks = copy.match(/manualPaymentReview: \{[\s\S]*?\n    \},/g) ?? [];
    assert.equal(reviewBlocks.length, 2);
    assert.equal(
      reviewBlocks.filter((block) => block.includes(`${key}:`)).length,
      2,
    );
  }
});

test("Part 4G-B advances only to private detail approval", () => {
  assert.match(contract, /\*\*Status:\*\* IMPLEMENTED LOCALLY \/ VALIDATED/);
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-C PRIVATE REVIEW DETAIL UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-C private detail UI,[\s\S]*P16 remains mandatory for Production/,
  );
});


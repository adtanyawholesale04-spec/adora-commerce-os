import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const detailPath = "src/app/admin/payments/review/[paymentTransactionId]/page.tsx";
const detailPage = readFileSync(detailPath, "utf8");
const queuePage = readFileSync("src/app/admin/payments/review/page.tsx", "utf8");
const copy = readFileSync("src/lib/admin/i18n.ts", "utf8");
const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4G_C_PRIVATE_REVIEW_DETAIL_UI.md",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("private detail route is dynamic and server-only", () => {
  assert.equal(existsSync(detailPath), true);
  assert.match(detailPage, /export const dynamic = "force-dynamic"/);
  assert.match(detailPage, /export const revalidate = 0/);
  assert.match(detailPage, /export const fetchCache = "force-no-store"/);
  assert.match(detailPage, /noStore\(\)/);
  assert.match(detailPage, /reviewService\.getReview\(/);
  assert.doesNotMatch(
    detailPage,
    /\.rpc\(|\.from\(|createSupabaseAuthAdminClient|createSupabaseServerClient|SUPABASE_(SECRET|SERVICE_ROLE)/,
  );
});

test("detail route exposes only the approved read and no action controls", () => {
  assert.match(detailPage, /detail\.paymentReference/);
  for (const field of ["paymentTransactionId", "paymentId", "paymentProofId", "orderId", "transactionStatus", "proofStatus", "orderStatus", "paymentStatus"]) {
    assert.match(detailPage, new RegExp(`detail\\.${field}`));
  }
  assert.doesNotMatch(detailPage, /verifyReview|rejectReview|type="submit"|<form/);
  assert.doesNotMatch(detailPage, /customer|phone|email|address|bank|provider/i);
});

test("metadata is static and private data stays out of metadata", () => {
  assert.match(detailPage, /export async function generateMetadata\(\)/);
  assert.match(detailPage, /index: false, follow: false/);
  const metadataSection = detailPage.split("export async function generateMetadata")[1].split("export default async function")[0];
  assert.doesNotMatch(metadataSection, /params|paymentReference|paymentTransactionId/);
});

test("queue links to the opaque detail route without adding private fields", () => {
  assert.match(queuePage, /href={`\/admin\/payments\/review\/\$\{paymentTransactionId\}`}/);
  assert.doesNotMatch(queuePage, /paymentReference|paymentProofId|paymentId|orderId|customer|bank|provider/i);
});

test("Part 4G-C contract and bilingual copy are present", () => {
  assert.match(contract, /\*\*Status:\*\* IMPLEMENTED LOCALLY \/ VALIDATED/);
  for (const key of ["detailPageCode", "detailPageTitle", "canonicalIds", "privateReference", "actionBoundaryTitle", "actionsNextPart"]) {
    const blocks = copy.match(/manualPaymentReview: \{[\s\S]*?\n    \},/g) ?? [];
    assert.equal(blocks.length, 2);
    assert.equal(blocks.filter((block) => block.includes(`${key}:`)).length, 2);
  }
});

test("Part 4G-C advances only to guarded action UI approval", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E LOCAL ACTIVATION AND AUTH\/RLS VALIDATED; REAL BROWSER QA BLOCKED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E REAL BROWSER WORKFLOW QA REQUIRES BROWSER CONNECTION AND AUTHENTICATED UI SESSION/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-E real browser workflow QA,[\s\S]*P16 remains mandatory for Production/,
  );
});





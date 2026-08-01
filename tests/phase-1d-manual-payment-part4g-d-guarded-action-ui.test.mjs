import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const detailPage = readFileSync("src/app/admin/payments/review/[paymentTransactionId]/page.tsx", "utf8");
const actionBar = readFileSync("src/app/admin/payments/review/[paymentTransactionId]/review-action-bar.tsx", "utf8");
const serverActions = readFileSync("src/app/admin/payments/actions.ts", "utf8");
const copy = readFileSync("src/lib/admin/i18n.ts", "utf8");
const contract = readFileSync("docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4G_D_GUARDED_REVIEW_ACTION_UI.md", "utf8");
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("detail composes the guarded client action boundary without browser data access", () => {
  assert.match(detailPage, /ReviewActionBar/);
  assert.match(actionBar, /useActionState/);
  assert.match(actionBar, /verifyManualPaymentAction/);
  assert.match(actionBar, /rejectManualPaymentAction/);
  assert.match(serverActions, /reviewService\.verifyReview/);
  assert.match(serverActions, /reviewService\.rejectReview/);
  assert.doesNotMatch(actionBar, /createSupabase|\.rpc\(|\.from\(|service.role|localStorage|sessionStorage|navigator\.sendBeacon|console\./);
  assert.doesNotMatch(actionBar, /window\.confirm/);
});

test("each action requires an accessible confirmation and bounded reason", () => {
  assert.match(actionBar, /role="dialog"/);
  assert.match(actionBar, /aria-modal="true"/);
  assert.match(actionBar, /aria-labelledby="review-action-dialog-title"/);
  assert.match(actionBar, /name="reason"/);
  assert.match(actionBar, /minLength=\{8\}/);
  assert.match(actionBar, /maxLength=\{500\}/);
  assert.match(actionBar, /reason\.trim\(\)\.length/);
  assert.match(actionBar, /type="submit"/);
});

test("request identity and pending behavior prevent duplicate or optimistic mutations", () => {
  assert.match(actionBar, /name="requestId"/);
  assert.match(actionBar, /setRequestId\(createRequestId\(\)\)/);
  assert.match(actionBar, /disabled=\{!canSubmit\}/);
  assert.match(actionBar, /disabled=\{!canReview \|\| pending\}/);
  assert.match(actionBar, /router\.refresh\(\)/);
  assert.doesNotMatch(actionBar, /optimistic|paymentStatus\s*=|orderStatus\s*=/);
});

test("controlled action result mapping does not expose private or raw details", () => {
  assert.match(actionBar, /state\.operation === "PAYMENT_VERIFY"/);
  assert.match(actionBar, /state\.retryable/);
  assert.match(actionBar, /state_conflict|already_reviewed|payment_expired/);
  assert.doesNotMatch(actionBar, /error\.message|error\.details|paymentReference|paymentProofId|bank|provider|customer|email|phone|address/);
});

test("Part 4G-D contract and bilingual copy are present", () => {
  assert.equal(existsSync("src/app/admin/payments/review/[paymentTransactionId]/review-action-bar.tsx"), true);
  assert.match(contract, /\*\*Status:\*\* IMPLEMENTED LOCALLY \/ VALIDATED/);
  for (const key of ["verifyAction", "rejectAction", "verifyConfirmTitle", "rejectConfirmTitle", "reasonHint", "reasonRequired", "retryableDetail"]) {
    const blocks = copy.match(/manualPaymentReview: \{[\s\S]*?\n    \},/g) ?? [];
    assert.equal(blocks.length, 2);
    assert.equal(blocks.filter((block) => block.includes(`${key}:`)).length, 2);
  }
});

test("Part 4G-D advances only to local activation and browser QA approval", () => {
  assert.match(status, /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-D GUARDED REVIEW ACTION UI IMPLEMENTED AND LOCAL VALIDATED/);
  assert.match(status, /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-E LOCAL FEATURE ACTIVATION AND REAL BROWSER WORKFLOW QA REQUIRES OWNER APPROVAL/);
  assert.match(status, /BLOCKED: Part 4G-E local feature activation,[\s\S]*P16 remains mandatory for Production/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const service = readFileSync("src/lib/admin/manual-payment-review.ts", "utf8");
const detailPage = readFileSync(
  "src/app/admin/payments/review/[paymentTransactionId]/page.tsx",
  "utf8",
);
const queuePage = readFileSync("src/app/admin/payments/review/page.tsx", "utf8");
const actionBar = readFileSync(
  "src/app/admin/payments/review/[paymentTransactionId]/review-action-bar.tsx",
  "utf8",
);
const copy = readFileSync("src/lib/admin/i18n.ts", "utf8");

test("Part 4G-E local QA covers the guarded failure-state matrix", () => {
  for (const code of [
    "feature_disabled",
    "anonymous",
    "missing_membership",
    "permission_denied",
    "review_not_found",
    "self_review_denied",
    "reason_invalid",
    "state_conflict",
    "already_reviewed",
    "payment_expired",
    "hold_inconsistent",
    "amount_inconsistent",
    "allocation_inconsistent",
    "coupon_inconsistent",
    "idempotency_conflict",
    "review_failed",
    "unexpected_error",
  ]) {
    assert.match(service, new RegExp(`\\| "${code}"`));
  }
});

test("local QA keeps permission boundaries and feature kill switch fail-closed", () => {
  assert.match(service, /available\(\)\) return failure\("feature_disabled"\)/);
  assert.match(service, /context\.mode === "anonymous"/);
  assert.match(service, /context\.membershipStatus !== "ACTIVE"/);
  assert.match(service, /requiredPermissions\.some\(/);
  assert.match(service, /requiredPermissions: ReadonlyArray<"payment\.view" \| "payment\.verify">/);
  assert.match(service, /process\.env\.ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_KILL_SWITCH !== "true"/);
});

test("local QA keeps queue/detail/action privacy and controlled UI states", () => {
  assert.match(queuePage, /<QueueState code=\{queue\.code\}/);
  assert.match(detailPage, /<DetailState code=\{detail\.code\}/);
  assert.match(detailPage, /code === "permission_denied"/);
  assert.match(detailPage, /: "unavailable"/);
  assert.match(actionBar, /state_conflict|already_reviewed|payment_expired/);
  assert.doesNotMatch(actionBar, /error\.message|error\.details|paymentReference|paymentProofId/);
  assert.doesNotMatch(queuePage, /paymentReference|customer|bank|provider|reason/);
});

test("local QA has bilingual copy for disabled, permission and error states", () => {
  for (const key of [
    "disabledTitle",
    "permissionTitle",
    "anonymousTitle",
    "membershipTitle",
    "errorTitle",
    "unavailableTitle",
  ]) {
    const blocks = copy.match(/manualPaymentReview: \{[\s\S]*?\n    \},/g) ?? [];
    assert.equal(blocks.length, 2);
    assert.equal(blocks.filter((block) => block.includes(`${key}:`)).length, 2);
  }
});

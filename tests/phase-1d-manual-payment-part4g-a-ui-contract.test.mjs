import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART4G_A_ADMIN_REVIEW_UI_CONTRACT.md",
  "utf8",
);
const status = readFileSync("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md", "utf8");

test("Part 4G-A freezes every Owner-approved UI decision", () => {
  for (let id = 1; id <= 30; id += 1) {
    assert.match(contract, new RegExp(`\\| UI${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(contract, /OWNER APPROVED \/ UI01-UI30 FROZEN \/ PART 4G-B NOT AUTHORIZED/);
  assert.match(contract, /explicitly approved all recommended values UI01-UI30 on[\s\S]*2026-08-01/);
});

test("routes isolate the reference-free queue from private detail", () => {
  assert.match(contract, /`\/admin\/payments\/review` as the dedicated review queue/);
  assert.match(contract, /`\/admin\/payments\/review\/\[paymentTransactionId\]`/);
  assert.match(contract, /Queue content[\s\S]*omit normalized reference/);
  assert.match(contract, /Force dynamic rendering and `no-store`/);
  assert.match(contract, /Never place payment reference[\s\S]*in path\/query\/hash/);
});

test("permission-aware actions preserve guarded financial truth", () => {
  assert.match(contract, /Require `payment\.view` and `payment\.verify`/);
  assert.match(contract, /Each action opens its own accessible confirmation modal/);
  assert.match(contract, /Require 8-500 trimmed characters/);
  assert.match(contract, /retain it for exact network retry/);
  assert.match(contract, /never infer success[\s\S]*optimistic state/i);
});

test("contract covers brand, accessibility and responsive requirements", () => {
  assert.match(contract, /Noto Sans Thai/);
  assert.match(contract, /complete Thai\/English copy and light\/dark token pairs/);
  assert.match(contract, /visible focus[\s\S]*44 px touch targets/);
  assert.match(contract, /320, 390, 768, 1024 and 1440 px/);
});

test("Part 4G-A freeze creates no runtime route before Part 4G-B approval", () => {
  assert.equal(existsSync("src/app/admin/payments/review/page.tsx"), false);
  assert.equal(
    existsSync("src/app/admin/payments/review/[paymentTransactionId]/page.tsx"),
    false,
  );
  assert.match(contract, /Runtime UI \/ Feature Activation \/ Migration \/ Production:[*]* NOT AUTHORIZED/);
  assert.match(contract, /Part 4G-B queue implementation[\s\S]*remain stopped/);
});

test("authoritative status advances only to separately approved queue implementation", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-A OWNER DECISION FREEZE COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4G-B ADMIN REVIEW QUEUE UI IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4G-B queue implementation,[\s\S]*P16 remains mandatory for Production/,
  );
});

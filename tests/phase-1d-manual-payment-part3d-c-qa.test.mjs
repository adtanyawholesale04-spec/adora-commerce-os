import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const form = readFileSync(
  "src/app/store/_components/manual-payment-form.tsx",
  "utf8",
);
const page = readFileSync(
  "src/app/store/[organizationSlug]/orders/[orderId]/payment/page.tsx",
  "utf8",
);
const icon = readFileSync("src/app/icon.svg", "utf8");
const report = readFileSync(
  "docs/testing/ACOS_PHASE_1D_MANUAL_PAYMENT_PART3D_C_QA_REPORT.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3D-C locks the form and announces a pending submission", () => {
  assert.match(form, /const \[state, action, pending\] = useActionState/);
  assert.match(form, /aria-busy=\{pending\}/);
  assert.match(form, /value=\{reference\}[\s\S]*disabled=\{pending\}/);
  assert.match(form, /type="button"[\s\S]*disabled=\{pending\}/);
  assert.match(form, /disabled=\{disabled \|\| pending\}/);
});

test("Part 3D-C preserves responsive and accessible payment states", () => {
  assert.match(form, /aria-describedby=/);
  assert.match(form, /payment-reference-error/);
  assert.match(form, /h-12 w-full/);
  assert.match(form, /inline-flex h-11/);
  assert.match(page, /sm:grid-cols-2 lg:grid-cols-4/);
  assert.match(page, /lg:grid-cols-\[minmax\(0,1fr\)_300px\]/);
  assert.match(page, /eligibility === "eligible"/);
  assert.match(page, /pending:[\s\S]*expired:[\s\S]*closed:/);
});

test("Part 3D-C adds a bounded application icon and complete QA evidence", () => {
  assert.match(icon, /viewBox="0 0 32 32"/);
  assert.match(icon, /#022c4a/);
  for (const width of [320, 390, 768, 1024, 1440]) {
    assert.match(report, new RegExp(`\\b${width}\\b`));
  }
  assert.match(report, /real local Supabase Auth session/);
  assert.match(report, /no Next\.js error overlay, browser console error or runtime exception remained/);
  assert.match(report, /exactly one pending transaction, one pending proof/);
  assert.match(report, /Production:\*\* NOT APPLIED \/ NOT ACTIVATED \/ BLOCKED BY P16/);
});

test("Part 3D-C status closes local UI QA without opening Production", () => {
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4D LAYER A PRIVATE REVIEW READ MIGRATION IMPLEMENTED AND LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4E LAYER B GUARDED ACTION AND HARDENING MIGRATION IMPLEMENTATION REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4E Layer B guarded action SQL,[\s\S]*P16 remains mandatory for Production/,
  );
});

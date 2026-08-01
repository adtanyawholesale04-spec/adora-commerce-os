import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync(
  "src/app/store/_components/storefront-shell.tsx",
  "utf8",
);
const state = readFileSync(
  "src/app/store/_components/storefront-state.tsx",
  "utf8",
);
const network = readFileSync(
  "src/app/store/_components/storefront-network-status.tsx",
  "utf8",
);
const list = readFileSync(
  "src/app/store/[organizationSlug]/page.tsx",
  "utf8",
);
const detail = readFileSync(
  "src/app/store/[organizationSlug]/products/[productHandle]/page.tsx",
  "utf8",
);
const loading = readFileSync(
  "src/app/store/[organizationSlug]/loading.tsx",
  "utf8",
);
const i18n = readFileSync("src/lib/storefront/i18n.ts", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const tailwind = readFileSync("tailwind.config.ts", "utf8");
const report = readFileSync(
  "docs/testing/ACOS_PHASE_1C_STOREFRONT_PART5_QA_REPORT.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 5 adds a keyboard and landmark accessibility baseline", () => {
  assert.match(shell, /href="#storefront-content"/);
  assert.match(shell, /id="storefront-content" tabIndex=\{-1\}/);
  assert.match(shell, /focus:translate-y-0/);
  assert.match(list, /aria-labelledby="storefront-title"/);
  assert.match(list, /aria-labelledby="storefront-catalog-title"/);
  assert.match(detail, /aria-labelledby="storefront-product-title"/);
  assert.match(network, /role="status"/);
});

test("Part 5 associates every disabled conversion action with a visible reason", () => {
  assert.match(list, /id="storefront-preview-actions-note"/);
  assert.match(list, /aria-describedby=\{describedBy\}/);
  assert.match(detail, /aria-describedby="storefront-ordering-note"/);
  assert.match(detail, /id="storefront-ordering-note"/);
});

test("Part 5 keeps state and preference UX bilingual and retry-safe", () => {
  assert.match(i18n, /skipToContent: "ข้ามไปยังเนื้อหา"/);
  assert.match(i18n, /skipToContent: "Skip to content"/);
  assert.match(loading, /กำลังโหลดหน้าร้าน \/ Loading Storefront/);
  assert.match(state, /retryPath = "\/"/);
  assert.match(state, /href=\{retryPath\}/);
  assert.match(list, /retryPath=\{`\/store\/\$\{organizationSlug\}`\}/);
  assert.match(
    detail,
    /retryPath=\{`\/store\/\$\{organizationSlug\}\/products\/\$\{productHandle\}`\}/,
  );
});

test("Part 5 corrects theme contrast and honors reduced motion", () => {
  assert.match(css, /--color-on-brand:/);
  assert.match(css, /--color-warning-surface:/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(tailwind, /"on-brand"/);
  assert.match(tailwind, /"warning-surface"/);
  assert.match(network, /bg-warning-surface/);
  assert.match(list, /text-on-brand/);
});

test("Part 5 records the complete controlled-preview QA matrix", () => {
  assert.match(report, /\*\*Status:\*\* VALIDATED \/ LOCAL CONTROLLED PREVIEW/);
  for (const width of [320, 390, 768, 1024, 1440]) {
    assert.match(report, new RegExp(`\\b${width}\\b`));
  }
  assert.match(report, /Text \/ brand button \| 4\.60:1 \| 8\.84:1 \| PASS/);
  assert.match(report, /fresh 320 px browser run produced no console error or warning/);
  assert.match(
    report,
    /\*\*Production:\*\* NOT ACTIVATED \/ BLOCKED BY P16/,
  );
});

test("Part 5 completes Phase 1C locally without opening Phase 1D writes", () => {
  assert.match(
    status,
    /PHASE 1C PART 5 RESPONSIVE, ACCESSIBILITY AND CONTROLLED-PREVIEW QA VALIDATED/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE COMPLETE FOR RV01-RV24/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4C STAFF REVIEW FORWARD-ONLY MIGRATION CONTRACT REVIEW REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: Part 4C migration contract review, Staff Review SQL, guarded actions,[\s\S]*P16 remains mandatory for Production/,
  );
});

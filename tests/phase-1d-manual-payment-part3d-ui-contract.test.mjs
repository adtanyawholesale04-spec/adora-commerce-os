import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contract = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1D_MANUAL_PAYMENT_PART3D_STOREFRONT_SUBMISSION_UI_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Part 3D preserves every Owner-approved UI decision through implementation", () => {
  for (let index = 1; index <= 24; index += 1) {
    assert.match(
      contract,
      new RegExp(`\\| MU${String(index).padStart(2, "0")} \\|`),
    );
  }
  assert.match(contract, /OWNER APPROVED \/ MU01-MU24 FROZEN/);
  assert.match(
    contract,
    /Owner approved the recommended values for[\s\S]*MU01-MU24 in full/,
  );
  assert.match(contract, /Runtime \/ UI Implementation:\*\* Part 3D-B server read model and guarded route\/form implemented locally/);
  assert.match(contract, /The review stage itself created no route, component, read RPC, migration/);
  assert.match(contract, /Part 3D-B Implementation Outcome/);
});

test("Part 3D records the customer-owned read prerequisite and its local delivery", () => {
  assert.match(contract, /No existing guarded customer-owned read function/);
  assert.match(contract, /Required Guarded Read Contract Before UI/);
  assert.match(contract, /resolve `auth\.uid\(\)`, active profile, membership and customer link/);
  assert.match(contract, /return the MU04 field allowlist and no bank reference/);
  assert.match(contract, /Satisfied By Part 3D-A3/);
  assert.match(contract, /Part 3D-A3 was later authorized and implemented that migration locally/);
  assert.match(contract, /Direct browser reads from `orders`, `payments`/);
});

test("Part 3D preserves payment truth, privacy and retry semantics", () => {
  assert.match(contract, /submitted for review/);
  assert.match(contract, /never label it paid, confirmed, completed or settled/);
  assert.match(contract, /Amber pending\/waiting token/);
  assert.match(contract, /Retry same request ID/);
  assert.match(contract, /keep it out of URL\/cookie\/localStorage\/sessionStorage\/analytics\/logs/);
  assert.match(contract, /Display no bank account, QR, recipient or fee/);
});

test("Part 3D preserves the current bilingual responsive visual baseline", () => {
  assert.match(contract, /existing blue Storefront tokens/);
  assert.match(contract, /Noto Sans Thai/);
  assert.match(contract, /Thai and English translation keys/);
  assert.match(contract, /both light\/dark themes/);
  assert.match(contract, /mobile-first single-column/);
  assert.match(contract, /keyboard, focus, live region, contrast and reduced-motion QA/);
  assert.match(contract, /do not adopt the proposed purple palette/);
});

test("Part 3D status preserves Owner freeze through local UI completion", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3D STOREFRONT SUBMISSION UI CONTRACT REVIEW COMPLETE: MU01-MU24/,
  );
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3D OWNER DECISION FREEZE COMPLETE: Owner approved MU01-MU24 in full/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B STAFF REVIEW SERVICE CONTRACT REVIEW COMPLETE/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 4B OWNER DECISION FREEZE FOR RV01-RV24 REQUIRES OWNER APPROVAL/,
  );
  assert.match(
    status,
    /BLOCKED: RV01-RV24 Owner freeze, Staff Review migration, guarded actions,[\s\S]*P16 remains mandatory for Production/,
  );
});

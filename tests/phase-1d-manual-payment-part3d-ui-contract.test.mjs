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

test("Part 3D defines every recommended UI decision without implementing UI", () => {
  for (let index = 1; index <= 24; index += 1) {
    assert.match(
      contract,
      new RegExp(`\\| MU${String(index).padStart(2, "0")} \\|`),
    );
  }
  assert.match(contract, /MU01-MU24 OWNER DECISIONS REQUIRED/);
  assert.match(contract, /Runtime \/ UI Implementation:\*\* Not authorized and not created/);
  assert.match(contract, /This review creates no route, component, read RPC, migration/);
});

test("Part 3D requires a customer-owned read boundary before rendering", () => {
  assert.match(contract, /No existing guarded customer-owned read function/);
  assert.match(contract, /Required Guarded Read Contract Before UI/);
  assert.match(contract, /resolve `auth\.uid\(\)`, active profile, membership and customer link/);
  assert.match(contract, /return the MU04 field allowlist and no bank reference/);
  assert.match(contract, /forward-only migration[\s\S]*not created or authorized/);
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

test("Part 3D status stops at Owner freeze before read or UI implementation", () => {
  assert.match(
    status,
    /PHASE 1D MANUAL PAYMENT PART 3D STOREFRONT SUBMISSION UI CONTRACT REVIEW COMPLETE: MU01-MU24/,
  );
  assert.match(
    status,
    /CURRENT SUBSTEP: PHASE 1D MANUAL PAYMENT PART 3D CONTRACT REVIEW COMPLETE \/ OWNER DECISION FREEZE REQUIRED \/ NO READ MIGRATION OR UI IMPLEMENTED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: OWNER DECISION FREEZE FOR PHASE 1D MANUAL PAYMENT PART 3D MU01-MU24/,
  );
  assert.match(
    status,
    /BLOCKED: Part 3D-A guarded customer order payment snapshot and Part 3D-B\/3D-C UI delivery[\s\S]*P16 remains mandatory for Production/,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const review = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1C_STOREFRONT_VISIBILITY_READ_MODEL_CONTRACT_REVIEW.md",
  "utf8",
);
const freeze = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1C_STOREFRONT_OWNER_DECISION_FREEZE.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1C review records the frozen decisions and validated Part 3 boundary", () => {
  assert.match(
    review,
    /\*\*Status:\*\* OWNER APPROVED \/ PART 3 IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    review,
    /\*\*Migration:\*\* Additive Part 3 migration; local only, production not applied/,
  );
  for (let id = 1; id <= 18; id += 1) {
    assert.match(review, new RegExp(`\\| D${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(review, /Part 0 \| Repository and dependency audit \| COMPLETE/);
  assert.match(
    review,
    /Part 1 \| Owner Decision Freeze D01-D18 \| OWNER APPROVED \/ COMPLETE/,
  );
  assert.match(
    review,
    /Part 2 \| Storefront Business Rules and ER addendum \| OWNER APPROVED \/ COMPLETE/,
  );
  assert.match(
    review,
    /Part 3 \| Additive migration and guarded public read boundary \| IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(review, /Part 4 \| Read-only Storefront list\/detail UI \| READY/);
});

test("Phase 1C review reuses canonical sources and refuses invented service data", () => {
  assert.match(review, /`public\.organizations`/);
  assert.match(review, /`public\.products`/);
  assert.match(review, /`public\.product_variants`/);
  assert.match(review, /`public\.inventory_balances`/);
  assert.match(review, /No canonical frozen source found/);
  assert.match(review, /do not create an inferred or duplicate source/);
  assert.match(review, /Product-only/);
});

test("Phase 1C public projection remains field-bounded and fail-closed", () => {
  assert.match(review, /never expose cost or protected pricing fields/);
  assert.match(review, /never expose warehouse rows or exact quantities/);
  assert.match(review, /no direct anonymous core-table access/);
  assert.match(review, /Direct `anon` grants on protected Commerce Core tables/);
  assert.match(review, /ad hoc\n+`service_role` bypasses are forbidden/);
  assert.match(review, /Default deny/);
  assert.match(review, /Preview is `noindex`/);
});

test("Phase 1C preserves deferred production and visual-system gates", () => {
  assert.match(review, /P16 signup and production mutations remain closed/);
  assert.match(review, /checkout, payment and private production data remain/);
  assert.match(review, /proposed document in `docs\/design\/` is not Owner-frozen/);
  assert.match(review, /Keep current blue tokens, Noto Sans Thai, Thai\/English and light\/dark/);
});

test("Owner freeze approves D01-D18 while preserving closed runtime boundaries", () => {
  assert.match(freeze, /\*\*Status:\*\* OWNER APPROVED \/ D01-D18 FROZEN/);
  for (let id = 1; id <= 18; id += 1) {
    assert.match(freeze, new RegExp(`\\| D${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(freeze, /public Storefront runtime: NOT AUTHORIZED/);
  assert.match(freeze, /database migration: NOT AUTHORIZED/);
  assert.match(freeze, /production launch: BLOCKED BY P16/);
  assert.match(freeze, /ACOS_PLATFORM_SIGNUP_ENABLED` remains false/);
  assert.match(freeze, /ACOS_PLATFORM_SIGNUP_KILL_SWITCH` remains true/);
});

test("Owner freeze keeps the proposed brand guide separate from the Phase 1C baseline", () => {
  assert.match(freeze, /D15 freezes the currently implemented blue visual baseline/);
  assert.match(freeze, /does not approve or reject the proposed Dark Purple\/Wisteria\/Sunglow palette/);
  assert.match(freeze, /remains `PROPOSED FOR OWNER REVIEW`/);
});

test("implementation status completes Part 3 and advances to gated Part 4", () => {
  assert.match(
    status,
    /Phase 1C Storefront Visibility and Read-Model Contract Review .* OWNER APPROVED \/ PART 3 IMPLEMENTED \/ PART 4 READY/,
  );
  assert.match(
    status,
    /PHASE 1C PART 0 REPOSITORY AND DEPENDENCY AUDIT COMPLETE/,
  );
  assert.match(
    status,
    /PHASE 1C PART 1 OWNER DECISION FREEZE COMPLETE: D01-D18 approved in full/,
  );
  assert.match(
    status,
    /PHASE 1C PART 2 OWNER FREEZE COMPLETE/,
  );
  assert.match(
    status,
    /PHASE 1C PART 3 DATABASE BOUNDARY IMPLEMENTED \/ LOCAL VALIDATED/,
  );
  assert.match(
    status,
    /NEXT SUBSTEP: PHASE 1C PART 4 READ-ONLY STOREFRONT LIST AND DETAIL UI/,
  );
});

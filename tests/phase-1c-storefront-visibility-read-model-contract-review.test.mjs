import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const review = readFileSync(
  "docs/api-contracts/ACOS_PHASE_1C_STOREFRONT_VISIBILITY_READ_MODEL_CONTRACT_REVIEW.md",
  "utf8",
);
const status = readFileSync(
  "docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  "utf8",
);

test("Phase 1C review records all recommended Owner decisions without authorizing implementation", () => {
  assert.match(
    review,
    /\*\*Status:\*\* IN REVIEW \/ BLOCKED \/ OWNER DECISIONS REQUIRED/,
  );
  assert.match(review, /\*\*Migration:\*\* None/);
  for (let id = 1; id <= 18; id += 1) {
    assert.match(review, new RegExp(`\\| D${String(id).padStart(2, "0")} \\|`));
  }
  assert.match(review, /Part 0 \| Repository and dependency audit \| COMPLETE/);
  assert.match(
    review,
    /Part 1 \| Owner Decision Freeze D01-D18 \| BLOCKED \/ OWNER APPROVAL REQUIRED/,
  );
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

test("implementation status blocks Phase 1C at the Owner decision gate", () => {
  assert.match(
    status,
    /Phase 1C Storefront Visibility and Read-Model Contract Review .* IN REVIEW \/ BLOCKED \/ OWNER DECISIONS REQUIRED/,
  );
  assert.match(
    status,
    /PHASE 1C PART 0 REPOSITORY AND DEPENDENCY AUDIT COMPLETE/,
  );
  assert.match(
    status,
    /BLOCKED: Phase 1C implementation requires Owner Decision Freeze D01-D18/,
  );
  assert.match(status, /NEXT SUBSTEP: PHASE 1C OWNER DECISION FREEZE D01-D18/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const statusPath = new URL(
  "../docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md",
  import.meta.url,
);
const reconciliationPath = new URL(
  "../docs/roadmap/ACOS_CUSTOMER_COMMUNITY_COMMERCE_STATUS_RECONCILIATION_2026-07-29.md",
  import.meta.url,
);

test("Customer Community Commerce status preserves evidence and dependency order", async () => {
  const [status, reconciliation] = await Promise.all([
    readFile(statusPath, "utf8"),
    readFile(reconciliationPath, "utf8"),
  ]);

  assert.match(
    status,
    /\| PORTAL-004 \| Coupons \/ points page \| IMPLEMENTED \/ READ-ONLY \|/,
  );
  assert.match(
    status,
    /\| PORTAL-005 \| Notification preference page \| IMPLEMENTED \/ VALIDATED \|/,
  );
  assert.match(
    status,
    /\| PORTAL-006 \| Order history page \| IMPLEMENTED \/ READ-ONLY \|/,
  );
  assert.match(
    status,
    /\| CONSENT-006 \| Preference page \| IMPLEMENTED \/ VALIDATED \|/,
  );
  assert.match(reconciliation, /Phase 1 - Customer Portal MVP \| IN_PROGRESS/);
  assert.match(reconciliation, /Phase 1D - Checkout And Payment \| BLOCKED/);
  assert.match(reconciliation, /Phase 1E - Finance And Tax \| BLOCKED/);
  assert.ok(
    reconciliation.indexOf("-> Checkout and payment bridge") <
      reconciliation.indexOf("-> Finance and Tax foundation"),
    "Finance and Tax must remain after Checkout and Payment",
  );
  assert.match(reconciliation, /Owner freeze for CRM contact synchronization/);
});

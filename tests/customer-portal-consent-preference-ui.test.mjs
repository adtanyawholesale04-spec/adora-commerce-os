import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Portal consent preference UI stays behind the guarded server boundary", async () => {
  const [manager, actions, page, status, contract] = await Promise.all([
    read("src/app/portal/consent-preference-manager.tsx"),
    read("src/app/portal/actions.ts"),
    read("src/app/portal/page.tsx"),
    read("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md"),
    read("docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_CONSENT_PREFERENCE_UI.md")
  ]);

  assert.match(manager, /updatePortalConsentAction/);
  assert.doesNotMatch(manager, /createSupabase|\.rpc\(/);
  assert.match(manager, /type="checkbox"/);
  assert.match(manager, /maskDestination/);
  assert.match(actions, /api_update_customer_portal_consent/);
  assert.match(actions, /p_client_request_id: crypto\.randomUUID\(\)/);
  assert.match(actions, /consentChannels\.has\(channel\)/);
  assert.match(actions, /consentPurposes\.has\(purpose\)/);
  assert.match(page, /ConsentPreferenceManager/);
  assert.match(status, /\| CONSENT-006 \| Preference page \| IMPLEMENTED \/ VALIDATED \|/);
  assert.match(status, /\| PORTAL-005 \| Notification preference page \| IMPLEMENTED \/ VALIDATED \|/);
  assert.match(contract, /No browser-side Supabase write/);
  assert.match(contract, /No message dispatch or usage reservation/);
});

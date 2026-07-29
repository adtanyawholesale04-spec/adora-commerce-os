import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Portal notification inbox remains server-read-only and ownership scoped", async () => {
  const [readModel, page, contract, status] = await Promise.all([
    read("src/lib/portal/customer.ts"),
    read("src/app/portal/page.tsx"),
    read("docs/api-contracts/ACOS_TRACK_B_CUSTOMER_PORTAL_NOTIFICATION_INBOX_UI.md"),
    read("docs/roadmap/ACOS_IMPLEMENTATION_STATUS.md")
  ]);

  assert.match(readModel, /api_get_customer_portal_notifications/);
  assert.match(readModel, /Promise\.all/);
  assert.match(readModel, /notificationsError/);
  assert.doesNotMatch(page, /\.rpc\(|createSupabase/);
  assert.match(page, /NotificationInbox/);
  assert.match(page, /recipient_status === "UNREAD"/);
  assert.match(page, /Intl\.DateTimeFormat/);
  assert.match(contract, /No mark-as-read mutation/);
  assert.match(contract, /Reuses canonical `notifications` and `notification_recipients`/);
  assert.match(status, /\| PORTAL-005 \| Notification preference page \| IMPLEMENTED \/ VALIDATED \|/);
});

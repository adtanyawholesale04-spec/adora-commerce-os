import { spawn, spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const rootUrl = "http://127.0.0.1:54321/functions/v1/carrier-webhook";
const envFile = ".tmp-carrier-webhook-e2e.env";
const dockerBin = process.env.DOCKER_BIN ??
  "C:\\Users\\Tanya\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe";
const supabaseCli = process.platform === "win32"
  ? {
    command: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
    argsPrefix: ["/d", "/s", "/c", "npx.cmd"],
  }
  : {
    command: "npx",
    argsPrefix: [],
  };
const webhookSecret = "local-e2e-secret";

const cases = [
  {
    provider: "flash",
    fixture: "supabase/functions/carrier-webhook/fixtures/flash-picked-up.json",
    shipmentId: "19191919-1919-1919-1919-1919191919c1",
    trackingNumber: "FLASH123456789TH",
    expectedShipmentStatus: "IN_TRANSIT",
    expectedFulfillmentStatus: "SHIPPED",
  },
  {
    provider: "kerry",
    fixture: "supabase/functions/carrier-webhook/fixtures/kerry-delivered.json",
    shipmentId: "19191919-1919-1919-1919-1919191919c2",
    trackingNumber: "KERRY123456789TH",
    expectedShipmentStatus: "DELIVERED",
    expectedFulfillmentStatus: "COMPLETED",
  },
  {
    provider: "jandt",
    fixture: "supabase/functions/carrier-webhook/fixtures/jandt-exception.json",
    shipmentId: "19191919-1919-1919-1919-1919191919c3",
    trackingNumber: "JNT123456789TH",
    expectedShipmentStatus: "EXCEPTION",
    expectedFulfillmentStatus: "SHIPPED",
  },
  {
    provider: "thailand_post",
    fixture: "supabase/functions/carrier-webhook/fixtures/thailand-post-returned.json",
    shipmentId: "19191919-1919-1919-1919-1919191919c4",
    trackingNumber: "THP123456789TH",
    expectedShipmentStatus: "RTO",
    expectedFulfillmentStatus: "SHIPPED",
  },
];

const seedSql = String.raw`
delete from public.carrier_webhook_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.tracking_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.fulfillment_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.shipments where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.shipping_providers where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.fulfillment_items where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.fulfillments where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.warehouses where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.order_items where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.orders where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.product_variants where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.products where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.customers where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.organizations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';

insert into public.organizations (id, name, slug, status)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'Carrier E2E Org', 'carrier-e2e-org', 'ACTIVE');

insert into public.customers (id, organization_id, customer_code, display_name, status)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeec1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-CUST', 'Carrier E2E Customer', 'ACTIVE');

insert into public.products (id, organization_id, product_code, name, status)
values ('11111111-1111-1111-1111-1111111111c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-PROD', 'Carrier E2E Product', 'ACTIVE');

insert into public.product_variants (id, organization_id, product_id, stock_code, variant_name, base_price, cost_price, status)
values ('22222222-2222-2222-2222-2222222222c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-1111111111c1', 'CARRIER-E2E-SKU', 'Carrier E2E SKU', 100, 60, 'ACTIVE');

insert into public.orders (id, organization_id, customer_id, order_number, source, order_status)
values ('99999999-9999-9999-9999-9999999999c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeec1', 'CARRIER-E2E-ORDER', 'TEST', 'DRAFT');

insert into public.order_items (
  id, organization_id, order_id, variant_id, sku_snapshot, product_name_snapshot,
  variant_name_snapshot, quantity, original_unit_price, applied_unit_price, line_total
) values (
  '66666666-6666-6666-6666-6666666666c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '99999999-9999-9999-9999-9999999999c1', '22222222-2222-2222-2222-2222222222c1',
  'CARRIER-E2E-SKU', 'Carrier E2E Product', 'Carrier E2E SKU', 4, 100, 100, 400
);

insert into public.warehouses (id, organization_id, code, name, status)
values ('88888888-8888-8888-8888-8888888888c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-WH', 'Carrier E2E Warehouse', 'ACTIVE');

insert into public.shipping_providers (id, organization_id, provider_code, name, status)
values
  ('18181818-1818-1818-1818-1818181818c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'flash', 'Flash', 'ACTIVE'),
  ('18181818-1818-1818-1818-1818181818c2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'kerry', 'Kerry', 'ACTIVE'),
  ('18181818-1818-1818-1818-1818181818c3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'jandt', 'J&T', 'ACTIVE'),
  ('18181818-1818-1818-1818-1818181818c4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'thailand_post', 'Thailand Post', 'ACTIVE');

insert into public.fulfillments (id, organization_id, fulfillment_number, warehouse_id, status)
values
  ('16161616-1616-1616-1616-1616161616c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-FLASH', '88888888-8888-8888-8888-8888888888c1', 'READY_TO_SHIP'),
  ('16161616-1616-1616-1616-1616161616c2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-KERRY', '88888888-8888-8888-8888-8888888888c1', 'READY_TO_SHIP'),
  ('16161616-1616-1616-1616-1616161616c3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-JANDT', '88888888-8888-8888-8888-8888888888c1', 'READY_TO_SHIP'),
  ('16161616-1616-1616-1616-1616161616c4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'CARRIER-E2E-THPOST', '88888888-8888-8888-8888-8888888888c1', 'READY_TO_SHIP');

insert into public.fulfillment_items (id, organization_id, fulfillment_id, order_id, order_item_id, variant_id, quantity)
values
  ('17171717-1717-1717-1717-1717171717c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c1', '99999999-9999-9999-9999-9999999999c1', '66666666-6666-6666-6666-6666666666c1', '22222222-2222-2222-2222-2222222222c1', 1),
  ('17171717-1717-1717-1717-1717171717c2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c2', '99999999-9999-9999-9999-9999999999c1', '66666666-6666-6666-6666-6666666666c1', '22222222-2222-2222-2222-2222222222c1', 1),
  ('17171717-1717-1717-1717-1717171717c3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c3', '99999999-9999-9999-9999-9999999999c1', '66666666-6666-6666-6666-6666666666c1', '22222222-2222-2222-2222-2222222222c1', 1),
  ('17171717-1717-1717-1717-1717171717c4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c4', '99999999-9999-9999-9999-9999999999c1', '66666666-6666-6666-6666-6666666666c1', '22222222-2222-2222-2222-2222222222c1', 1);

insert into public.shipments (
  id, organization_id, fulfillment_id, shipping_provider_id, shipment_number,
  tracking_number, status, label_storage_path
) values
  ('19191919-1919-1919-1919-1919191919c1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c1', '18181818-1818-1818-1818-1818181818c1', 'CARRIER-E2E-SHIP-FLASH', 'FLASH123456789TH', 'READY_FOR_HANDOFF', 'labels/CARRIER-E2E-SHIP-FLASH.pdf'),
  ('19191919-1919-1919-1919-1919191919c2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c2', '18181818-1818-1818-1818-1818181818c2', 'CARRIER-E2E-SHIP-KERRY', 'KERRY123456789TH', 'READY_FOR_HANDOFF', 'labels/CARRIER-E2E-SHIP-KERRY.pdf'),
  ('19191919-1919-1919-1919-1919191919c3', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c3', '18181818-1818-1818-1818-1818181818c3', 'CARRIER-E2E-SHIP-JANDT', 'JNT123456789TH', 'READY_FOR_HANDOFF', 'labels/CARRIER-E2E-SHIP-JANDT.pdf'),
  ('19191919-1919-1919-1919-1919191919c4', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '16161616-1616-1616-1616-1616161616c4', '18181818-1818-1818-1818-1818181818c4', 'CARRIER-E2E-SHIP-THPOST', 'THP123456789TH', 'READY_FOR_HANDOFF', 'labels/CARRIER-E2E-SHIP-THPOST.pdf');
`;

const cleanupSql = String.raw`
delete from public.carrier_webhook_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.tracking_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.fulfillment_events where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.shipments where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.shipping_providers where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.fulfillment_items where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.fulfillments where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.warehouses where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.order_items where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.orders where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.product_variants where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.products where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.customers where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
delete from public.organizations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
`;

const assertSql = String.raw`
with expected(provider_code, tracking_number, shipment_status, fulfillment_status) as (
  values
    ('flash', 'FLASH123456789TH', 'IN_TRANSIT', 'SHIPPED'),
    ('kerry', 'KERRY123456789TH', 'DELIVERED', 'COMPLETED'),
    ('jandt', 'JNT123456789TH', 'EXCEPTION', 'SHIPPED'),
    ('thailand_post', 'THP123456789TH', 'RTO', 'SHIPPED')
),
actual as (
  select sp.provider_code,
         s.tracking_number,
         s.status as shipment_status,
         f.status as fulfillment_status,
         count(te.id) as tracking_events,
         count(cwe.id) as webhook_events
  from expected e
  join public.shipping_providers sp
    on sp.organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
   and sp.provider_code = e.provider_code
  join public.shipments s
    on s.organization_id = sp.organization_id
   and s.shipping_provider_id = sp.id
   and s.tracking_number = e.tracking_number
  join public.fulfillments f
    on f.organization_id = s.organization_id
   and f.id = s.fulfillment_id
  left join public.tracking_events te
    on te.organization_id = s.organization_id
   and te.shipment_id = s.id
  left join public.carrier_webhook_events cwe
    on cwe.organization_id = s.organization_id
   and cwe.shipment_id = s.id
   and cwe.processing_status = 'PROCESSED'
  group by sp.provider_code, s.tracking_number, s.status, f.status
)
select e.provider_code,
       e.shipment_status = a.shipment_status as shipment_status_ok,
       e.fulfillment_status = a.fulfillment_status as fulfillment_status_ok,
       a.tracking_events,
       a.webhook_events
from expected e
join actual a on a.provider_code = e.provider_code
where e.shipment_status <> a.shipment_status
   or e.fulfillment_status <> a.fulfillment_status
   or a.tracking_events <> 1
   or a.webhook_events <> 1;
`;

let server;
let seeded = false;

try {
  assertDockerAvailable();

  console.log("Seeding carrier webhook e2e fixtures...");
  runPsql(seedSql);
  seeded = true;
  assertSeededShipments();
  await writeFile(envFile, buildFunctionEnvFile(), "utf8");

  server = startFunctionServer();
  await waitForFunctionServer();

  for (const testCase of cases) {
    await sendFixture(testCase);
    await sendDuplicateFixture(testCase);
  }

  const mismatches = runPsql(assertSql).trim();

  if (mismatches) {
    throw new Error(`Carrier webhook e2e mismatches:\n${mismatches}`);
  }

  console.log("carrier_webhook_e2e pass");
} finally {
  stopFunctionServer(server);

  await rm(envFile, { force: true });

  if (seeded) {
    console.log("Cleaning carrier webhook e2e fixtures...");

    try {
      runPsql(cleanupSql);
    } catch (error) {
      console.error(`Carrier webhook e2e cleanup failed: ${error.message}`);
    }
  }
}

function assertDockerAvailable() {
  const result = spawnSync(dockerBin, ["version"], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      `Docker is not available. Start Docker Desktop and retry.\n${result.stderr || result.stdout}`,
    );
  }
}

function buildFunctionEnvFile() {
  const status = spawnSync(
    supabaseCli.command,
    [...supabaseCli.argsPrefix, "supabase", "status", "-o", "env"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${process.env.LOCALAPPDATA ?? "C:\\Users\\Tanya\\AppData\\Local"}\\Programs\\DockerDesktop\\resources\\bin;${process.env.PATH}`,
      },
    },
  );

  if (status.status !== 0) {
    throw new Error(status.stderr || status.stdout || "supabase status failed");
  }

  const values = Object.fromEntries(
    status.stdout
      .split(/\r?\n/)
      .map((line) => line.match(/^([^=]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]]),
  );

  if (!values.API_URL || !values.SERVICE_ROLE_KEY) {
    throw new Error("Supabase local API_URL or SERVICE_ROLE_KEY was not found");
  }

  return [
    `CARRIER_WEBHOOK_SECRET=${webhookSecret}`,
    `CARRIER_WEBHOOK_SUPABASE_URL=${containerReachableUrl(values.API_URL)}`,
    `CARRIER_WEBHOOK_SERVICE_ROLE_KEY=${values.SERVICE_ROLE_KEY}`,
    "",
  ].join("\n");
}

function containerReachableUrl(value) {
  return value
    .replace("127.0.0.1", "host.docker.internal")
    .replace("localhost", "host.docker.internal");
}

function assertSeededShipments() {
  const count = runPsql(String.raw`
select count(*)
from public.shipments
where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
  and tracking_number in (
    'FLASH123456789TH',
    'KERRY123456789TH',
    'JNT123456789TH',
    'THP123456789TH'
  );
`).trim();

  if (count !== "4") {
    throw new Error(`Expected 4 seeded carrier shipments, got ${count || "0"}`);
  }
}

function runPsql(sql) {
  const result = spawnSync(
    dockerBin,
    ["exec", "-i", "supabase_db_adora_commerce_os", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A"],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }

  return result.stdout;
}

function startFunctionServer() {
  const child = spawn(
    supabaseCli.command,
    [
      ...supabaseCli.argsPrefix,
      "supabase",
      "functions",
      "serve",
      "carrier-webhook",
      "--no-verify-jwt",
      "--env-file",
      envFile,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PATH: `${process.env.LOCALAPPDATA ?? "C:\\Users\\Tanya\\AppData\\Local"}\\Programs\\DockerDesktop\\resources\\bin;${process.env.PATH}`,
      },
    },
  );

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (data) => process.stdout.write(data));
  child.stderr.on("data", (data) => process.stderr.write(data));

  return child;
}

function stopFunctionServer(child) {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], {
      encoding: "utf8",
    });
    return;
  }

  child.kill();
}

async function waitForFunctionServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(`${rootUrl}?provider=flash`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-carrier-provider": "flash",
          "x-carrier-signature": "sha256=not-a-valid-signature",
        },
        body: "{}",
      });

      if (response.status === 401) {
        return;
      }
    } catch {
      // The local gateway can be briefly unavailable while the worker reloads.
    }

    await delay(500);
  }

  throw new Error("carrier-webhook function server did not load the E2E provider secret");
}

async function sendFixture(testCase) {
  const body = await fixtureBody(testCase);
  const response = await fetch(`${rootUrl}?provider=${encodeURIComponent(testCase.provider)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-carrier-signature": `sha256=${hmac(body)}`,
      "x-carrier-provider": testCase.provider,
      "x-organization-id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    },
    body,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${testCase.provider} webhook failed: HTTP ${response.status} ${text}\n${latestWebhookError(testCase)}`,
    );
  }

  const json = JSON.parse(text);

  if (json.duplicate !== false || !json.tracking_event_id) {
    throw new Error(`${testCase.provider} webhook returned unexpected payload: ${text}`);
  }

  console.log(`${testCase.provider} webhook accepted`);
}

async function sendDuplicateFixture(testCase) {
  const body = await fixtureBody(testCase);
  const response = await fetch(`${rootUrl}?provider=${encodeURIComponent(testCase.provider)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-carrier-signature": `sha256=${hmac(body)}`,
      "x-carrier-provider": testCase.provider,
      "x-organization-id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    },
    body,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${testCase.provider} duplicate webhook failed: HTTP ${response.status} ${text}`);
  }

  const json = JSON.parse(text);

  if (json.duplicate !== true) {
    throw new Error(`${testCase.provider} duplicate returned unexpected payload: ${text}`);
  }

  console.log(`${testCase.provider} duplicate ignored`);
}

function hmac(body) {
  return createHmac("sha256", webhookSecret).update(body).digest("hex");
}

function latestWebhookError(testCase) {
  return runPsql(String.raw`
select coalesce(error_message, processing_status, 'no webhook row')
from public.carrier_webhook_events
where organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
  and provider_code = '${testCase.provider}'
order by received_at desc
limit 1;
`).trim();
}

async function fixtureBody(testCase) {
  const fixture = JSON.parse(await readFile(testCase.fixture, "utf8"));

  return Buffer.from(JSON.stringify({
    ...fixture,
    shipment_id: testCase.shipmentId,
  }));
}

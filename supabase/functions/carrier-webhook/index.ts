import "@supabase/functions-js/edge-runtime.d.ts";

type JsonObject = Record<string, unknown>;

type NormalizedCarrierEvent = {
  organizationId: string;
  shipmentId?: string;
  trackingNumber?: string;
  providerCode: string;
  idempotencyKey: string;
  externalEventId?: string;
  eventCode: string;
  eventDescription: string;
  eventAt: string;
  shipmentStatus?: "IN_TRANSIT" | "DELIVERED" | "EXCEPTION" | "RTO" | "CANCELLED";
};

const textEncoder = new TextEncoder();
const jsonHeaders = { "content-type": "application/json" };

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const body = await req.text();
    const providerCode = resolveProviderCode(req, body);
    const signature = req.headers.get("x-carrier-signature") ??
      req.headers.get("x-webhook-signature") ??
      req.headers.get("x-signature");

    if (!providerCode) {
      return jsonResponse({ error: "missing_provider" }, 400);
    }

    const secret = getProviderSecret(providerCode);

    if (!secret) {
      return jsonResponse({ error: "provider_not_configured" }, 500);
    }

    if (!signature || !(await verifyHmacSignature(body, signature, secret))) {
      return jsonResponse({ error: "bad_signature" }, 401);
    }

    let payload: JsonObject;

    try {
      payload = JSON.parse(body) as JsonObject;
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    const normalized = normalizeCarrierEvent(providerCode, payload, req);

    if (!normalized.organizationId) {
      return jsonResponse({ error: "missing_organization_id" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SECRET_KEY");

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "supabase_service_not_configured" }, 500);
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2.110.8");
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const payloadHash = await sha256Hex(body);
    const shipmentId = normalized.shipmentId ??
      await findShipmentIdByTrackingNumber(
        supabase,
        normalized.organizationId,
        normalized.trackingNumber,
      );

    if (!shipmentId) {
      return jsonResponse({ error: "missing_shipment_id" }, 400);
    }

    const { data: eventLog, error: insertError } = await supabase
      .from("carrier_webhook_events")
      .insert({
        organization_id: normalized.organizationId,
        provider_code: normalized.providerCode,
        idempotency_key: normalized.idempotencyKey,
        shipment_id: shipmentId,
        external_event_id: normalized.externalEventId ?? null,
        event_code: normalized.eventCode,
        mapped_shipment_status: normalized.shipmentStatus ?? null,
        payload_hash: payloadHash,
        signature_header: signature,
        raw_payload_json: payload,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ received: true, duplicate: true }, 200);
      }

      return jsonResponse({ error: "webhook_log_insert_failed" }, 500);
    }

    const { data: trackingEventId, error: rpcError } = await supabase.rpc(
      "api_record_carrier_tracking_event",
      {
        p_organization_id: normalized.organizationId,
        p_shipment_id: shipmentId,
        p_event_code: normalized.eventCode,
        p_event_description: normalized.eventDescription,
        p_event_at: normalized.eventAt,
        p_shipment_status: normalized.shipmentStatus ?? null,
        p_external_event_id: normalized.externalEventId ?? null,
        p_raw_payload_json: payload,
      },
    );

    if (rpcError) {
      await supabase
        .from("carrier_webhook_events")
        .update({
          processing_status: "FAILED",
          error_message: rpcError.message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventLog.id);

      return jsonResponse({ error: "tracking_update_failed" }, 422);
    }

    await supabase
      .from("carrier_webhook_events")
      .update({
        processing_status: "PROCESSED",
        tracking_event_id: trackingEventId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventLog.id);

    return jsonResponse({
      received: true,
      duplicate: false,
      tracking_event_id: trackingEventId,
    }, 200);
  },
};

function jsonResponse(body: JsonObject, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function resolveProviderCode(req: Request, body: string): string {
  const url = new URL(req.url);
  const provider = req.headers.get("x-carrier-provider") ??
    url.searchParams.get("provider");

  if (provider) {
    return normalizeKey(provider);
  }

  try {
    const payload = JSON.parse(body) as JsonObject;
    return normalizeKey(readString(payload, ["provider_code", "provider", "carrier"]) ?? "");
  } catch {
    return "";
  }
}

function getProviderSecret(providerCode: string): string | null {
  const secretsJson = Deno.env.get("CARRIER_WEBHOOK_SECRETS");

  if (secretsJson) {
    const secrets = JSON.parse(secretsJson) as Record<string, string>;
    return secrets[providerCode] ?? secrets[providerCode.toUpperCase()] ?? null;
  }

  return Deno.env.get(`CARRIER_WEBHOOK_SECRET_${providerCode.toUpperCase()}`) ??
    Deno.env.get("CARRIER_WEBHOOK_SECRET");
}

async function verifyHmacSignature(
  body: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacSha256Hex(secret, body);
  const provided = signatureHeader.trim().replace(/^sha256=/i, "");

  return timingSafeEqualHex(expected, provided);
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(body));

  return bytesToHex(new Uint8Array(signature));
}

async function sha256Hex(body: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", textEncoder.encode(body));

  return bytesToHex(new Uint8Array(hash));
}

function timingSafeEqualHex(expected: string, provided: string): boolean {
  if (!/^[0-9a-f]+$/i.test(provided) || expected.length !== provided.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ provided.toLowerCase().charCodeAt(i);
  }

  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeCarrierEvent(
  providerCode: string,
  payload: JsonObject,
  req: Request,
): NormalizedCarrierEvent {
  const normalizedProvider = normalizeKey(providerCode);
  const statusText = normalizeKey(
    readString(payload, [
      "shipment_status",
      "status",
      "status_code",
      "state",
      "logistics_status",
      "event_code",
    ]) ?? "",
  );
  const eventCode = readString(payload, ["event_code", "code", "status_code", "state"]) ??
    (statusText || "TRACKING_EVENT");

  return {
    organizationId: readString(payload, ["organization_id", "org_id"]) ??
      req.headers.get("x-organization-id") ??
      "",
    shipmentId: readString(payload, ["shipment_id"]),
    trackingNumber: readString(payload, [
      "tracking_number",
      "tracking_no",
      "awb",
      "awb_no",
      "waybill",
    ]),
    providerCode: normalizedProvider,
    idempotencyKey: req.headers.get("idempotency-key") ??
      req.headers.get("x-idempotency-key") ??
      readString(payload, ["idempotency_key", "event_id", "external_event_id", "tracking_event_id"]) ??
      `${normalizedProvider}:${eventCode}:${
        readString(payload, ["tracking_number", "tracking_no", "awb", "waybill"]) ?? "unknown"
      }:${readString(payload, ["event_at", "timestamp", "occurred_at"]) ?? ""}`,
    externalEventId: readString(payload, ["external_event_id", "event_id", "tracking_event_id"]),
    eventCode,
    eventDescription: readString(payload, [
      "event_description",
      "description",
      "status_description",
      "message",
      "remark",
    ]) ?? eventCode,
    eventAt: readString(payload, ["event_at", "timestamp", "occurred_at", "status_at"]) ??
      new Date().toISOString(),
    shipmentStatus: mapShipmentStatus(normalizedProvider, statusText),
  };
}

function mapShipmentStatus(
  providerCode: string,
  statusText: string,
): NormalizedCarrierEvent["shipmentStatus"] {
  const commonDelivered = ["DELIVERED", "DELIVERY_SUCCESS", "SUCCESS", "SIGNED", "RECEIVED"];
  const commonTransit = ["PICKED_UP", "PICKUP", "IN_TRANSIT", "TRANSIT", "SHIPPED", "ON_ROUTE"];
  const commonException = ["EXCEPTION", "FAILED", "DAMAGED", "LOST", "DELAYED", "HOLD"];
  const commonRto = ["RTO", "RETURN", "RETURNED", "RETURN_TO_SENDER"];
  const commonCancelled = ["CANCELLED", "CANCELED", "VOID"];

  const providerAliases: Record<string, Record<string, NormalizedCarrierEvent["shipmentStatus"]>> = {
    flash: {
      "1": "IN_TRANSIT",
      "2": "IN_TRANSIT",
      "3": "DELIVERED",
      "4": "EXCEPTION",
      "5": "RTO",
    },
    kerry: {
      POD: "DELIVERED",
      DEL: "DELIVERED",
      OFD: "IN_TRANSIT",
      RCV: "IN_TRANSIT",
      RTS: "RTO",
      EXC: "EXCEPTION",
    },
    jandt: {
      PICKUP: "IN_TRANSIT",
      SENDING: "IN_TRANSIT",
      SIGNED: "DELIVERED",
      PROBLEM: "EXCEPTION",
      RETURN: "RTO",
    },
    thailand_post: {
      DELIVERED: "DELIVERED",
      TRANSPORTING: "IN_TRANSIT",
      UNSUCCESSFUL: "EXCEPTION",
      RETURNED: "RTO",
    },
  };

  const providerMap = providerAliases[providerCode] ?? {};

  if (providerMap[statusText]) return providerMap[statusText];
  if (commonDelivered.includes(statusText)) return "DELIVERED";
  if (commonTransit.includes(statusText)) return "IN_TRANSIT";
  if (commonException.includes(statusText)) return "EXCEPTION";
  if (commonRto.includes(statusText)) return "RTO";
  if (commonCancelled.includes(statusText)) return "CANCELLED";

  return undefined;
}

async function findShipmentIdByTrackingNumber(
  supabase: {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<{ data: { id?: string } | null }>;
          };
        };
      };
    };
  },
  organizationId: string,
  trackingNumber?: string,
): Promise<string | undefined> {
  if (!trackingNumber) {
    return undefined;
  }

  const { data } = await supabase
    .from("shipments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("tracking_number", trackingNumber)
    .maybeSingle();

  return data?.id as string | undefined;
}

function readString(payload: JsonObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

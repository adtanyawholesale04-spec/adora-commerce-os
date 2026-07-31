import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAuthAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

type CanonicalOrder = {
  id: string;
  organizationId: string;
  customerId: string;
  currencyCode: string;
  grandTotal: string;
  createdAt: string;
};

export type OrderPlacedAttributionState = "recorded" | "retry_pending";

export async function recordOrderPlacedAttribution(
  organizationId: string,
  orderId: string,
): Promise<OrderPlacedAttributionState> {
  if (!isUuid(organizationId) || !isUuid(orderId)) return "retry_pending";

  try {
    const client = createSupabaseAuthAdminClient();
    const { data, error } = await client
      .from("orders")
      .select(
        "id,organization_id,customer_id,source,currency_code,grand_total,created_at",
      )
      .eq("organization_id", organizationId)
      .eq("id", orderId)
      .eq("source", "STOREFRONT")
      .maybeSingle();

    const order = error ? null : parseCanonicalOrder(data);
    if (!order) return "retry_pending";

    const { data: eventData, error: eventError } = await client.rpc(
      "api_record_attribution_event",
      {
        p_organization_id: order.organizationId,
        p_event_type: "ORDER_PLACED",
        p_client_request_id: deriveOrderPlacedRequestId(
          order.organizationId,
          order.id,
        ),
        p_customer_id: order.customerId,
        p_anonymous_id: null,
        p_content_post_id: null,
        p_marketing_campaign_id: null,
        p_campaign_run_id: null,
        p_message_job_id: null,
        p_order_id: order.id,
        p_attributed_revenue: null,
        p_attribution_model: null,
        p_occurred_at: order.createdAt,
        p_metadata: {
          source: "STOREFRONT",
          currency_code: order.currencyCode,
          grand_total: order.grandTotal,
        },
      },
    );

    return !eventError && parseAttributionResponse(eventData)
      ? "recorded"
      : "retry_pending";
  } catch {
    return "retry_pending";
  }
}

export async function reconcileOrderPlacedAttribution(
  limit = 25,
): Promise<{
  ok: boolean;
  attempted: number;
  recorded: number;
  retryPending: number;
}> {
  const boundedLimit = Number.isInteger(limit) && limit >= 1 && limit <= 100
    ? limit
    : 25;

  try {
    const client = createSupabaseAuthAdminClient();
    const { data: orders, error: orderError } = await client
      .from("orders")
      .select("id,organization_id")
      .eq("source", "STOREFRONT")
      .order("created_at", { ascending: true })
      .limit(boundedLimit * 4);

    if (orderError || !Array.isArray(orders) || orders.length === 0) {
      return orderError ? failedReconciliation() : completeReconciliation();
    }

    const candidates = orders
      .map(parseOrderIdentity)
      .filter(isPresent);
    if (candidates.length === 0) return failedReconciliation();

    const { data: existing, error: eventError } = await client
      .from("attribution_events")
      .select("organization_id,order_id")
      .eq("event_type", "ORDER_PLACED")
      .in("order_id", candidates.map((order) => order.orderId));
    if (eventError) return failedReconciliation();

    const existingKeys = new Set(
      (Array.isArray(existing) ? existing : [])
        .map(parseOrderIdentity)
        .filter(isPresent)
        .map(orderKey),
    );
    const missing = candidates
      .filter((order) => !existingKeys.has(orderKey(order)))
      .slice(0, boundedLimit);

    let recorded = 0;
    for (const order of missing) {
      if (
        (await recordOrderPlacedAttribution(
          order.organizationId,
          order.orderId,
        )) === "recorded"
      ) {
        recorded += 1;
      }
    }

    return {
      ok: true,
      attempted: missing.length,
      recorded,
      retryPending: missing.length - recorded,
    };
  } catch {
    return failedReconciliation();
  }
}

export function deriveOrderPlacedRequestId(
  organizationId: string,
  orderId: string,
) {
  if (!isUuid(organizationId) || !isUuid(orderId)) {
    throw new Error("Invalid canonical attribution identity.");
  }

  const namespace = Buffer.from(UUID_NAMESPACE_URL.replaceAll("-", ""), "hex");
  const name = Buffer.from(
    `urn:acos:attribution:order-placed:v1:${organizationId}:${orderId}`,
    "utf8",
  );
  const bytes = createHash("sha1")
    .update(Buffer.concat([namespace, name]))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseCanonicalOrder(value: unknown): CanonicalOrder | null {
  const row = asObject(value);
  if (!row || row.source !== "STOREFRONT") return null;

  const id = asUuid(row.id);
  const organizationId = asUuid(row.organization_id);
  const customerId = asUuid(row.customer_id);
  const currencyCode = asCurrency(row.currency_code);
  const grandTotal = asMoney(row.grand_total);
  const createdAt = asTimestamp(row.created_at);
  return id && organizationId && customerId && currencyCode && grandTotal && createdAt
    ? { id, organizationId, customerId, currencyCode, grandTotal, createdAt }
    : null;
}

function parseAttributionResponse(value: unknown) {
  const row = asObject(Array.isArray(value) ? value[0] : value);
  return Boolean(
    row && asUuid(row.event_id) && typeof row.idempotency_reused === "boolean",
  );
}

function parseOrderIdentity(value: unknown) {
  const row = asObject(value);
  if (!row) return null;
  const organizationId = asUuid(row.organization_id);
  const orderId = asUuid(row.order_id ?? row.id);
  return organizationId && orderId ? { organizationId, orderId } : null;
}

function completeReconciliation() {
  return { ok: true, attempted: 0, recorded: 0, retryPending: 0 };
}

function failedReconciliation() {
  return { ok: false, attempted: 0, recorded: 0, retryPending: 0 };
}

function orderKey(value: { organizationId: string; orderId: string }) {
  return `${value.organizationId}:${value.orderId}`;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asUuid(value: unknown) {
  return typeof value === "string" && isUuid(value) ? value : null;
}

function asCurrency(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;
}

function asMoney(value: unknown) {
  const text = typeof value === "number" ? value.toFixed(2) : String(value ?? "");
  return /^\d{1,12}\.\d{2}$/.test(text) ? text : null;
}

function asTimestamp(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

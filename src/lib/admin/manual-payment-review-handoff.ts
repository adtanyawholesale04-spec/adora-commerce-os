import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAuthAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_NAMESPACE_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";

type SecretClient = ReturnType<typeof createSupabaseAuthAdminClient>;

type HandoffDependencies = {
  createClient?: () => SecretClient;
};

export type ManualPaymentHandoffState = "recorded" | "retry_pending";

export function createManualPaymentReviewHandoffService(
  dependencies: HandoffDependencies = {},
) {
  const createClient =
    dependencies.createClient ?? createSupabaseAuthAdminClient;

  async function recordOrderPaid(
    organizationId: string,
    orderId: string,
  ): Promise<ManualPaymentHandoffState> {
    if (!isUuid(organizationId) || !isUuid(orderId)) return "retry_pending";

    try {
      const client = createClient();
      const { data, error } = await client
        .from("orders")
        .select(
          "id,organization_id,customer_id,source,order_status,payment_status,currency_code,grand_total,confirmed_at",
        )
        .eq("organization_id", organizationId)
        .eq("id", orderId)
        .eq("source", "STOREFRONT")
        .eq("order_status", "CONFIRMED")
        .eq("payment_status", "PAID")
        .maybeSingle();
      const order = error ? null : parsePaidOrder(data);
      if (!order) return "retry_pending";

      const { data: eventData, error: eventError } = await client.rpc(
        "api_record_attribution_event",
        {
          p_organization_id: order.organizationId,
          p_event_type: "ORDER_PAID",
          p_client_request_id: deriveOrderPaidRequestId(
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
          p_occurred_at: order.confirmedAt,
          p_metadata: {
            source: "STOREFRONT",
            currency_code: order.currencyCode,
            grand_total: order.grandTotal,
          },
        },
      );

      return !eventError && parseEventResponse(eventData)
        ? "recorded"
        : "retry_pending";
    } catch {
      return "retry_pending";
    }
  }

  async function recordPaymentFailed(
    organizationId: string,
    paymentTransactionId: string,
    reviewRequestId: string,
  ): Promise<ManualPaymentHandoffState> {
    if (
      !isUuid(organizationId) ||
      !isUuid(paymentTransactionId) ||
      !isUuid(reviewRequestId)
    ) {
      return "retry_pending";
    }

    try {
      const client = createClient();
      const { data, error } = await client.rpc(
        "api_record_storefront_payment_failed_event",
        {
          p_organization_id: organizationId,
          p_payment_transaction_id: paymentTransactionId,
          p_review_request_id: reviewRequestId,
        },
      );
      return !error && parseEventResponse(data)
        ? "recorded"
        : "retry_pending";
    } catch {
      return "retry_pending";
    }
  }

  return { recordOrderPaid, recordPaymentFailed };
}

export function deriveOrderPaidRequestId(
  organizationId: string,
  orderId: string,
) {
  if (!isUuid(organizationId) || !isUuid(orderId)) {
    throw new Error("Invalid canonical payment attribution identity.");
  }

  const namespace = Buffer.from(UUID_NAMESPACE_URL.replaceAll("-", ""), "hex");
  const name = Buffer.from(
    `urn:acos:attribution:order-paid:v1:${organizationId}:${orderId}`,
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

function parsePaidOrder(value: unknown) {
  const row = asObject(value);
  if (
    !row ||
    row.source !== "STOREFRONT" ||
    row.order_status !== "CONFIRMED" ||
    row.payment_status !== "PAID"
  ) {
    return null;
  }
  const id = asUuid(row.id);
  const organizationId = asUuid(row.organization_id);
  const customerId = asUuid(row.customer_id);
  const currencyCode = asCurrency(row.currency_code);
  const grandTotal = asMoney(row.grand_total);
  const confirmedAt = asTimestamp(row.confirmed_at);
  return id && organizationId && customerId && currencyCode && grandTotal && confirmedAt
    ? { id, organizationId, customerId, currencyCode, grandTotal, confirmedAt }
    : null;
}

function parseEventResponse(value: unknown) {
  const row = asObject(Array.isArray(value) ? value[0] : value);
  return Boolean(
    row &&
      Object.keys(row).length === 2 &&
      asUuid(row.event_id) &&
      typeof row.idempotency_reused === "boolean",
  );
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

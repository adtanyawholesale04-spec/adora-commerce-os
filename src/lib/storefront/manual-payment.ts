import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PAYMENT_REFERENCE_PATTERN = /^[A-Z0-9._/-]{6,100}$/;
const MONEY_PATTERN = /^(?:0|[1-9][0-9]*)\.[0-9]{2}$/;
const SNAPSHOT_KEYS = new Set(["available", "order", "pending_attempt"]);
const SNAPSHOT_ORDER_KEYS = new Set([
  "id",
  "order_number",
  "order_status",
  "payment_status",
  "fulfillment_status",
  "currency_code",
  "grand_total",
  "amount_due",
  "payment_due_at",
]);
const SNAPSHOT_PENDING_KEYS = new Set(["exists", "proof_status"]);
const SUCCESS_KEYS = new Set([
  "ok",
  "operation",
  "order_id",
  "payment_id",
  "payment_transaction_id",
  "payment_proof_id",
  "transaction_status",
  "proof_status",
  "evidence_type",
  "payment_due_at",
  "idempotency_reused",
]);

export type ManualPaymentSubmissionFailureCode =
  | "feature_disabled"
  | "auth_required"
  | "payment_reference_invalid"
  | "order_not_payable"
  | "payment_expired"
  | "payment_reference_conflict"
  | "payment_attempt_pending"
  | "request_conflict"
  | "persistence_error";

export type ManualPaymentSubmissionFailure = {
  ok: false;
  code: ManualPaymentSubmissionFailureCode;
  retryable: boolean;
};

export type ManualPaymentSubmissionSuccess = {
  ok: true;
  code: "payment_proof_submitted";
  orderId: string;
  paymentId: string;
  paymentTransactionId: string;
  paymentProofId: string;
  transactionStatus: "PENDING";
  proofStatus: "PENDING";
  evidenceType: "REFERENCE_ONLY";
  paymentDueAt: string;
  idempotencyReused: boolean;
};

export type ManualPaymentSubmissionResult =
  | ManualPaymentSubmissionFailure
  | ManualPaymentSubmissionSuccess;

export type ManualPaymentActionState =
  | ManualPaymentSubmissionResult
  | { ok: null; code: "idle"; retryable: false };

export type ManualPaymentSnapshot = {
  order: {
    id: string;
    orderNumber: string;
    orderStatus: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    currencyCode: string;
    grandTotal: string;
    amountDue: string;
    paymentDueAt: string | null;
  };
  pendingAttempt: {
    exists: boolean;
    proofStatus: "PENDING" | null;
  };
};

export type ManualPaymentPageModel =
  | {
      state: "ready";
      canonicalSlug: string;
      storeName: string;
      timezone: string;
      snapshot: ManualPaymentSnapshot;
      eligibility: "eligible" | "pending" | "expired" | "closed";
    }
  | {
      state:
        | "feature_disabled"
        | "auth_required"
        | "unavailable"
        | "configuration_error"
        | "query_error";
    };

type SessionClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ManualPaymentDependencies = {
  createClient?: () => Promise<SessionClient>;
  available?: () => boolean;
};

type ManualPaymentSnapshotDependencies = ManualPaymentDependencies & {
  now?: () => Date;
};

export function createManualPaymentSnapshotService(
  dependencies: ManualPaymentSnapshotDependencies = {},
) {
  const createClient = dependencies.createClient ?? createSupabaseServerClient;
  const available =
    dependencies.available ?? isStorefrontManualPaymentPageAvailable;
  const now = dependencies.now ?? (() => new Date());

  async function getPaymentPage(input: {
    organizationSlug: string;
    orderId: string;
  }): Promise<ManualPaymentPageModel> {
    if (!available()) return { state: "feature_disabled" };

    const organizationSlug = normalizeSlug(input.organizationSlug);
    if (!organizationSlug || !isUuid(input.orderId)) {
      return { state: "unavailable" };
    }

    try {
      const client = await createClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) return { state: "auth_required" };

      const { data: organizationData, error: organizationError } = await client
        .from("organizations")
        .select("id,slug,name,timezone,status")
        .eq("slug", organizationSlug)
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (organizationError) return { state: "query_error" };

      const organization = asObject(organizationData);
      const organizationId = organization ? asUuid(organization.id) : null;
      const canonicalSlug = organization
        ? asBoundedText(organization.slug, 120)
        : null;
      const storeName = organization
        ? asBoundedText(organization.name, 200)
        : null;
      const timezone = organization
        ? asBoundedText(organization.timezone, 80)
        : null;
      if (
        !organizationId ||
        canonicalSlug !== organizationSlug ||
        !storeName ||
        !timezone ||
        organization?.status !== "ACTIVE"
      ) {
        return { state: "unavailable" };
      }

      const { data, error } = await client.rpc(
        "api_get_storefront_order_payment_snapshot",
        {
          p_organization_id: organizationId,
          p_order_id: input.orderId,
        },
      );
      if (error) return mapSnapshotError(error.message);

      const snapshot = parseSnapshot(data);
      if (snapshot === "unavailable") return { state: "unavailable" };
      if (!snapshot) return { state: "query_error" };

      return {
        state: "ready",
        canonicalSlug,
        storeName,
        timezone,
        snapshot,
        eligibility: deriveEligibility(snapshot, now()),
      };
    } catch (error) {
      return {
        state:
          error instanceof Error &&
          error.message === "Missing Supabase public environment variables."
            ? "configuration_error"
            : "query_error",
      };
    }
  }

  return { getPaymentPage };
}

export function createManualPaymentSubmissionService(
  dependencies: ManualPaymentDependencies = {},
) {
  const createClient = dependencies.createClient ?? createSupabaseServerClient;
  const available =
    dependencies.available ?? isStorefrontManualPaymentAvailable;

  async function submitPaymentProof(input: {
    organizationSlug: string;
    orderId: string;
    paymentReference: string;
    requestId: string;
  }): Promise<ManualPaymentSubmissionResult> {
    if (!available()) return failure("feature_disabled");

    const organizationSlug = normalizeSlug(input.organizationSlug);
    const paymentReference = normalizePaymentReference(input.paymentReference);
    if (!organizationSlug) return failure("order_not_payable");
    if (!isUuid(input.orderId)) return failure("order_not_payable");
    if (!isUuid(input.requestId)) return failure("request_conflict");
    if (!paymentReference) return failure("payment_reference_invalid");

    try {
      const client = await createClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) return failure("auth_required");

      const { data: organizationData, error: organizationError } = await client
        .from("organizations")
        .select("id,slug,status")
        .eq("slug", organizationSlug)
        .eq("status", "ACTIVE")
        .maybeSingle();
      const organization = asObject(organizationData);
      const organizationId = organization ? asUuid(organization.id) : null;
      if (
        organizationError ||
        !organizationId ||
        organization?.slug !== organizationSlug ||
        organization?.status !== "ACTIVE"
      ) {
        return failure("order_not_payable");
      }

      const { data, error } = await client.rpc(
        "api_submit_storefront_payment_proof",
        {
          p_organization_id: organizationId,
          p_order_id: input.orderId,
          p_payment_reference: paymentReference,
          p_request_id: input.requestId,
        },
      );
      if (error) return mapRpcError(error.message);
      return parseSuccess(data) ?? failure("persistence_error");
    } catch {
      return failure("persistence_error");
    }
  }

  return { submitPaymentProof };
}

export function isStorefrontManualPaymentAvailable() {
  return (
    process.env.ACOS_STOREFRONT_MANUAL_PAYMENT_ENABLED === "true" &&
    process.env.ACOS_STOREFRONT_MANUAL_PAYMENT_KILL_SWITCH !== "true" &&
    process.env.ACOS_STOREFRONT_CHECKOUT_ENABLED === "true" &&
    process.env.ACOS_STOREFRONT_CHECKOUT_KILL_SWITCH !== "true"
  );
}

export function isStorefrontManualPaymentPageAvailable() {
  return isStorefrontManualPaymentAvailable();
}

function parseSnapshot(value: unknown): ManualPaymentSnapshot | "unavailable" | null {
  const row = asObject(value);
  if (!row) return null;
  if (hasExactKeys(row, new Set(["available"]))) {
    return row.available === false ? "unavailable" : null;
  }
  if (!hasExactKeys(row, SNAPSHOT_KEYS) || row.available !== true) return null;

  const order = asObject(row.order);
  const pending = asObject(row.pending_attempt);
  if (
    !order ||
    !pending ||
    !hasExactKeys(order, SNAPSHOT_ORDER_KEYS) ||
    !hasExactKeys(pending, SNAPSHOT_PENDING_KEYS)
  ) {
    return null;
  }

  const orderId = asUuid(order.id);
  const orderNumber = asBoundedText(order.order_number, 100);
  const orderStatus = asBoundedText(order.order_status, 40);
  const paymentStatus = asBoundedText(order.payment_status, 40);
  const fulfillmentStatus = asBoundedText(order.fulfillment_status, 40);
  const currencyCode = asCurrency(order.currency_code);
  const grandTotal = asMoney(order.grand_total);
  const amountDue = asMoney(order.amount_due);
  const paymentDueAt =
    order.payment_due_at === null ? null : asTimestamp(order.payment_due_at);
  if (
    !orderId ||
    !orderNumber ||
    !orderStatus ||
    !paymentStatus ||
    !fulfillmentStatus ||
    !currencyCode ||
    !grandTotal ||
    !amountDue ||
    (order.payment_due_at !== null && !paymentDueAt) ||
    typeof pending.exists !== "boolean" ||
    (pending.proof_status !== null && pending.proof_status !== "PENDING")
  ) {
    return null;
  }

  return {
    order: {
      id: orderId,
      orderNumber,
      orderStatus,
      paymentStatus,
      fulfillmentStatus,
      currencyCode,
      grandTotal,
      amountDue,
      paymentDueAt,
    },
    pendingAttempt: {
      exists: pending.exists,
      proofStatus: pending.proof_status,
    },
  };
}

function deriveEligibility(
  snapshot: ManualPaymentSnapshot,
  now: Date,
): "eligible" | "pending" | "expired" | "closed" {
  if (snapshot.pendingAttempt.exists) return "pending";
  const dueAt = snapshot.order.paymentDueAt
    ? new Date(snapshot.order.paymentDueAt)
    : null;
  if (!dueAt || dueAt.getTime() <= now.getTime()) return "expired";
  return snapshot.order.orderStatus === "PENDING_CONFIRMATION" &&
    snapshot.order.paymentStatus === "UNPAID" &&
    snapshot.order.fulfillmentStatus === "UNFULFILLED" &&
    Number(snapshot.order.amountDue) > 0 &&
    snapshot.order.amountDue === snapshot.order.grandTotal
    ? "eligible"
    : "closed";
}

function mapSnapshotError(message: string): ManualPaymentPageModel {
  if (message.includes("AUTH_REQUIRED")) return { state: "auth_required" };
  if (
    [
      "MEMBERSHIP_REQUIRED",
      "CUSTOMER_LINK_REQUIRED",
      "CHECKOUT_NOT_ENABLED",
    ].some((code) => message.includes(code))
  ) {
    return { state: "unavailable" };
  }
  return { state: "query_error" };
}

function parseSuccess(value: unknown): ManualPaymentSubmissionSuccess | null {
  const row = asObject(value);
  if (!row || !hasExactKeys(row, SUCCESS_KEYS)) return null;
  if (
    row.ok !== true ||
    row.operation !== "PAYMENT_PROOF_SUBMIT" ||
    row.transaction_status !== "PENDING" ||
    row.proof_status !== "PENDING" ||
    row.evidence_type !== "REFERENCE_ONLY" ||
    typeof row.idempotency_reused !== "boolean"
  ) {
    return null;
  }

  const orderId = asUuid(row.order_id);
  const paymentId = asUuid(row.payment_id);
  const paymentTransactionId = asUuid(row.payment_transaction_id);
  const paymentProofId = asUuid(row.payment_proof_id);
  const paymentDueAt = asTimestamp(row.payment_due_at);
  if (
    !orderId ||
    !paymentId ||
    !paymentTransactionId ||
    !paymentProofId ||
    !paymentDueAt
  ) {
    return null;
  }

  return {
    ok: true,
    code: "payment_proof_submitted",
    orderId,
    paymentId,
    paymentTransactionId,
    paymentProofId,
    transactionStatus: "PENDING",
    proofStatus: "PENDING",
    evidenceType: "REFERENCE_ONLY",
    paymentDueAt,
    idempotencyReused: row.idempotency_reused,
  };
}

function mapRpcError(message: string): ManualPaymentSubmissionFailure {
  const mappings: Array<
    [string, ManualPaymentSubmissionFailureCode]
  > = [
    ["AUTH_REQUIRED", "auth_required"],
    ["PAYMENT_REFERENCE_INVALID", "payment_reference_invalid"],
    ["PAYMENT_EXPIRED", "payment_expired"],
    ["PAYMENT_REFERENCE_CONFLICT", "payment_reference_conflict"],
    ["PAYMENT_ATTEMPT_PENDING", "payment_attempt_pending"],
    ["IDEMPOTENCY_CONFLICT", "request_conflict"],
    ["MEMBERSHIP_REQUIRED", "order_not_payable"],
    ["CUSTOMER_LINK_REQUIRED", "order_not_payable"],
    ["CHECKOUT_NOT_ENABLED", "order_not_payable"],
    ["ORDER_NOT_PAYABLE", "order_not_payable"],
    ["PAYMENT_STATE_INCONSISTENT", "order_not_payable"],
  ];
  const result = mappings.find(([candidate]) => message.includes(candidate));
  return failure(result?.[1] ?? "persistence_error");
}

function failure(
  code: ManualPaymentSubmissionFailureCode,
): ManualPaymentSubmissionFailure {
  return { ok: false, code, retryable: code === "persistence_error" };
}

function normalizeSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return SLUG_PATTERN.test(normalized) ? normalized : null;
}

function normalizePaymentReference(value: string) {
  const normalized = value.trim().toUpperCase();
  return PAYMENT_REFERENCE_PATTERN.test(normalized) ? normalized : null;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: ReadonlySet<string>,
) {
  const keys = Object.keys(value);
  return keys.length === expected.size && keys.every((key) => expected.has(key));
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asUuid(value: unknown) {
  return typeof value === "string" && isUuid(value) ? value : null;
}

function asTimestamp(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

function asBoundedText(value: unknown, maximumLength: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximumLength
    ? value
    : null;
}

function asCurrency(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;
}

function asMoney(value: unknown) {
  return typeof value === "string" && MONEY_PATTERN.test(value) ? value : null;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

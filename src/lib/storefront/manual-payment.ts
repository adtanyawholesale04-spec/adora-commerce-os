import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const PAYMENT_REFERENCE_PATTERN = /^[A-Z0-9._/-]{6,100}$/;
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

type SessionClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ManualPaymentDependencies = {
  createClient?: () => Promise<SessionClient>;
  available?: () => boolean;
};

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
    process.env.ACOS_STOREFRONT_MANUAL_PAYMENT_KILL_SWITCH !== "true"
  );
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

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

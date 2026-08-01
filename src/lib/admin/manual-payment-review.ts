import "server-only";

import {
  getAdminShellContext,
  type AdminShellContext,
} from "@/lib/admin/context";
import {
  createManualPaymentReviewHandoffService,
  type ManualPaymentHandoffState,
} from "@/lib/admin/manual-payment-review-handoff";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_REASON =
  /(https?:\/\/|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|[0-9]{8,}|password|passcode|secret|token|api[_ -]?key|otp)/i;
const QUEUE_KEYS = new Set(["items", "next_cursor"]);
const QUEUE_ITEM_KEYS = new Set([
  "payment_transaction_id",
  "payment_proof_id",
  "payment_id",
  "order_id",
  "amount",
  "currency_code",
  "submitted_at",
  "payment_due_at",
  "can_review",
]);
const CURSOR_KEYS = new Set(["submitted_at", "payment_transaction_id"]);
const DETAIL_KEYS = new Set([
  "available",
  "order_id",
  "payment_id",
  "payment_transaction_id",
  "payment_proof_id",
  "order_status",
  "order_payment_status",
  "payment_status",
  "transaction_status",
  "proof_status",
  "amount",
  "currency_code",
  "submitted_at",
  "payment_due_at",
  "payment_reference",
  "self_review",
  "review_eligible",
]);
const ACTION_KEYS = new Set([
  "operation",
  "order_id",
  "payment_id",
  "payment_transaction_id",
  "payment_proof_id",
  "transaction_status",
  "proof_status",
  "order_status",
  "order_payment_status",
  "payment_status",
  "reviewed_at",
  "allocation_count",
  "coupon_consumed",
  "idempotency_reused",
]);

export type ManualPaymentReviewFailureCode =
  | "feature_disabled"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "review_not_found"
  | "self_review_denied"
  | "reason_invalid"
  | "state_conflict"
  | "already_reviewed"
  | "payment_expired"
  | "hold_inconsistent"
  | "amount_inconsistent"
  | "allocation_inconsistent"
  | "coupon_inconsistent"
  | "idempotency_conflict"
  | "review_failed"
  | "unexpected_error";

export type ManualPaymentReviewFailure = {
  ok: false;
  code: ManualPaymentReviewFailureCode;
  retryable: boolean;
};

export type ManualPaymentReviewQueueItem = {
  paymentTransactionId: string;
  paymentProofId: string;
  paymentId: string;
  orderId: string;
  amount: string;
  currencyCode: string;
  submittedAt: string;
  paymentDueAt: string;
  canReview: boolean;
};

export type ManualPaymentReviewCursor = {
  submittedAt: string;
  paymentTransactionId: string;
};

export type ManualPaymentReviewQueueResult =
  | ManualPaymentReviewFailure
  | {
      ok: true;
      code: "review_queue_ready";
      items: ManualPaymentReviewQueueItem[];
      nextCursor: ManualPaymentReviewCursor | null;
    };

export type ManualPaymentReviewDetailResult =
  | ManualPaymentReviewFailure
  | {
      ok: true;
      code: "review_detail_ready";
      orderId: string;
      paymentId: string;
      paymentTransactionId: string;
      paymentProofId: string;
      orderStatus: string;
      orderPaymentStatus: string;
      paymentStatus: string;
      transactionStatus: "PENDING";
      proofStatus: "PENDING";
      amount: string;
      currencyCode: string;
      submittedAt: string;
      paymentDueAt: string;
      paymentReference: string;
      selfReview: boolean;
      reviewEligible: boolean;
    };

export type ManualPaymentReviewActionSuccess = {
  ok: true;
  code: "payment_verified" | "payment_rejected";
  operation: "PAYMENT_VERIFY" | "PAYMENT_REJECT";
  orderId: string;
  paymentId: string;
  paymentTransactionId: string;
  paymentProofId: string;
  transactionStatus: "SUCCEEDED" | "FAILED";
  proofStatus: "VERIFIED" | "REJECTED";
  orderStatus: "CONFIRMED" | "PENDING_CONFIRMATION";
  orderPaymentStatus: "PAID" | "UNPAID";
  paymentStatus: "PAID" | "UNPAID";
  reviewedAt: string;
  allocationCount: number;
  couponConsumed: boolean;
  idempotencyReused: boolean;
};

export type ManualPaymentReviewActionResult =
  | ManualPaymentReviewFailure
  | ManualPaymentReviewActionSuccess;

export type ManualPaymentReviewActionState =
  | ManualPaymentReviewActionResult
  | { ok: null; code: "idle"; retryable: false };

type SessionClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type ManualPaymentReviewDependencies = {
  createClient?: () => Promise<SessionClient>;
  getContext?: () => Promise<AdminShellContext>;
  available?: () => boolean;
  recordOrderPaid?: (
    organizationId: string,
    orderId: string,
  ) => Promise<ManualPaymentHandoffState>;
  recordPaymentFailed?: (
    organizationId: string,
    paymentTransactionId: string,
    requestId: string,
  ) => Promise<ManualPaymentHandoffState>;
};

export function createManualPaymentReviewService(
  dependencies: ManualPaymentReviewDependencies = {},
) {
  const createClient = dependencies.createClient ?? createSupabaseServerClient;
  const getContext = dependencies.getContext ?? getAdminShellContext;
  const available =
    dependencies.available ?? isAdminManualPaymentReviewAvailable;
  const handoff = createManualPaymentReviewHandoffService();
  const recordOrderPaid = dependencies.recordOrderPaid ?? handoff.recordOrderPaid;
  const recordPaymentFailed =
    dependencies.recordPaymentFailed ?? handoff.recordPaymentFailed;

  async function listReviews(input: {
    cursor?: ManualPaymentReviewCursor | null;
    limit?: number;
  } = {}): Promise<ManualPaymentReviewQueueResult> {
    const context = await createContext(["payment.view"]);
    if (!context.ok) return context;
    const cursor = normalizeCursor(input.cursor);
    if (input.cursor && !cursor) return failure("review_not_found");
    const limit = normalizeLimit(input.limit);

    try {
      const { data, error } = await context.client.rpc(
        "api_list_storefront_payment_reviews",
        {
          p_organization_id: context.organizationId,
          p_cursor_submitted_at: cursor?.submittedAt ?? null,
          p_cursor_transaction_id: cursor?.paymentTransactionId ?? null,
          p_limit: limit,
        },
      );
      if (error) return mapRpcError(error.message);
      return parseQueue(data) ?? failure("unexpected_error");
    } catch {
      return failure("unexpected_error");
    }
  }

  async function getReview(input: {
    paymentTransactionId: string;
  }): Promise<ManualPaymentReviewDetailResult> {
    if (!isUuid(input.paymentTransactionId)) return failure("review_not_found");
    const context = await createContext(["payment.view", "payment.verify"]);
    if (!context.ok) return context;

    try {
      const { data, error } = await context.client.rpc(
        "api_get_storefront_payment_review",
        {
          p_organization_id: context.organizationId,
          p_payment_transaction_id: input.paymentTransactionId,
        },
      );
      if (error) return mapRpcError(error.message);
      return parseDetail(data) ?? failure("review_not_found");
    } catch {
      return failure("unexpected_error");
    }
  }

  async function verifyReview(input: ReviewActionInput) {
    return runReviewAction("PAYMENT_VERIFY", input);
  }

  async function rejectReview(input: ReviewActionInput) {
    return runReviewAction("PAYMENT_REJECT", input);
  }

  async function runReviewAction(
    operation: "PAYMENT_VERIFY" | "PAYMENT_REJECT",
    input: ReviewActionInput,
  ): Promise<ManualPaymentReviewActionResult> {
    const normalized = normalizeActionInput(input);
    if (!normalized.ok) return normalized;
    const context = await createContext(["payment.verify"]);
    if (!context.ok) return context;

    try {
      const { data, error } = await context.client.rpc(
        operation === "PAYMENT_VERIFY"
          ? "api_verify_storefront_payment"
          : "api_reject_storefront_payment",
        {
          p_organization_id: context.organizationId,
          p_payment_transaction_id: normalized.paymentTransactionId,
          p_expected_status: "PENDING",
          p_reason: normalized.reason,
          p_request_id: normalized.requestId,
        },
      );
      if (error) return mapRpcError(error.message);
      const result = parseAction(data, operation);
      if (!result) return failure("unexpected_error");

      if (operation === "PAYMENT_VERIFY") {
        await safelyRunHandoff(() =>
          recordOrderPaid(context.organizationId, result.orderId),
        );
      } else {
        await safelyRunHandoff(() =>
          recordPaymentFailed(
            context.organizationId,
            result.paymentTransactionId,
            normalized.requestId,
          ),
        );
      }
      return result;
    } catch {
      return failure("unexpected_error");
    }
  }

  async function createContext(
    requiredPermissions: ReadonlyArray<"payment.view" | "payment.verify">,
  ): Promise<
    | ManualPaymentReviewFailure
    | { ok: true; organizationId: string; client: SessionClient }
  > {
    if (!available()) return failure("feature_disabled");

    try {
      const context = await getContext();
      if (context.mode === "missing_env") return failure("feature_disabled");
      if (context.mode === "anonymous") return failure("anonymous");
      if (
        !context.activeOrganizationId ||
        !context.profileId ||
        context.membershipStatus !== "ACTIVE" ||
        context.organizationStatus !== "ACTIVE"
      ) {
        return failure("missing_membership");
      }
      if (
        requiredPermissions.some(
          (permission) => !context.permissions.includes(permission),
        )
      ) {
        return failure("permission_denied");
      }
      return {
        ok: true,
        organizationId: context.activeOrganizationId,
        client: await createClient(),
      };
    } catch {
      return failure("unexpected_error");
    }
  }

  return { listReviews, getReview, verifyReview, rejectReview };
}

export function isAdminManualPaymentReviewAvailable() {
  return (
    process.env.ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_ENABLED === "true" &&
    process.env.ACOS_ADMIN_MANUAL_PAYMENT_REVIEW_KILL_SWITCH !== "true"
  );
}

type ReviewActionInput = {
  paymentTransactionId: string;
  expectedStatus: string;
  reason: string;
  requestId: string;
};

function normalizeActionInput(input: ReviewActionInput):
  | ManualPaymentReviewFailure
  | {
      ok: true;
      paymentTransactionId: string;
      reason: string;
      requestId: string;
    } {
  if (
    !isUuid(input.paymentTransactionId) ||
    !isUuid(input.requestId) ||
    input.expectedStatus !== "PENDING"
  ) {
    return failure("state_conflict");
  }
  const reason = input.reason.trim();
  if (
    reason.length < 8 ||
    reason.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(reason) ||
    FORBIDDEN_REASON.test(reason)
  ) {
    return failure("reason_invalid");
  }
  return {
    ok: true,
    paymentTransactionId: input.paymentTransactionId,
    reason,
    requestId: input.requestId,
  };
}

function parseQueue(value: unknown): ManualPaymentReviewQueueResult | null {
  const row = asObject(value);
  if (!row || !hasExactKeys(row, QUEUE_KEYS) || !Array.isArray(row.items)) {
    return null;
  }
  const items = row.items.map(parseQueueItem).filter(isPresent);
  if (items.length !== row.items.length) return null;
  const nextCursor = row.next_cursor === null ? null : parseCursor(row.next_cursor);
  if (row.next_cursor !== null && !nextCursor) return null;
  return { ok: true, code: "review_queue_ready", items, nextCursor };
}

function parseQueueItem(value: unknown): ManualPaymentReviewQueueItem | null {
  const row = asObject(value);
  if (!row || !hasExactKeys(row, QUEUE_ITEM_KEYS)) return null;
  const paymentTransactionId = asUuid(row.payment_transaction_id);
  const paymentProofId = asUuid(row.payment_proof_id);
  const paymentId = asUuid(row.payment_id);
  const orderId = asUuid(row.order_id);
  const amount = asMoney(row.amount);
  const currencyCode = asCurrency(row.currency_code);
  const submittedAt = asTimestamp(row.submitted_at);
  const paymentDueAt = asTimestamp(row.payment_due_at);
  return paymentTransactionId && paymentProofId && paymentId && orderId &&
    amount && currencyCode && submittedAt && paymentDueAt &&
    typeof row.can_review === "boolean"
    ? {
        paymentTransactionId,
        paymentProofId,
        paymentId,
        orderId,
        amount,
        currencyCode,
        submittedAt,
        paymentDueAt,
        canReview: row.can_review,
      }
    : null;
}

function parseDetail(value: unknown): ManualPaymentReviewDetailResult | null {
  const row = asObject(value);
  if (!row) return null;
  if (hasExactKeys(row, new Set(["available"])) && row.available === false) {
    return null;
  }
  if (!hasExactKeys(row, DETAIL_KEYS) || row.available !== true) return null;
  const orderId = asUuid(row.order_id);
  const paymentId = asUuid(row.payment_id);
  const paymentTransactionId = asUuid(row.payment_transaction_id);
  const paymentProofId = asUuid(row.payment_proof_id);
  const amount = asMoney(row.amount);
  const currencyCode = asCurrency(row.currency_code);
  const submittedAt = asTimestamp(row.submitted_at);
  const paymentDueAt = asTimestamp(row.payment_due_at);
  const paymentReference = asBoundedText(row.payment_reference, 100);
  const orderStatus = asBoundedText(row.order_status, 40);
  const orderPaymentStatus = asBoundedText(row.order_payment_status, 40);
  const paymentStatus = asBoundedText(row.payment_status, 40);
  if (
    !orderId || !paymentId || !paymentTransactionId || !paymentProofId ||
    !amount || !currencyCode || !submittedAt || !paymentDueAt ||
    !paymentReference || !orderStatus || !orderPaymentStatus || !paymentStatus ||
    row.transaction_status !== "PENDING" || row.proof_status !== "PENDING" ||
    typeof row.self_review !== "boolean" ||
    typeof row.review_eligible !== "boolean"
  ) {
    return null;
  }
  return {
    ok: true,
    code: "review_detail_ready",
    orderId,
    paymentId,
    paymentTransactionId,
    paymentProofId,
    orderStatus,
    orderPaymentStatus,
    paymentStatus,
    transactionStatus: "PENDING",
    proofStatus: "PENDING",
    amount,
    currencyCode,
    submittedAt,
    paymentDueAt,
    paymentReference,
    selfReview: row.self_review,
    reviewEligible: row.review_eligible,
  };
}

function parseAction(
  value: unknown,
  operation: "PAYMENT_VERIFY" | "PAYMENT_REJECT",
): ManualPaymentReviewActionSuccess | null {
  const row = asObject(value);
  if (!row || !hasExactKeys(row, ACTION_KEYS) || row.operation !== operation) {
    return null;
  }
  const verified = operation === "PAYMENT_VERIFY";
  if (
    row.transaction_status !== (verified ? "SUCCEEDED" : "FAILED") ||
    row.proof_status !== (verified ? "VERIFIED" : "REJECTED") ||
    row.order_status !== (verified ? "CONFIRMED" : "PENDING_CONFIRMATION") ||
    row.order_payment_status !== (verified ? "PAID" : "UNPAID") ||
    row.payment_status !== (verified ? "PAID" : "UNPAID") ||
    typeof row.coupon_consumed !== "boolean" ||
    typeof row.idempotency_reused !== "boolean"
  ) {
    return null;
  }
  const orderId = asUuid(row.order_id);
  const paymentId = asUuid(row.payment_id);
  const paymentTransactionId = asUuid(row.payment_transaction_id);
  const paymentProofId = asUuid(row.payment_proof_id);
  const reviewedAt = asTimestamp(row.reviewed_at);
  const allocationCount = asNonnegativeInteger(row.allocation_count);
  if (
    !orderId || !paymentId || !paymentTransactionId || !paymentProofId ||
    !reviewedAt || allocationCount === null
  ) {
    return null;
  }
  return {
    ok: true,
    code: verified ? "payment_verified" : "payment_rejected",
    operation,
    orderId,
    paymentId,
    paymentTransactionId,
    paymentProofId,
    transactionStatus: verified ? "SUCCEEDED" : "FAILED",
    proofStatus: verified ? "VERIFIED" : "REJECTED",
    orderStatus: verified ? "CONFIRMED" : "PENDING_CONFIRMATION",
    orderPaymentStatus: verified ? "PAID" : "UNPAID",
    paymentStatus: verified ? "PAID" : "UNPAID",
    reviewedAt,
    allocationCount,
    couponConsumed: row.coupon_consumed,
    idempotencyReused: row.idempotency_reused,
  };
}

function mapRpcError(message: string): ManualPaymentReviewFailure {
  const mappings: Array<[string, ManualPaymentReviewFailureCode]> = [
    ["AUTH_REQUIRED", "anonymous"],
    ["MEMBERSHIP_REQUIRED", "missing_membership"],
    ["PAYMENT_VERIFY_PERMISSION_REQUIRED", "permission_denied"],
    ["PERMISSION_DENIED", "permission_denied"],
    ["CHECKOUT_NOT_ENABLED", "feature_disabled"],
    ["PAYMENT_REVIEW_NOT_FOUND", "review_not_found"],
    ["PAYMENT_REVIEW_SELF_ACTION_DENIED", "self_review_denied"],
    ["PAYMENT_REASON_INVALID", "reason_invalid"],
    ["PAYMENT_STATE_CONFLICT", "state_conflict"],
    ["PAYMENT_ALREADY_REVIEWED", "already_reviewed"],
    ["PAYMENT_EXPIRED", "payment_expired"],
    ["PAYMENT_HOLD_INCONSISTENT", "hold_inconsistent"],
    ["PAYMENT_AMOUNT_INCONSISTENT", "amount_inconsistent"],
    ["PAYMENT_ALLOCATION_INCONSISTENT", "allocation_inconsistent"],
    ["PAYMENT_COUPON_INCONSISTENT", "coupon_inconsistent"],
    ["IDEMPOTENCY_CONFLICT", "idempotency_conflict"],
    ["PAYMENT_SETTLEMENT_FAILED", "review_failed"],
    ["PAYMENT_REVIEW_FAILED", "review_failed"],
    ["PAYMENT_REVIEW_READ_FAILED", "unexpected_error"],
  ];
  return failure(
    mappings.find(([candidate]) => message.includes(candidate))?.[1] ??
      "unexpected_error",
  );
}

function failure(code: ManualPaymentReviewFailureCode): ManualPaymentReviewFailure {
  return {
    ok: false,
    code,
    retryable: code === "review_failed" || code === "unexpected_error",
  };
}

async function safelyRunHandoff(
  handoff: () => Promise<ManualPaymentHandoffState>,
) {
  try {
    await handoff();
  } catch {
    // The committed review is authoritative; handoff remains independently retryable.
  }
}

function normalizeCursor(value: ManualPaymentReviewCursor | null | undefined) {
  if (!value) return null;
  return asTimestamp(value.submittedAt) && isUuid(value.paymentTransactionId)
    ? value
    : null;
}

function parseCursor(value: unknown): ManualPaymentReviewCursor | null {
  const row = asObject(value);
  if (!row || !hasExactKeys(row, CURSOR_KEYS)) return null;
  const submittedAt = asTimestamp(row.submitted_at);
  const paymentTransactionId = asUuid(row.payment_transaction_id);
  return submittedAt && paymentTransactionId
    ? { submittedAt, paymentTransactionId }
    : null;
}

function normalizeLimit(value: number | undefined) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 50
    ? Number(value)
    : 25;
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

function asMoney(value: unknown) {
  const text = typeof value === "number" ? value.toFixed(2) : String(value ?? "");
  return /^\d{1,12}\.\d{2}$/.test(text) ? text : null;
}

function asCurrency(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;
}

function asTimestamp(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

function asBoundedText(value: unknown, maximumLength: number) {
  return typeof value === "string" && value.length >= 1 && value.length <= maximumLength
    ? value
    : null;
}

function asNonnegativeInteger(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

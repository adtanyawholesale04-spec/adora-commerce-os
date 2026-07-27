import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PaymentReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type PaymentReadModel = {
  context: AdminShellContext;
  state: PaymentReadModelState;
  metrics: PaymentReadMetrics;
  payments: PaymentSummary[];
  transactions: PaymentTransactionSummary[];
  refunds: RefundSummary[];
  orderLabelsVisible: boolean;
  errorMessage: string | null;
};

export type PaymentSummary = {
  id: string;
  orderId: string;
  orderLabel: string;
  status: string;
  amountExpected: number;
  amountReceived: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentTransactionSummary = {
  id: string;
  paymentId: string;
  orderLabel: string;
  transactionType: string;
  paymentMethod: string;
  amount: number;
  currencyCode: string;
  provider: string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

export type RefundSummary = {
  id: string;
  orderId: string;
  orderLabel: string;
  refundNumber: string;
  amount: number;
  refundMethod: string;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaymentReadMetrics = {
  paymentCount: number;
  transactionCount: number;
  refundCount: number;
  amountExpected: number;
  amountReceived: number;
  refundAmount: number;
};

type PaymentRow = {
  id: string;
  order_id: string;
  status: string;
  amount_expected: number | string;
  amount_received: number | string;
  currency_code: string;
  created_at: string;
  updated_at: string;
};

type PaymentTransactionRow = {
  id: string;
  payment_id: string;
  transaction_type: string;
  payment_method: string;
  amount: number | string;
  currency_code: string;
  provider: string | null;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type RefundRow = {
  id: string;
  order_id: string;
  refund_number: string;
  amount: number | string;
  refund_method: string;
  status: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

type OrderLabelRow = {
  id: string;
  order_number: string;
};

const emptyMetrics: PaymentReadMetrics = {
  paymentCount: 0,
  transactionCount: 0,
  refundCount: 0,
  amountExpected: 0,
  amountReceived: 0,
  refundAmount: 0
};

export async function getPaymentsReadModel(): Promise<PaymentReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("payment.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .select(
      "id, order_id, status, amount_expected, amount_received, currency_code, created_at, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(75);

  if (paymentError) {
    return queryErrorModel(context, paymentError.message);
  }

  const payments = (paymentData ?? []) as PaymentRow[];
  const { data: transactionData, error: transactionError } = await supabase
    .from("payment_transactions")
    .select(
      "id, payment_id, transaction_type, payment_method, amount, currency_code, provider, status, paid_at, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (transactionError) {
    return queryErrorModel(context, transactionError.message);
  }

  const { data: refundData, error: refundError } = await supabase
    .from("refunds")
    .select("id, order_id, refund_number, amount, refund_method, status, reason, created_at, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (refundError) {
    return queryErrorModel(context, refundError.message);
  }

  const transactions = (transactionData ?? []) as PaymentTransactionRow[];
  const refunds = (refundData ?? []) as RefundRow[];
  const orderLabelsVisible = context.permissions.includes("order.view");
  const orderLabels = orderLabelsVisible
    ? await loadOrderLabels(
        supabase,
        context.activeOrganizationId,
        payments.map((payment) => payment.order_id).concat(refunds.map((refund) => refund.order_id))
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (orderLabels.errorMessage) {
    return queryErrorModel(context, orderLabels.errorMessage);
  }

  const paymentSummaries = payments.map((payment) => toPaymentSummary(payment, orderLabels.labels));
  const paymentOrderLabels = mapPaymentOrderLabels(paymentSummaries);
  const transactionSummaries = transactions.map((transaction) =>
    toPaymentTransactionSummary(transaction, paymentOrderLabels)
  );
  const refundSummaries = refunds.map((refund) => toRefundSummary(refund, orderLabels.labels));

  return {
    context,
    state: "ready",
    metrics: {
      paymentCount: paymentSummaries.length,
      transactionCount: transactionSummaries.length,
      refundCount: refundSummaries.length,
      amountExpected: paymentSummaries.reduce((total, payment) => total + payment.amountExpected, 0),
      amountReceived: paymentSummaries.reduce((total, payment) => total + payment.amountReceived, 0),
      refundAmount: refundSummaries.reduce((total, refund) => total + refund.amount, 0)
    },
    payments: paymentSummaries,
    transactions: transactionSummaries,
    refunds: refundSummaries,
    orderLabelsVisible,
    errorMessage: null
  };
}

async function loadOrderLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  orderIds: string[]
) {
  const uniqueOrderIds = Array.from(new Set(orderIds));

  if (uniqueOrderIds.length === 0) {
    return { labels: new Map<string, string>(), errorMessage: null };
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("organization_id", organizationId)
    .in("id", uniqueOrderIds)
    .limit(125);

  if (error) {
    return { labels: new Map<string, string>(), errorMessage: error.message };
  }

  return { labels: mapOrderLabels((data ?? []) as OrderLabelRow[]), errorMessage: null };
}

function mapOrderLabels(rows: OrderLabelRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((order) => labels.set(order.id, order.order_number));
  return labels;
}

function mapPaymentOrderLabels(payments: PaymentSummary[]) {
  const labels = new Map<string, string>();
  payments.forEach((payment) => labels.set(payment.id, payment.orderLabel));
  return labels;
}

function toPaymentSummary(payment: PaymentRow, orderLabels: Map<string, string>): PaymentSummary {
  return {
    id: payment.id,
    orderId: payment.order_id,
    orderLabel: orderLabels.get(payment.order_id) ?? payment.order_id,
    status: payment.status,
    amountExpected: toNumber(payment.amount_expected),
    amountReceived: toNumber(payment.amount_received),
    currencyCode: payment.currency_code,
    createdAt: payment.created_at,
    updatedAt: payment.updated_at
  };
}

function toPaymentTransactionSummary(
  transaction: PaymentTransactionRow,
  paymentOrderLabels: Map<string, string>
): PaymentTransactionSummary {
  return {
    id: transaction.id,
    paymentId: transaction.payment_id,
    orderLabel: paymentOrderLabels.get(transaction.payment_id) ?? transaction.payment_id,
    transactionType: transaction.transaction_type,
    paymentMethod: transaction.payment_method,
    amount: toNumber(transaction.amount),
    currencyCode: transaction.currency_code,
    provider: transaction.provider,
    status: transaction.status,
    paidAt: transaction.paid_at,
    createdAt: transaction.created_at
  };
}

function toRefundSummary(refund: RefundRow, orderLabels: Map<string, string>): RefundSummary {
  return {
    id: refund.id,
    orderId: refund.order_id,
    orderLabel: orderLabels.get(refund.order_id) ?? refund.order_id,
    refundNumber: refund.refund_number,
    amount: toNumber(refund.amount),
    refundMethod: refund.refund_method,
    status: refund.status,
    reason: refund.reason,
    createdAt: refund.created_at,
    updatedAt: refund.updated_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: PaymentReadModelState
): PaymentReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    payments: [],
    transactions: [],
    refunds: [],
    orderLabelsVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): PaymentReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    payments: [],
    transactions: [],
    refunds: [],
    orderLabelsVisible: false,
    errorMessage
  };
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

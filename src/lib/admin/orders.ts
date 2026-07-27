import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrderReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type OrderReadModel = {
  context: AdminShellContext;
  state: OrderReadModelState;
  metrics: OrderReadMetrics;
  orders: OrderSummary[];
  customerLabelsVisible: boolean;
  errorMessage: string | null;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  source: string;
  customerId: string;
  customerLabel: string;
  currencyCode: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  paymentDueAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrderReadMetrics = {
  orderCount: number;
  confirmedOrderCount: number;
  paidOrderCount: number;
  amountDue: number;
};

type OrderRow = {
  id: string;
  customer_id: string;
  order_number: string;
  source: string;
  currency_code: string;
  order_status: string;
  payment_status: string;
  fulfillment_status: string;
  grand_total: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  payment_due_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerLabelRow = {
  id: string;
  customer_code: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
};

const emptyMetrics: OrderReadMetrics = {
  orderCount: 0,
  confirmedOrderCount: 0,
  paidOrderCount: 0,
  amountDue: 0
};

export async function getOrdersReadModel(): Promise<OrderReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("order.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, customer_id, order_number, source, currency_code, order_status, payment_status, fulfillment_status, grand_total, amount_paid, amount_due, payment_due_at, confirmed_at, cancelled_at, completed_at, created_at, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("created_at", { ascending: false })
    .limit(75);

  if (error) {
    return queryErrorModel(context, error.message);
  }

  const customerLabelsVisible = context.permissions.includes("customer.view");
  const orders = (data ?? []) as OrderRow[];
  const labels = customerLabelsVisible
    ? await loadCustomerLabels(
        supabase,
        context.activeOrganizationId,
        orders.map((order) => order.customer_id)
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (labels.errorMessage) {
    return queryErrorModel(context, labels.errorMessage);
  }

  const summaries = orders.map((order) => toOrderSummary(order, labels.labels));

  return {
    context,
    state: "ready",
    metrics: {
      orderCount: summaries.length,
      confirmedOrderCount: summaries.filter((order) =>
        ["CONFIRMED", "PROCESSING"].includes(order.orderStatus)
      ).length,
      paidOrderCount: summaries.filter((order) => order.paymentStatus === "PAID").length,
      amountDue: summaries.reduce((total, order) => total + order.amountDue, 0)
    },
    orders: summaries,
    customerLabelsVisible,
    errorMessage: null
  };
}

async function loadCustomerLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  customerIds: string[]
) {
  const uniqueCustomerIds = Array.from(new Set(customerIds));

  if (uniqueCustomerIds.length === 0) {
    return { labels: new Map<string, string>(), errorMessage: null };
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id, customer_code, first_name, last_name, display_name, phone")
    .eq("organization_id", organizationId)
    .in("id", uniqueCustomerIds)
    .limit(75);

  if (error) {
    return { labels: new Map<string, string>(), errorMessage: error.message };
  }

  return { labels: mapCustomerLabels((data ?? []) as CustomerLabelRow[]), errorMessage: null };
}

function mapCustomerLabels(rows: CustomerLabelRow[]) {
  const labels = new Map<string, string>();

  rows.forEach((customer) => {
    labels.set(
      customer.id,
      customer.display_name ??
        compactName(customer) ??
        customer.phone ??
        customer.customer_code
    );
  });

  return labels;
}

function toOrderSummary(order: OrderRow, customerLabels: Map<string, string>): OrderSummary {
  return {
    id: order.id,
    orderNumber: order.order_number,
    source: order.source,
    customerId: order.customer_id,
    customerLabel: customerLabels.get(order.customer_id) ?? order.customer_id,
    currencyCode: order.currency_code,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    fulfillmentStatus: order.fulfillment_status,
    grandTotal: toNumber(order.grand_total),
    amountPaid: toNumber(order.amount_paid),
    amountDue: toNumber(order.amount_due),
    paymentDueAt: order.payment_due_at,
    confirmedAt: order.confirmed_at,
    cancelledAt: order.cancelled_at,
    completedAt: order.completed_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at
  };
}

function compactName(customer: CustomerLabelRow) {
  const name = [customer.first_name, customer.last_name]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return name.length > 0 ? name : null;
}

function emptyModel(context: AdminShellContext, state: OrderReadModelState): OrderReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    orders: [],
    customerLabelsVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(context: AdminShellContext, errorMessage: string): OrderReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    orders: [],
    customerLabelsVisible: false,
    errorMessage
  };
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CustomerReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type CustomerReadModel = {
  context: AdminShellContext;
  state: CustomerReadModelState;
  metrics: CustomerReadMetrics;
  customers: CustomerSummary[];
  orderSignalsVisible: boolean;
  errorMessage: string | null;
};

export type CustomerSummary = {
  id: string;
  code: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  status: string;
  isMerged: boolean;
  createdAt: string;
  updatedAt: string;
  orderSignals: CustomerOrderSignals | null;
};

export type CustomerOrderSignals = {
  orderCount: number;
  lifetimeSpend: number;
  latestOrderNumber: string | null;
  latestOrderStatus: string | null;
  latestOrderAt: string | null;
};

type CustomerReadMetrics = {
  customerCount: number;
  activeCustomerCount: number;
  mergedCustomerCount: number;
  blockedCustomerCount: number;
  orderCount: number | null;
  lifetimeSpend: number | null;
};

type CustomerRow = {
  id: string;
  customer_code: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  merged_into_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

type OrderSignalRow = {
  id: string;
  customer_id: string;
  order_number: string;
  order_status: string;
  grand_total: number | string;
  created_at: string;
};

const emptyMetrics: CustomerReadMetrics = {
  customerCount: 0,
  activeCustomerCount: 0,
  mergedCustomerCount: 0,
  blockedCustomerCount: 0,
  orderCount: null,
  lifetimeSpend: null
};

export async function getCustomersReadModel(): Promise<CustomerReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("customer.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: customerData, error: customerError } = await supabase
    .from("customers")
    .select(
      "id, customer_code, first_name, last_name, display_name, phone, email, status, merged_into_customer_id, created_at, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(75);

  if (customerError) {
    return queryErrorModel(context, customerError.message);
  }

  const customers = (customerData ?? []) as CustomerRow[];
  const orderSignalsVisible = context.permissions.includes("order.view");
  const orderSignals = orderSignalsVisible
    ? await loadOrderSignals(
        supabase,
        context.activeOrganizationId,
        customers.map((customer) => customer.id)
      )
    : { signals: new Map<string, CustomerOrderSignals>(), errorMessage: null };

  if (orderSignals.errorMessage) {
    return queryErrorModel(context, orderSignals.errorMessage);
  }

  const summaries = customers.map((customer) =>
    toCustomerSummary(customer, orderSignals.signals.get(customer.id) ?? null)
  );
  const totals = sumOrderSignals(summaries.map((customer) => customer.orderSignals));

  return {
    context,
    state: "ready",
    metrics: {
      customerCount: summaries.length,
      activeCustomerCount: summaries.filter((customer) => customer.status === "ACTIVE").length,
      mergedCustomerCount: summaries.filter((customer) => customer.isMerged).length,
      blockedCustomerCount: summaries.filter((customer) => customer.status === "BLOCKED").length,
      orderCount: orderSignalsVisible ? totals.orderCount : null,
      lifetimeSpend: orderSignalsVisible ? totals.lifetimeSpend : null
    },
    customers: summaries,
    orderSignalsVisible,
    errorMessage: null
  };
}

async function loadOrderSignals(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  customerIds: string[]
) {
  if (customerIds.length === 0) {
    return { signals: new Map<string, CustomerOrderSignals>(), errorMessage: null };
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_id, order_number, order_status, grand_total, created_at")
    .eq("organization_id", organizationId)
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return { signals: new Map<string, CustomerOrderSignals>(), errorMessage: error.message };
  }

  return { signals: groupOrderSignals((data ?? []) as OrderSignalRow[]), errorMessage: null };
}

function groupOrderSignals(rows: OrderSignalRow[]) {
  const signals = new Map<string, CustomerOrderSignals>();

  rows.forEach((row) => {
    const current = signals.get(row.customer_id) ?? {
      orderCount: 0,
      lifetimeSpend: 0,
      latestOrderNumber: null,
      latestOrderStatus: null,
      latestOrderAt: null
    };

    signals.set(row.customer_id, {
      orderCount: current.orderCount + 1,
      lifetimeSpend: current.lifetimeSpend + toNumber(row.grand_total),
      latestOrderNumber: current.latestOrderNumber ?? row.order_number,
      latestOrderStatus: current.latestOrderStatus ?? row.order_status,
      latestOrderAt: current.latestOrderAt ?? row.created_at
    });
  });

  return signals;
}

function toCustomerSummary(
  customer: CustomerRow,
  orderSignals: CustomerOrderSignals | null
): CustomerSummary {
  return {
    id: customer.id,
    code: customer.customer_code,
    displayName: customer.display_name ?? compactName(customer) ?? customer.customer_code,
    phone: customer.phone,
    email: customer.email,
    status: customer.status,
    isMerged: Boolean(customer.merged_into_customer_id) || customer.status === "MERGED",
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    orderSignals
  };
}

function compactName(customer: CustomerRow) {
  const name = [customer.first_name, customer.last_name]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return name.length > 0 ? name : null;
}

function sumOrderSignals(values: Array<CustomerOrderSignals | null>) {
  return values.reduce(
    (total, value) => ({
      orderCount: total.orderCount + (value?.orderCount ?? 0),
      lifetimeSpend: total.lifetimeSpend + (value?.lifetimeSpend ?? 0)
    }),
    { orderCount: 0, lifetimeSpend: 0 }
  );
}

function emptyModel(
  context: AdminShellContext,
  state: CustomerReadModelState
): CustomerReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    customers: [],
    orderSignalsVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): CustomerReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    customers: [],
    orderSignalsVisible: false,
    errorMessage
  };
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

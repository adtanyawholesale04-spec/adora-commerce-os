import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { adminNavigation, type AdminNavStatus } from "@/lib/admin/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type DashboardReadModel = {
  context: AdminShellContext;
  state: DashboardReadModelState;
  metrics: DashboardMetrics;
  moduleRows: DashboardModuleRow[];
  guardrailRows: DashboardGuardrailRow[];
  errorMessage: string | null;
};

export type DashboardModuleRow = {
  id: string;
  label: string;
  href: string;
  status: AdminNavStatus;
  allowed: boolean;
  requiredPermissions: string[];
  actionBoundary: string;
};

export type DashboardGuardrailRow = {
  label: string;
  value: string;
};

type DashboardMetrics = {
  modulesMapped: number;
  modulesAccessible: number;
  readReadyModules: number;
  guardedModules: number;
  permissionCount: number;
  productCount: number | null;
  inventoryAvailable: number | null;
  customerCount: number | null;
  openOrderCount: number | null;
  paymentDueAmount: number | null;
  fulfillmentQueueCount: number | null;
  qcQueueCount: number | null;
  shipmentQueueCount: number | null;
  returnQueueCount: number | null;
};

type CountResult = {
  value: number | null;
  errorMessage: string | null;
};

type AmountRow = {
  amount_due?: number | string | null;
  available?: number | string | null;
};

const emptyMetrics: DashboardMetrics = {
  modulesMapped: adminNavigation.length,
  modulesAccessible: 0,
  readReadyModules: 0,
  guardedModules: 0,
  permissionCount: 0,
  productCount: null,
  inventoryAvailable: null,
  customerCount: null,
  openOrderCount: null,
  paymentDueAmount: null,
  fulfillmentQueueCount: null,
  qcQueueCount: null,
  shipmentQueueCount: null,
  returnQueueCount: null
};

export async function getDashboardReadModel(): Promise<DashboardReadModel> {
  const context = await getAdminShellContext();
  const moduleRows = buildModuleRows(context);

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode, moduleRows);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership", moduleRows);
  }

  if (!context.permissions.includes("report.view")) {
    return emptyModel(context, "permission_denied", moduleRows);
  }

  const supabase = await createSupabaseServerClient();
  const organizationId = context.activeOrganizationId;
  const [
    productCount,
    customerCount,
    openOrderCount,
    fulfillmentQueueCount,
    qcQueueCount,
    shipmentQueueCount,
    returnQueueCount,
    inventoryAvailable,
    paymentDueAmount
  ] = await Promise.all([
    context.permissions.includes("product.view")
      ? countRows(supabase, "products", organizationId)
      : skippedCount(),
    context.permissions.includes("customer.view")
      ? countRows(supabase, "customers", organizationId)
      : skippedCount(),
    context.permissions.includes("order.view")
      ? countRows(supabase, "orders", organizationId, "order_status", ["DRAFT", "CONFIRMED", "PROCESSING", "ON_HOLD"])
      : skippedCount(),
    context.permissions.includes("warehouse.pick")
      ? countRows(supabase, "fulfillments", organizationId, "status", ["PENDING", "PICKING", "PACKING", "ON_HOLD"])
      : skippedCount(),
    context.permissions.includes("warehouse.qc")
      ? countRows(supabase, "fulfillment_qc_sessions", organizationId, "status", ["PENDING", "IN_PROGRESS", "FAILED"])
      : skippedCount(),
    context.permissions.includes("shipping.create")
      ? countRows(supabase, "shipments", organizationId, "status", ["DRAFT", "READY", "LABEL_CREATED", "HANDED_OFF", "IN_TRANSIT"])
      : skippedCount(),
    context.permissions.includes("return.view")
      ? countRows(supabase, "returns", organizationId, "status", ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "INSPECTED"])
      : skippedCount(),
    context.permissions.includes("inventory.view")
      ? sumColumn(supabase, "inventory_balances", organizationId, "available", 500)
      : skippedCount(),
    context.permissions.includes("order.view")
      ? sumColumn(supabase, "orders", organizationId, "amount_due", 100)
      : skippedCount()
  ]);

  const firstError = [
    productCount,
    customerCount,
    openOrderCount,
    fulfillmentQueueCount,
    qcQueueCount,
    shipmentQueueCount,
    returnQueueCount,
    inventoryAvailable,
    paymentDueAmount
  ].find((result) => result.errorMessage);

  if (firstError?.errorMessage) {
    return queryErrorModel(context, moduleRows, firstError.errorMessage);
  }

  return {
    context,
    state: "ready",
    metrics: {
      modulesMapped: adminNavigation.length,
      modulesAccessible: moduleRows.filter((row) => row.allowed).length,
      readReadyModules: moduleRows.filter((row) =>
        ["READY_FOR_READ", "READY_FOR_GUARDED_ACTION", "PARTIAL_ACTION_READY"].includes(row.status)
      ).length,
      guardedModules: moduleRows.filter((row) =>
        ["READY_FOR_GUARDED_ACTION", "PARTIAL_ACTION_READY", "NEEDS_SERVICE", "COMMERCIAL_WRITES_BLOCKED"].includes(row.status)
      ).length,
      permissionCount: context.permissions.length,
      productCount: productCount.value,
      inventoryAvailable: inventoryAvailable.value,
      customerCount: customerCount.value,
      openOrderCount: openOrderCount.value,
      paymentDueAmount: paymentDueAmount.value,
      fulfillmentQueueCount: fulfillmentQueueCount.value,
      qcQueueCount: qcQueueCount.value,
      shipmentQueueCount: shipmentQueueCount.value,
      returnQueueCount: returnQueueCount.value
    },
    moduleRows,
    guardrailRows: buildGuardrailRows(context),
    errorMessage: null
  };
}

function buildModuleRows(context: AdminShellContext): DashboardModuleRow[] {
  const permissions = new Set(context.permissions);

  return adminNavigation.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    status: item.status,
    allowed: item.requiredPermissions.some((permission) => permissions.has(permission)),
    requiredPermissions: item.requiredPermissions,
    actionBoundary: item.actionBoundary
  }));
}

function buildGuardrailRows(context: AdminShellContext): DashboardGuardrailRow[] {
  return [
    { label: "Tenant", value: context.organizationName ?? "Unavailable" },
    { label: "Membership", value: context.membershipStatus ?? "Unavailable" },
    { label: "Authorization", value: "Authentication + active membership + permission" },
    { label: "Writes", value: "Guarded service/RPC only" },
    { label: "Service role", value: "Never exposed to browser" }
  ];
}

async function countRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  organizationId: string,
  statusColumn?: string,
  statuses?: string[]
): Promise<CountResult> {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (statusColumn && statuses) {
    query = query.in(statusColumn, statuses);
  }

  const { count, error } = await query;

  return { value: count ?? 0, errorMessage: error?.message ?? null };
}

async function sumColumn(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  table: string,
  organizationId: string,
  column: "amount_due" | "available",
  limit: number
): Promise<CountResult> {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .eq("organization_id", organizationId)
    .limit(limit);

  if (error) {
    return { value: null, errorMessage: error.message };
  }

  const value = ((data ?? []) as AmountRow[]).reduce((total, row) => {
    const raw = row[column];
    return total + (typeof raw === "number" ? raw : Number(raw ?? 0));
  }, 0);

  return { value, errorMessage: null };
}

function skippedCount(): CountResult {
  return { value: null, errorMessage: null };
}

function emptyModel(
  context: AdminShellContext,
  state: DashboardReadModelState,
  moduleRows: DashboardModuleRow[]
): DashboardReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    moduleRows,
    guardrailRows: buildGuardrailRows(context),
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  moduleRows: DashboardModuleRow[],
  errorMessage: string
): DashboardReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    moduleRows,
    guardrailRows: buildGuardrailRows(context),
    errorMessage
  };
}

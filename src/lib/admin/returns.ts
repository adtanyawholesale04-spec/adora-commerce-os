import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReturnsReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type ReturnsReadModel = {
  context: AdminShellContext;
  state: ReturnsReadModelState;
  metrics: ReturnsReadMetrics;
  returns: ReturnCaseSummary[];
  items: ReturnItemSummary[];
  statusHistory: ReturnStatusHistorySummary[];
  dispositions: ReturnDispositionSummary[];
  exchanges: ExchangeReplacementSummary[];
  orderLabelsVisible: boolean;
  productLabelsVisible: boolean;
  inspectVisible: boolean;
  manageVisible: boolean;
  errorMessage: string | null;
};

export type ReturnCaseSummary = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderLabel: string;
  returnType: string;
  status: string;
  resolutionType: string | null;
  reason: string | null;
  requestedAt: string;
  receivedAt: string | null;
  inspectedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  totalQuantity: number;
  refundAmount: number;
  dispositionCount: number;
};

export type ReturnItemSummary = {
  id: string;
  returnId: string;
  returnNumber: string;
  orderItemLabel: string;
  quantity: number;
  conditionStatus: string | null;
  restockable: boolean;
  refundAmount: number | null;
  replacementVariantLabel: string | null;
  createdAt: string;
};

export type ReturnStatusHistorySummary = {
  id: string;
  returnId: string;
  returnNumber: string;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  createdAt: string;
};

export type ReturnDispositionSummary = {
  id: string;
  returnItemId: string;
  returnNumber: string;
  disposition: string;
  quantity: number;
  warehouseId: string | null;
  hasInventoryMovement: boolean;
  reason: string | null;
  createdAt: string;
};

export type ExchangeReplacementSummary = {
  id: string;
  returnId: string;
  returnNumber: string;
  returnItemLabel: string;
  replacementOrderLabel: string | null;
  replacementOrderItemLabel: string | null;
  priceDifference: number;
  createdAt: string;
};

type ReturnsReadMetrics = {
  returnCount: number;
  openReturnCount: number;
  receivedCount: number;
  inspectedCount: number;
  resolvedCount: number;
  totalQuantity: number;
  refundAmount: number;
  dispositionCount: number;
};

type ReturnRow = {
  id: string;
  order_id: string;
  return_number: string;
  return_type: string;
  status: string;
  resolution_type: string | null;
  reason: string | null;
  requested_at: string;
  received_at: string | null;
  inspected_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReturnItemRow = {
  id: string;
  return_id: string;
  order_item_id: string;
  quantity: number | string;
  condition_status: string | null;
  restockable: boolean;
  refund_amount: number | string | null;
  replacement_variant_id: string | null;
  created_at: string;
};

type ReturnStatusHistoryRow = {
  id: string;
  return_id: string;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  created_at: string;
};

type ReturnDispositionRow = {
  id: string;
  return_item_id: string;
  disposition: string;
  quantity: number | string;
  warehouse_id: string | null;
  inventory_movement_id: string | null;
  reason: string | null;
  created_at: string;
};

type ExchangeReplacementRow = {
  id: string;
  return_id: string;
  return_item_id: string;
  replacement_order_id: string | null;
  replacement_order_item_id: string | null;
  price_difference: number | string;
  created_at: string;
};

type OrderLabelRow = {
  id: string;
  order_number: string;
};

type OrderItemLabelRow = {
  id: string;
  sku_snapshot: string | null;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  quantity: number | string;
};

type VariantLabelRow = {
  id: string;
  stock_code: string;
  variant_name: string;
};

const emptyMetrics: ReturnsReadMetrics = {
  returnCount: 0,
  openReturnCount: 0,
  receivedCount: 0,
  inspectedCount: 0,
  resolvedCount: 0,
  totalQuantity: 0,
  refundAmount: 0,
  dispositionCount: 0
};

export async function getReturnsReadModel(): Promise<ReturnsReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("return.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: returnData, error: returnError } = await supabase
    .from("returns")
    .select(
      "id, order_id, return_number, return_type, status, resolution_type, reason, requested_at, received_at, inspected_at, resolved_at, created_at, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(75);

  if (returnError) {
    return queryErrorModel(context, returnError.message);
  }

  const returns = (returnData ?? []) as ReturnRow[];
  const returnIds = returns.map((returnCase) => returnCase.id);
  const { data: itemData, error: itemError } = await supabase
    .from("return_items")
    .select(
      "id, return_id, order_item_id, quantity, condition_status, restockable, refund_amount, replacement_variant_id, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("return_id", nonEmptyIds(returnIds))
    .order("created_at", { ascending: false })
    .limit(200);

  if (itemError) {
    return queryErrorModel(context, itemError.message);
  }

  const { data: statusData, error: statusError } = await supabase
    .from("return_status_history")
    .select("id, return_id, from_status, to_status, reason, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("return_id", nonEmptyIds(returnIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (statusError) {
    return queryErrorModel(context, statusError.message);
  }

  const items = (itemData ?? []) as ReturnItemRow[];
  const itemIds = items.map((item) => item.id);
  const { data: dispositionData, error: dispositionError } = await supabase
    .from("return_inventory_dispositions")
    .select("id, return_item_id, disposition, quantity, warehouse_id, inventory_movement_id, reason, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("return_item_id", nonEmptyIds(itemIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (dispositionError) {
    return queryErrorModel(context, dispositionError.message);
  }

  const { data: exchangeData, error: exchangeError } = await supabase
    .from("exchange_replacements")
    .select(
      "id, return_id, return_item_id, replacement_order_id, replacement_order_item_id, price_difference, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("return_id", nonEmptyIds(returnIds))
    .order("created_at", { ascending: false })
    .limit(100);

  if (exchangeError) {
    return queryErrorModel(context, exchangeError.message);
  }

  const orderLabelsVisible = context.permissions.includes("order.view");
  const productLabelsVisible = context.permissions.includes("product.view");
  const inspectVisible = context.permissions.includes("return.inspect");
  const manageVisible = context.permissions.includes("return.manage");

  const exchanges = (exchangeData ?? []) as ExchangeReplacementRow[];
  const orderLabels = orderLabelsVisible
    ? await loadOrderLabels(
        supabase,
        context.activeOrganizationId,
        returns.map((returnCase) => returnCase.order_id).concat(
          exchanges.flatMap((exchange) =>
            exchange.replacement_order_id ? [exchange.replacement_order_id] : []
          )
        )
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (orderLabels.errorMessage) {
    return queryErrorModel(context, orderLabels.errorMessage);
  }

  const orderItemLabels = orderLabelsVisible
    ? await loadOrderItemLabels(
        supabase,
        context.activeOrganizationId,
        items.map((item) => item.order_item_id).concat(
          exchanges.flatMap((exchange) =>
            exchange.replacement_order_item_id ? [exchange.replacement_order_item_id] : []
          )
        )
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (orderItemLabels.errorMessage) {
    return queryErrorModel(context, orderItemLabels.errorMessage);
  }

  const variantLabels = productLabelsVisible
    ? await loadVariantLabels(
        supabase,
        context.activeOrganizationId,
        items.flatMap((item) => (item.replacement_variant_id ? [item.replacement_variant_id] : []))
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (variantLabels.errorMessage) {
    return queryErrorModel(context, variantLabels.errorMessage);
  }

  const statusHistory = (statusData ?? []) as ReturnStatusHistoryRow[];
  const dispositions = (dispositionData ?? []) as ReturnDispositionRow[];
  const returnLabels = mapReturnLabels(returns);
  const returnItemLabels = mapReturnItemLabels(items, returnLabels, orderItemLabels.labels);
  const itemStats = mapReturnItemStats(items);
  const dispositionStats = mapDispositionStats(dispositions, items);
  const returnSummaries = returns.map((returnCase) =>
    toReturnCaseSummary(returnCase, orderLabels.labels, itemStats, dispositionStats)
  );
  const itemSummaries = items.map((item) =>
    toReturnItemSummary(item, returnLabels, orderItemLabels.labels, variantLabels.labels)
  );
  const statusSummaries = statusHistory.map((history) =>
    toStatusHistorySummary(history, returnLabels)
  );
  const dispositionSummaries = dispositions.map((disposition) =>
    toDispositionSummary(disposition, returnItemLabels)
  );
  const exchangeSummaries = exchanges.map((exchange) =>
    toExchangeSummary(exchange, returnLabels, returnItemLabels, orderLabels.labels, orderItemLabels.labels)
  );

  return {
    context,
    state: "ready",
    metrics: {
      returnCount: returnSummaries.length,
      openReturnCount: returnSummaries.filter((returnCase) =>
        ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED", "INSPECTION"].includes(returnCase.status)
      ).length,
      receivedCount: returnSummaries.filter((returnCase) =>
        ["RECEIVED", "INSPECTION"].includes(returnCase.status)
      ).length,
      inspectedCount: returnSummaries.filter((returnCase) => Boolean(returnCase.inspectedAt)).length,
      resolvedCount: returnSummaries.filter((returnCase) => returnCase.status === "RESOLVED").length,
      totalQuantity: itemSummaries.reduce((total, item) => total + item.quantity, 0),
      refundAmount: itemSummaries.reduce((total, item) => total + (item.refundAmount ?? 0), 0),
      dispositionCount: dispositionSummaries.length
    },
    returns: returnSummaries,
    items: itemSummaries,
    statusHistory: statusSummaries,
    dispositions: dispositionSummaries,
    exchanges: exchangeSummaries,
    orderLabelsVisible,
    productLabelsVisible,
    inspectVisible,
    manageVisible,
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
    .limit(150);

  if (error) {
    return { labels: new Map<string, string>(), errorMessage: error.message };
  }

  const labels = new Map<string, string>();
  ((data ?? []) as OrderLabelRow[]).forEach((order) => labels.set(order.id, order.order_number));
  return { labels, errorMessage: null };
}

async function loadOrderItemLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  orderItemIds: string[]
) {
  const uniqueItemIds = Array.from(new Set(orderItemIds));

  if (uniqueItemIds.length === 0) {
    return { labels: new Map<string, string>(), errorMessage: null };
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("id, sku_snapshot, product_name_snapshot, variant_name_snapshot, quantity")
    .eq("organization_id", organizationId)
    .in("id", uniqueItemIds)
    .limit(250);

  if (error) {
    return { labels: new Map<string, string>(), errorMessage: error.message };
  }

  const labels = new Map<string, string>();
  ((data ?? []) as OrderItemLabelRow[]).forEach((item) => {
    const sku = item.sku_snapshot ? `${item.sku_snapshot} / ` : "";
    const variant = item.variant_name_snapshot ? ` / ${item.variant_name_snapshot}` : "";
    labels.set(item.id, `${sku}${item.product_name_snapshot}${variant} x ${toNumber(item.quantity)}`);
  });
  return { labels, errorMessage: null };
}

async function loadVariantLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  variantIds: string[]
) {
  const uniqueVariantIds = Array.from(new Set(variantIds));

  if (uniqueVariantIds.length === 0) {
    return { labels: new Map<string, string>(), errorMessage: null };
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select("id, stock_code, variant_name")
    .eq("organization_id", organizationId)
    .in("id", uniqueVariantIds)
    .limit(150);

  if (error) {
    return { labels: new Map<string, string>(), errorMessage: error.message };
  }

  const labels = new Map<string, string>();
  ((data ?? []) as VariantLabelRow[]).forEach((variant) =>
    labels.set(variant.id, `${variant.stock_code} / ${variant.variant_name}`)
  );
  return { labels, errorMessage: null };
}

function mapReturnLabels(rows: ReturnRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((returnCase) => labels.set(returnCase.id, returnCase.return_number));
  return labels;
}

function mapReturnItemLabels(
  rows: ReturnItemRow[],
  returnLabels: Map<string, string>,
  orderItemLabels: Map<string, string>
) {
  const labels = new Map<string, { returnNumber: string; itemLabel: string }>();
  rows.forEach((item) => {
    labels.set(item.id, {
      returnNumber: returnLabels.get(item.return_id) ?? item.return_id,
      itemLabel: orderItemLabels.get(item.order_item_id) ?? item.order_item_id
    });
  });
  return labels;
}

function mapReturnItemStats(rows: ReturnItemRow[]) {
  const stats = new Map<string, { itemCount: number; totalQuantity: number; refundAmount: number }>();
  rows.forEach((item) => {
    const current = stats.get(item.return_id) ?? { itemCount: 0, totalQuantity: 0, refundAmount: 0 };
    stats.set(item.return_id, {
      itemCount: current.itemCount + 1,
      totalQuantity: current.totalQuantity + toNumber(item.quantity),
      refundAmount: current.refundAmount + (item.refund_amount == null ? 0 : toNumber(item.refund_amount))
    });
  });
  return stats;
}

function mapDispositionStats(dispositions: ReturnDispositionRow[], items: ReturnItemRow[]) {
  const returnIdsByItem = new Map<string, string>();
  items.forEach((item) => returnIdsByItem.set(item.id, item.return_id));

  const stats = new Map<string, number>();
  dispositions.forEach((disposition) => {
    const returnId = returnIdsByItem.get(disposition.return_item_id);
    if (returnId) {
      stats.set(returnId, (stats.get(returnId) ?? 0) + 1);
    }
  });
  return stats;
}

function toReturnCaseSummary(
  returnCase: ReturnRow,
  orderLabels: Map<string, string>,
  itemStats: Map<string, { itemCount: number; totalQuantity: number; refundAmount: number }>,
  dispositionStats: Map<string, number>
): ReturnCaseSummary {
  const stats = itemStats.get(returnCase.id) ?? { itemCount: 0, totalQuantity: 0, refundAmount: 0 };

  return {
    id: returnCase.id,
    returnNumber: returnCase.return_number,
    orderId: returnCase.order_id,
    orderLabel: orderLabels.get(returnCase.order_id) ?? returnCase.order_id,
    returnType: returnCase.return_type,
    status: returnCase.status,
    resolutionType: returnCase.resolution_type,
    reason: returnCase.reason,
    requestedAt: returnCase.requested_at,
    receivedAt: returnCase.received_at,
    inspectedAt: returnCase.inspected_at,
    resolvedAt: returnCase.resolved_at,
    createdAt: returnCase.created_at,
    updatedAt: returnCase.updated_at,
    itemCount: stats.itemCount,
    totalQuantity: stats.totalQuantity,
    refundAmount: stats.refundAmount,
    dispositionCount: dispositionStats.get(returnCase.id) ?? 0
  };
}

function toReturnItemSummary(
  item: ReturnItemRow,
  returnLabels: Map<string, string>,
  orderItemLabels: Map<string, string>,
  variantLabels: Map<string, string>
): ReturnItemSummary {
  return {
    id: item.id,
    returnId: item.return_id,
    returnNumber: returnLabels.get(item.return_id) ?? item.return_id,
    orderItemLabel: orderItemLabels.get(item.order_item_id) ?? item.order_item_id,
    quantity: toNumber(item.quantity),
    conditionStatus: item.condition_status,
    restockable: item.restockable,
    refundAmount: item.refund_amount == null ? null : toNumber(item.refund_amount),
    replacementVariantLabel: item.replacement_variant_id
      ? variantLabels.get(item.replacement_variant_id) ?? item.replacement_variant_id
      : null,
    createdAt: item.created_at
  };
}

function toStatusHistorySummary(
  history: ReturnStatusHistoryRow,
  returnLabels: Map<string, string>
): ReturnStatusHistorySummary {
  return {
    id: history.id,
    returnId: history.return_id,
    returnNumber: returnLabels.get(history.return_id) ?? history.return_id,
    fromStatus: history.from_status,
    toStatus: history.to_status,
    reason: history.reason,
    createdAt: history.created_at
  };
}

function toDispositionSummary(
  disposition: ReturnDispositionRow,
  returnItemLabels: Map<string, { returnNumber: string; itemLabel: string }>
): ReturnDispositionSummary {
  const labels = returnItemLabels.get(disposition.return_item_id);

  return {
    id: disposition.id,
    returnItemId: disposition.return_item_id,
    returnNumber: labels?.returnNumber ?? disposition.return_item_id,
    disposition: disposition.disposition,
    quantity: toNumber(disposition.quantity),
    warehouseId: disposition.warehouse_id,
    hasInventoryMovement: Boolean(disposition.inventory_movement_id),
    reason: disposition.reason,
    createdAt: disposition.created_at
  };
}

function toExchangeSummary(
  exchange: ExchangeReplacementRow,
  returnLabels: Map<string, string>,
  returnItemLabels: Map<string, { returnNumber: string; itemLabel: string }>,
  orderLabels: Map<string, string>,
  orderItemLabels: Map<string, string>
): ExchangeReplacementSummary {
  const labels = returnItemLabels.get(exchange.return_item_id);

  return {
    id: exchange.id,
    returnId: exchange.return_id,
    returnNumber: returnLabels.get(exchange.return_id) ?? exchange.return_id,
    returnItemLabel: labels?.itemLabel ?? exchange.return_item_id,
    replacementOrderLabel: exchange.replacement_order_id
      ? orderLabels.get(exchange.replacement_order_id) ?? exchange.replacement_order_id
      : null,
    replacementOrderItemLabel: exchange.replacement_order_item_id
      ? orderItemLabels.get(exchange.replacement_order_item_id) ?? exchange.replacement_order_item_id
      : null,
    priceDifference: toNumber(exchange.price_difference),
    createdAt: exchange.created_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: ReturnsReadModelState
): ReturnsReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    returns: [],
    items: [],
    statusHistory: [],
    dispositions: [],
    exchanges: [],
    orderLabelsVisible: false,
    productLabelsVisible: false,
    inspectVisible: false,
    manageVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): ReturnsReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    returns: [],
    items: [],
    statusHistory: [],
    dispositions: [],
    exchanges: [],
    orderLabelsVisible: false,
    productLabelsVisible: false,
    inspectVisible: false,
    manageVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

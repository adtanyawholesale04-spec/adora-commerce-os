import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FulfillmentReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type FulfillmentReadModel = {
  context: AdminShellContext;
  state: FulfillmentReadModelState;
  metrics: FulfillmentReadMetrics;
  fulfillments: FulfillmentSummary[];
  items: FulfillmentItemSummary[];
  qcSessions: FulfillmentQcSessionSummary[];
  shipments: FulfillmentShipmentSummary[];
  orderLabelsVisible: boolean;
  productLabelsVisible: boolean;
  qcSignalsVisible: boolean;
  shippingSignalsVisible: boolean;
  errorMessage: string | null;
};

export type FulfillmentSummary = {
  id: string;
  fulfillmentNumber: string;
  warehouseId: string;
  consolidationId: string | null;
  status: string;
  packedAt: string | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  totalQuantity: number;
};

export type FulfillmentItemSummary = {
  id: string;
  fulfillmentId: string;
  fulfillmentNumber: string;
  orderLabel: string;
  variantLabel: string;
  quantity: number;
  createdAt: string;
};

export type FulfillmentQcSessionSummary = {
  id: string;
  fulfillmentId: string;
  fulfillmentNumber: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FulfillmentShipmentSummary = {
  id: string;
  fulfillmentId: string;
  fulfillmentNumber: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  shippingMethod: string | null;
  status: string;
  packageCount: number;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

type FulfillmentReadMetrics = {
  fulfillmentCount: number;
  activeFulfillmentCount: number;
  itemCount: number;
  totalQuantity: number;
  qcSessionCount: number;
  shipmentCount: number;
};

type FulfillmentRow = {
  id: string;
  fulfillment_number: string;
  warehouse_id: string;
  consolidation_id: string | null;
  status: string;
  packed_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
};

type FulfillmentItemRow = {
  id: string;
  fulfillment_id: string;
  order_id: string;
  order_item_id: string;
  variant_id: string | null;
  quantity: number | string;
  created_at: string;
};

type FulfillmentQcSessionRow = {
  id: string;
  fulfillment_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

type FulfillmentShipmentRow = {
  id: string;
  fulfillment_id: string;
  shipment_number: string;
  tracking_number: string | null;
  shipping_method: string | null;
  status: string;
  package_count: number;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

type OrderLabelRow = {
  id: string;
  order_number: string;
};

type VariantLabelRow = {
  id: string;
  stock_code: string;
  variant_name: string;
};

const emptyMetrics: FulfillmentReadMetrics = {
  fulfillmentCount: 0,
  activeFulfillmentCount: 0,
  itemCount: 0,
  totalQuantity: 0,
  qcSessionCount: 0,
  shipmentCount: 0
};

export async function getFulfillmentReadModel(): Promise<FulfillmentReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("warehouse.pick")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: fulfillmentData, error: fulfillmentError } = await supabase
    .from("fulfillments")
    .select(
      "id, fulfillment_number, warehouse_id, consolidation_id, status, packed_at, fulfilled_at, created_at, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(75);

  if (fulfillmentError) {
    return queryErrorModel(context, fulfillmentError.message);
  }

  const fulfillments = (fulfillmentData ?? []) as FulfillmentRow[];
  const fulfillmentIds = fulfillments.map((fulfillment) => fulfillment.id);
  const { data: itemData, error: itemError } = await supabase
    .from("fulfillment_items")
    .select("id, fulfillment_id, order_id, order_item_id, variant_id, quantity, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("fulfillment_id", nonEmptyIds(fulfillmentIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (itemError) {
    return queryErrorModel(context, itemError.message);
  }

  const items = (itemData ?? []) as FulfillmentItemRow[];
  const qcSignalsVisible = context.permissions.includes("warehouse.qc");
  const shippingSignalsVisible = context.permissions.includes("shipping.create");
  const orderLabelsVisible = context.permissions.includes("order.view");
  const productLabelsVisible = context.permissions.includes("product.view");

  const qcSessions = qcSignalsVisible
    ? await loadQcSessions(supabase, context.activeOrganizationId, fulfillmentIds)
    : { rows: [] as FulfillmentQcSessionRow[], errorMessage: null };

  if (qcSessions.errorMessage) {
    return queryErrorModel(context, qcSessions.errorMessage);
  }

  const shipments = shippingSignalsVisible
    ? await loadShipments(supabase, context.activeOrganizationId, fulfillmentIds)
    : { rows: [] as FulfillmentShipmentRow[], errorMessage: null };

  if (shipments.errorMessage) {
    return queryErrorModel(context, shipments.errorMessage);
  }

  const orderLabels = orderLabelsVisible
    ? await loadOrderLabels(
        supabase,
        context.activeOrganizationId,
        items.map((item) => item.order_id)
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (orderLabels.errorMessage) {
    return queryErrorModel(context, orderLabels.errorMessage);
  }

  const variantLabels = productLabelsVisible
    ? await loadVariantLabels(
        supabase,
        context.activeOrganizationId,
        items.flatMap((item) => (item.variant_id ? [item.variant_id] : []))
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (variantLabels.errorMessage) {
    return queryErrorModel(context, variantLabels.errorMessage);
  }

  const fulfillmentLabels = mapFulfillmentLabels(fulfillments);
  const itemStats = mapFulfillmentItemStats(items);
  const fulfillmentSummaries = fulfillments.map((fulfillment) =>
    toFulfillmentSummary(fulfillment, itemStats)
  );
  const itemSummaries = items.map((item) =>
    toFulfillmentItemSummary(item, fulfillmentLabels, orderLabels.labels, variantLabels.labels)
  );
  const qcSessionSummaries = qcSessions.rows.map((session) =>
    toQcSessionSummary(session, fulfillmentLabels)
  );
  const shipmentSummaries = shipments.rows.map((shipment) =>
    toShipmentSummary(shipment, fulfillmentLabels)
  );

  return {
    context,
    state: "ready",
    metrics: {
      fulfillmentCount: fulfillmentSummaries.length,
      activeFulfillmentCount: fulfillmentSummaries.filter((fulfillment) =>
        isActiveFulfillmentStatus(fulfillment.status)
      ).length,
      itemCount: itemSummaries.length,
      totalQuantity: itemSummaries.reduce((total, item) => total + item.quantity, 0),
      qcSessionCount: qcSessionSummaries.length,
      shipmentCount: shipmentSummaries.length
    },
    fulfillments: fulfillmentSummaries,
    items: itemSummaries,
    qcSessions: qcSessionSummaries,
    shipments: shipmentSummaries,
    orderLabelsVisible,
    productLabelsVisible,
    qcSignalsVisible,
    shippingSignalsVisible,
    errorMessage: null
  };
}

async function loadQcSessions(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  fulfillmentIds: string[]
) {
  const { data, error } = await supabase
    .from("fulfillment_qc_sessions")
    .select("id, fulfillment_id, status, started_at, completed_at, failure_reason, created_at, updated_at")
    .eq("organization_id", organizationId)
    .in("fulfillment_id", nonEmptyIds(fulfillmentIds))
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return { rows: [] as FulfillmentQcSessionRow[], errorMessage: error.message };
  }

  return { rows: (data ?? []) as FulfillmentQcSessionRow[], errorMessage: null };
}

async function loadShipments(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  fulfillmentIds: string[]
) {
  const { data, error } = await supabase
    .from("shipments")
    .select(
      "id, fulfillment_id, shipment_number, tracking_number, shipping_method, status, package_count, shipped_at, delivered_at, created_at"
    )
    .eq("organization_id", organizationId)
    .in("fulfillment_id", nonEmptyIds(fulfillmentIds))
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return { rows: [] as FulfillmentShipmentRow[], errorMessage: error.message };
  }

  return { rows: (data ?? []) as FulfillmentShipmentRow[], errorMessage: null };
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

function mapFulfillmentLabels(rows: FulfillmentRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((fulfillment) => labels.set(fulfillment.id, fulfillment.fulfillment_number));
  return labels;
}

function mapFulfillmentItemStats(rows: FulfillmentItemRow[]) {
  const stats = new Map<string, { itemCount: number; totalQuantity: number }>();

  rows.forEach((item) => {
    const current = stats.get(item.fulfillment_id) ?? { itemCount: 0, totalQuantity: 0 };
    stats.set(item.fulfillment_id, {
      itemCount: current.itemCount + 1,
      totalQuantity: current.totalQuantity + toNumber(item.quantity)
    });
  });

  return stats;
}

function toFulfillmentSummary(
  fulfillment: FulfillmentRow,
  itemStats: Map<string, { itemCount: number; totalQuantity: number }>
): FulfillmentSummary {
  const stats = itemStats.get(fulfillment.id) ?? { itemCount: 0, totalQuantity: 0 };

  return {
    id: fulfillment.id,
    fulfillmentNumber: fulfillment.fulfillment_number,
    warehouseId: fulfillment.warehouse_id,
    consolidationId: fulfillment.consolidation_id,
    status: fulfillment.status,
    packedAt: fulfillment.packed_at,
    fulfilledAt: fulfillment.fulfilled_at,
    createdAt: fulfillment.created_at,
    updatedAt: fulfillment.updated_at,
    itemCount: stats.itemCount,
    totalQuantity: stats.totalQuantity
  };
}

function toFulfillmentItemSummary(
  item: FulfillmentItemRow,
  fulfillmentLabels: Map<string, string>,
  orderLabels: Map<string, string>,
  variantLabels: Map<string, string>
): FulfillmentItemSummary {
  return {
    id: item.id,
    fulfillmentId: item.fulfillment_id,
    fulfillmentNumber: fulfillmentLabels.get(item.fulfillment_id) ?? item.fulfillment_id,
    orderLabel: orderLabels.get(item.order_id) ?? item.order_id,
    variantLabel: item.variant_id ? variantLabels.get(item.variant_id) ?? item.variant_id : "-",
    quantity: toNumber(item.quantity),
    createdAt: item.created_at
  };
}

function toQcSessionSummary(
  session: FulfillmentQcSessionRow,
  fulfillmentLabels: Map<string, string>
): FulfillmentQcSessionSummary {
  return {
    id: session.id,
    fulfillmentId: session.fulfillment_id,
    fulfillmentNumber: fulfillmentLabels.get(session.fulfillment_id) ?? session.fulfillment_id,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    failureReason: session.failure_reason,
    createdAt: session.created_at,
    updatedAt: session.updated_at
  };
}

function toShipmentSummary(
  shipment: FulfillmentShipmentRow,
  fulfillmentLabels: Map<string, string>
): FulfillmentShipmentSummary {
  return {
    id: shipment.id,
    fulfillmentId: shipment.fulfillment_id,
    fulfillmentNumber: fulfillmentLabels.get(shipment.fulfillment_id) ?? shipment.fulfillment_id,
    shipmentNumber: shipment.shipment_number,
    trackingNumber: shipment.tracking_number,
    shippingMethod: shipment.shipping_method,
    status: shipment.status,
    packageCount: shipment.package_count,
    shippedAt: shipment.shipped_at,
    deliveredAt: shipment.delivered_at,
    createdAt: shipment.created_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: FulfillmentReadModelState
): FulfillmentReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    fulfillments: [],
    items: [],
    qcSessions: [],
    shipments: [],
    orderLabelsVisible: false,
    productLabelsVisible: false,
    qcSignalsVisible: false,
    shippingSignalsVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): FulfillmentReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    fulfillments: [],
    items: [],
    qcSessions: [],
    shipments: [],
    orderLabelsVisible: false,
    productLabelsVisible: false,
    qcSignalsVisible: false,
    shippingSignalsVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

function isActiveFulfillmentStatus(status: string) {
  return !["SHIPPED", "COMPLETED", "CANCELLED"].includes(status);
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

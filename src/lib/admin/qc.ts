import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type QcReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type QcReadModel = {
  context: AdminShellContext;
  state: QcReadModelState;
  metrics: QcReadMetrics;
  sessions: QcSessionSummary[];
  itemTotals: QcItemTotalSummary[];
  scans: QcScanSignalSummary[];
  fulfillmentLabelsVisible: boolean;
  productLabelsVisible: boolean;
  overrideVisible: boolean;
  errorMessage: string | null;
};

export type QcSessionSummary = {
  id: string;
  fulfillmentId: string;
  fulfillmentLabel: string;
  fulfillmentStatus: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  requiredQuantity: number;
  scannedQuantity: number;
  blockingItemCount: number;
};

export type QcItemTotalSummary = {
  id: string;
  qcSessionId: string;
  fulfillmentLabel: string;
  fulfillmentItemId: string;
  variantLabel: string;
  requiredQuantity: number;
  scannedQuantity: number;
  status: string;
  updatedAt: string;
};

export type QcScanSignalSummary = {
  id: string;
  qcSessionId: string;
  fulfillmentLabel: string;
  fulfillmentItemLabel: string;
  scanType: string;
  matched: boolean;
  quantityIncrement: number;
  errorCode: string | null;
  scannedAt: string;
};

type QcReadMetrics = {
  sessionCount: number;
  activeSessionCount: number;
  passedSessionCount: number;
  failedSessionCount: number;
  totalRequiredQuantity: number;
  totalScannedQuantity: number;
  blockingItemCount: number;
  rejectedScanCount: number;
};

type QcSessionRow = {
  id: string;
  fulfillment_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
};

type QcItemTotalRow = {
  id: string;
  qc_session_id: string;
  fulfillment_item_id: string;
  required_quantity: number | string;
  scanned_quantity: number | string;
  status: string;
  updated_at: string;
};

type QcScanRow = {
  id: string;
  qc_session_id: string;
  fulfillment_item_id: string | null;
  scan_type: string;
  matched: boolean;
  quantity_increment: number | string;
  scanned_at: string;
  error_code: string | null;
};

type FulfillmentLabelRow = {
  id: string;
  fulfillment_number: string;
  status: string;
};

type FulfillmentItemLabelRow = {
  id: string;
  fulfillment_id: string;
  variant_id: string | null;
  order_id: string;
  quantity: number | string;
};

type VariantLabelRow = {
  id: string;
  stock_code: string;
  variant_name: string;
};

const emptyMetrics: QcReadMetrics = {
  sessionCount: 0,
  activeSessionCount: 0,
  passedSessionCount: 0,
  failedSessionCount: 0,
  totalRequiredQuantity: 0,
  totalScannedQuantity: 0,
  blockingItemCount: 0,
  rejectedScanCount: 0
};

export async function getQcReadModel(): Promise<QcReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("warehouse.qc")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: sessionError } = await supabase
    .from("fulfillment_qc_sessions")
    .select("id, fulfillment_id, status, started_at, completed_at, failure_reason, created_at, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(75);

  if (sessionError) {
    return queryErrorModel(context, sessionError.message);
  }

  const sessions = (sessionData ?? []) as QcSessionRow[];
  const sessionIds = sessions.map((session) => session.id);
  const { data: itemTotalData, error: itemTotalError } = await supabase
    .from("fulfillment_qc_item_totals")
    .select("id, qc_session_id, fulfillment_item_id, required_quantity, scanned_quantity, status, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("qc_session_id", nonEmptyIds(sessionIds))
    .order("updated_at", { ascending: false })
    .limit(200);

  if (itemTotalError) {
    return queryErrorModel(context, itemTotalError.message);
  }

  const { data: scanData, error: scanError } = await supabase
    .from("fulfillment_qc_scans")
    .select("id, qc_session_id, fulfillment_item_id, scan_type, matched, quantity_increment, scanned_at, error_code")
    .eq("organization_id", context.activeOrganizationId)
    .in("qc_session_id", nonEmptyIds(sessionIds))
    .order("scanned_at", { ascending: false })
    .limit(100);

  if (scanError) {
    return queryErrorModel(context, scanError.message);
  }

  const itemTotals = (itemTotalData ?? []) as QcItemTotalRow[];
  const scans = (scanData ?? []) as QcScanRow[];
  const fulfillmentLabelsVisible = context.permissions.includes("warehouse.pick");
  const productLabelsVisible = context.permissions.includes("product.view");
  const overrideVisible = context.permissions.includes("warehouse.qc.override");

  const fulfillmentLabels = fulfillmentLabelsVisible
    ? await loadFulfillmentLabels(
        supabase,
        context.activeOrganizationId,
        sessions.map((session) => session.fulfillment_id)
      )
    : { labels: new Map<string, string>(), statuses: new Map<string, string>(), errorMessage: null };

  if (fulfillmentLabels.errorMessage) {
    return queryErrorModel(context, fulfillmentLabels.errorMessage);
  }

  const fulfillmentItems = fulfillmentLabelsVisible
    ? await loadFulfillmentItemLabels(
        supabase,
        context.activeOrganizationId,
        itemTotals.map((total) => total.fulfillment_item_id).concat(
          scans.flatMap((scan) => (scan.fulfillment_item_id ? [scan.fulfillment_item_id] : []))
        )
      )
    : { rows: [] as FulfillmentItemLabelRow[], errorMessage: null };

  if (fulfillmentItems.errorMessage) {
    return queryErrorModel(context, fulfillmentItems.errorMessage);
  }

  const variantLabels = productLabelsVisible
    ? await loadVariantLabels(
        supabase,
        context.activeOrganizationId,
        fulfillmentItems.rows.flatMap((item) => (item.variant_id ? [item.variant_id] : []))
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (variantLabels.errorMessage) {
    return queryErrorModel(context, variantLabels.errorMessage);
  }

  const sessionFulfillmentIds = mapSessionFulfillmentIds(sessions);
  const itemStats = mapSessionItemStats(itemTotals);
  const fulfillmentItemLabels = mapFulfillmentItemLabels(fulfillmentItems.rows, variantLabels.labels);
  const sessionSummaries = sessions.map((session) =>
    toSessionSummary(session, fulfillmentLabels.labels, fulfillmentLabels.statuses, itemStats)
  );
  const itemTotalSummaries = itemTotals.map((itemTotal) =>
    toItemTotalSummary(
      itemTotal,
      sessionFulfillmentIds,
      fulfillmentLabels.labels,
      fulfillmentItemLabels
    )
  );
  const scanSummaries = scans.map((scan) =>
    toScanSignalSummary(
      scan,
      sessionFulfillmentIds,
      fulfillmentLabels.labels,
      fulfillmentItemLabels
    )
  );

  return {
    context,
    state: "ready",
    metrics: {
      sessionCount: sessionSummaries.length,
      activeSessionCount: sessionSummaries.filter((session) =>
        ["PENDING", "IN_PROGRESS"].includes(session.status)
      ).length,
      passedSessionCount: sessionSummaries.filter((session) => session.status === "PASSED").length,
      failedSessionCount: sessionSummaries.filter((session) => session.status === "FAILED").length,
      totalRequiredQuantity: itemTotalSummaries.reduce(
        (total, item) => total + item.requiredQuantity,
        0
      ),
      totalScannedQuantity: itemTotalSummaries.reduce(
        (total, item) => total + item.scannedQuantity,
        0
      ),
      blockingItemCount: itemTotalSummaries.filter((item) => item.status !== "PASSED").length,
      rejectedScanCount: scanSummaries.filter((scan) => !scan.matched).length
    },
    sessions: sessionSummaries,
    itemTotals: itemTotalSummaries,
    scans: scanSummaries,
    fulfillmentLabelsVisible,
    productLabelsVisible,
    overrideVisible,
    errorMessage: null
  };
}

async function loadFulfillmentLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  fulfillmentIds: string[]
) {
  const uniqueFulfillmentIds = Array.from(new Set(fulfillmentIds));

  if (uniqueFulfillmentIds.length === 0) {
    return { labels: new Map<string, string>(), statuses: new Map<string, string>(), errorMessage: null };
  }

  const { data, error } = await supabase
    .from("fulfillments")
    .select("id, fulfillment_number, status")
    .eq("organization_id", organizationId)
    .in("id", uniqueFulfillmentIds)
    .limit(100);

  if (error) {
    return { labels: new Map<string, string>(), statuses: new Map<string, string>(), errorMessage: error.message };
  }

  const labels = new Map<string, string>();
  const statuses = new Map<string, string>();
  ((data ?? []) as FulfillmentLabelRow[]).forEach((fulfillment) => {
    labels.set(fulfillment.id, fulfillment.fulfillment_number);
    statuses.set(fulfillment.id, fulfillment.status);
  });

  return { labels, statuses, errorMessage: null };
}

async function loadFulfillmentItemLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  fulfillmentItemIds: string[]
) {
  const uniqueItemIds = Array.from(new Set(fulfillmentItemIds));

  if (uniqueItemIds.length === 0) {
    return { rows: [] as FulfillmentItemLabelRow[], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("fulfillment_items")
    .select("id, fulfillment_id, variant_id, order_id, quantity")
    .eq("organization_id", organizationId)
    .in("id", uniqueItemIds)
    .limit(200);

  if (error) {
    return { rows: [] as FulfillmentItemLabelRow[], errorMessage: error.message };
  }

  return { rows: (data ?? []) as FulfillmentItemLabelRow[], errorMessage: null };
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
    .limit(200);

  if (error) {
    return { labels: new Map<string, string>(), errorMessage: error.message };
  }

  const labels = new Map<string, string>();
  ((data ?? []) as VariantLabelRow[]).forEach((variant) =>
    labels.set(variant.id, `${variant.stock_code} / ${variant.variant_name}`)
  );
  return { labels, errorMessage: null };
}

function mapSessionFulfillmentIds(rows: QcSessionRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((session) => labels.set(session.id, session.fulfillment_id));
  return labels;
}

function mapSessionItemStats(rows: QcItemTotalRow[]) {
  const stats = new Map<
    string,
    { requiredQuantity: number; scannedQuantity: number; blockingItemCount: number }
  >();

  rows.forEach((itemTotal) => {
    const current = stats.get(itemTotal.qc_session_id) ?? {
      requiredQuantity: 0,
      scannedQuantity: 0,
      blockingItemCount: 0
    };
    stats.set(itemTotal.qc_session_id, {
      requiredQuantity: current.requiredQuantity + toNumber(itemTotal.required_quantity),
      scannedQuantity: current.scannedQuantity + toNumber(itemTotal.scanned_quantity),
      blockingItemCount:
        current.blockingItemCount + (itemTotal.status === "PASSED" ? 0 : 1)
    });
  });

  return stats;
}

function mapFulfillmentItemLabels(
  rows: FulfillmentItemLabelRow[],
  variantLabels: Map<string, string>
) {
  const labels = new Map<string, string>();
  rows.forEach((item) => {
    const variantLabel = item.variant_id ? variantLabels.get(item.variant_id) ?? item.variant_id : "-";
    labels.set(item.id, `${variantLabel} x ${toNumber(item.quantity)}`);
  });
  return labels;
}

function toSessionSummary(
  session: QcSessionRow,
  fulfillmentLabels: Map<string, string>,
  fulfillmentStatuses: Map<string, string>,
  itemStats: Map<string, { requiredQuantity: number; scannedQuantity: number; blockingItemCount: number }>
): QcSessionSummary {
  const stats = itemStats.get(session.id) ?? {
    requiredQuantity: 0,
    scannedQuantity: 0,
    blockingItemCount: 0
  };

  return {
    id: session.id,
    fulfillmentId: session.fulfillment_id,
    fulfillmentLabel: fulfillmentLabels.get(session.fulfillment_id) ?? session.fulfillment_id,
    fulfillmentStatus: fulfillmentStatuses.get(session.fulfillment_id) ?? null,
    status: session.status,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    failureReason: session.failure_reason,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    requiredQuantity: stats.requiredQuantity,
    scannedQuantity: stats.scannedQuantity,
    blockingItemCount: stats.blockingItemCount
  };
}

function toItemTotalSummary(
  itemTotal: QcItemTotalRow,
  sessionFulfillmentIds: Map<string, string>,
  fulfillmentLabels: Map<string, string>,
  fulfillmentItemLabels: Map<string, string>
): QcItemTotalSummary {
  const fulfillmentId = sessionFulfillmentIds.get(itemTotal.qc_session_id);

  return {
    id: itemTotal.id,
    qcSessionId: itemTotal.qc_session_id,
    fulfillmentLabel: fulfillmentId ? fulfillmentLabels.get(fulfillmentId) ?? fulfillmentId : itemTotal.qc_session_id,
    fulfillmentItemId: itemTotal.fulfillment_item_id,
    variantLabel: fulfillmentItemLabels.get(itemTotal.fulfillment_item_id) ?? itemTotal.fulfillment_item_id,
    requiredQuantity: toNumber(itemTotal.required_quantity),
    scannedQuantity: toNumber(itemTotal.scanned_quantity),
    status: itemTotal.status,
    updatedAt: itemTotal.updated_at
  };
}

function toScanSignalSummary(
  scan: QcScanRow,
  sessionFulfillmentIds: Map<string, string>,
  fulfillmentLabels: Map<string, string>,
  fulfillmentItemLabels: Map<string, string>
): QcScanSignalSummary {
  const fulfillmentId = sessionFulfillmentIds.get(scan.qc_session_id);

  return {
    id: scan.id,
    qcSessionId: scan.qc_session_id,
    fulfillmentLabel: fulfillmentId ? fulfillmentLabels.get(fulfillmentId) ?? fulfillmentId : scan.qc_session_id,
    fulfillmentItemLabel: scan.fulfillment_item_id
      ? fulfillmentItemLabels.get(scan.fulfillment_item_id) ?? scan.fulfillment_item_id
      : "-",
    scanType: scan.scan_type,
    matched: scan.matched,
    quantityIncrement: toNumber(scan.quantity_increment),
    errorCode: scan.error_code,
    scannedAt: scan.scanned_at
  };
}

function emptyModel(context: AdminShellContext, state: QcReadModelState): QcReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    sessions: [],
    itemTotals: [],
    scans: [],
    fulfillmentLabelsVisible: false,
    productLabelsVisible: false,
    overrideVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(context: AdminShellContext, errorMessage: string): QcReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    sessions: [],
    itemTotals: [],
    scans: [],
    fulfillmentLabelsVisible: false,
    productLabelsVisible: false,
    overrideVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

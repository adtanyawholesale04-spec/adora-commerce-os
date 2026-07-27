import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ShippingReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type ShippingReadModel = {
  context: AdminShellContext;
  state: ShippingReadModelState;
  metrics: ShippingReadMetrics;
  shipments: ShippingShipmentSummary[];
  packages: ShippingPackageSummary[];
  packageItems: ShippingPackageItemSummary[];
  trackingEvents: ShippingTrackingEventSummary[];
  providers: ShippingProviderSummary[];
  fulfillmentLabelsVisible: boolean;
  packageItemLabelsVisible: boolean;
  qcSignalsVisible: boolean;
  printLabelVisible: boolean;
  errorMessage: string | null;
};

export type ShippingShipmentSummary = {
  id: string;
  fulfillmentId: string;
  fulfillmentLabel: string;
  fulfillmentStatus: string | null;
  providerLabel: string;
  shipmentNumber: string;
  trackingNumber: string | null;
  shippingMethod: string | null;
  status: string;
  packageCount: number;
  actualWeightGrams: number | null;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  qcStatus: string | null;
};

export type ShippingPackageSummary = {
  id: string;
  shipmentId: string;
  shipmentNumber: string;
  packageNumber: number;
  weightGrams: number | null;
  dimensionsLabel: string;
  trackingNumber: string | null;
  createdAt: string;
};

export type ShippingPackageItemSummary = {
  id: string;
  packageId: string;
  shipmentNumber: string;
  packageNumber: number | null;
  fulfillmentItemLabel: string;
  quantity: number;
  createdAt: string;
};

export type ShippingTrackingEventSummary = {
  id: string;
  shipmentId: string;
  shipmentNumber: string;
  eventCode: string;
  eventDescription: string | null;
  eventAt: string;
  createdAt: string;
};

export type ShippingProviderSummary = {
  id: string;
  providerCode: string;
  name: string;
  status: string;
  shipmentCount: number;
};

type ShippingReadMetrics = {
  shipmentCount: number;
  readyForHandoffCount: number;
  inTransitCount: number;
  deliveredCount: number;
  exceptionCount: number;
  packageCount: number;
  trackingEventCount: number;
};

type ShipmentRow = {
  id: string;
  fulfillment_id: string;
  shipping_provider_id: string | null;
  shipment_number: string;
  tracking_number: string | null;
  shipping_method: string | null;
  status: string;
  package_count: number;
  actual_weight_grams: number | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
};

type PackageRow = {
  id: string;
  shipment_id: string;
  package_number: number;
  weight_grams: number | null;
  width_cm: number | string | null;
  length_cm: number | string | null;
  height_cm: number | string | null;
  tracking_number: string | null;
  created_at: string;
};

type PackageItemRow = {
  id: string;
  package_id: string;
  fulfillment_item_id: string;
  quantity: number | string;
  created_at: string;
};

type TrackingEventRow = {
  id: string;
  shipment_id: string;
  event_code: string;
  event_description: string | null;
  event_at: string;
  created_at: string;
};

type ProviderRow = {
  id: string;
  provider_code: string;
  name: string;
  status: string;
};

type FulfillmentLabelRow = {
  id: string;
  fulfillment_number: string;
  status: string;
};

type FulfillmentItemLabelRow = {
  id: string;
  variant_id: string | null;
  quantity: number | string;
};

type VariantLabelRow = {
  id: string;
  stock_code: string;
  variant_name: string;
};

type QcSessionRow = {
  id: string;
  fulfillment_id: string;
  status: string;
  completed_at: string | null;
  updated_at: string;
};

const emptyMetrics: ShippingReadMetrics = {
  shipmentCount: 0,
  readyForHandoffCount: 0,
  inTransitCount: 0,
  deliveredCount: 0,
  exceptionCount: 0,
  packageCount: 0,
  trackingEventCount: 0
};

export async function getShippingReadModel(): Promise<ShippingReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("shipping.create")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: shipmentData, error: shipmentError } = await supabase
    .from("shipments")
    .select(
      "id, fulfillment_id, shipping_provider_id, shipment_number, tracking_number, shipping_method, status, package_count, actual_weight_grams, created_at, shipped_at, delivered_at, cancelled_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("created_at", { ascending: false })
    .limit(75);

  if (shipmentError) {
    return queryErrorModel(context, shipmentError.message);
  }

  const shipments = (shipmentData ?? []) as ShipmentRow[];
  const shipmentIds = shipments.map((shipment) => shipment.id);
  const { data: packageData, error: packageError } = await supabase
    .from("shipment_packages")
    .select(
      "id, shipment_id, package_number, weight_grams, width_cm, length_cm, height_cm, tracking_number, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("shipment_id", nonEmptyIds(shipmentIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (packageError) {
    return queryErrorModel(context, packageError.message);
  }

  const packages = (packageData ?? []) as PackageRow[];
  const packageIds = packages.map((shipmentPackage) => shipmentPackage.id);
  const { data: packageItemData, error: packageItemError } = await supabase
    .from("shipment_package_items")
    .select("id, package_id, fulfillment_item_id, quantity, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("package_id", nonEmptyIds(packageIds))
    .order("created_at", { ascending: false })
    .limit(200);

  if (packageItemError) {
    return queryErrorModel(context, packageItemError.message);
  }

  const { data: trackingData, error: trackingError } = await supabase
    .from("tracking_events")
    .select("id, shipment_id, event_code, event_description, event_at, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("shipment_id", nonEmptyIds(shipmentIds))
    .order("event_at", { ascending: false })
    .limit(100);

  if (trackingError) {
    return queryErrorModel(context, trackingError.message);
  }

  const providerIds = shipments.flatMap((shipment) =>
    shipment.shipping_provider_id ? [shipment.shipping_provider_id] : []
  );
  const providers = await loadProviders(supabase, context.activeOrganizationId, providerIds);

  if (providers.errorMessage) {
    return queryErrorModel(context, providers.errorMessage);
  }

  const fulfillmentLabelsVisible = context.permissions.includes("warehouse.pick");
  const packageItemLabelsVisible = context.permissions.includes("warehouse.pick");
  const qcSignalsVisible = context.permissions.includes("warehouse.qc");
  const printLabelVisible = context.permissions.includes("shipping.print_label");

  const fulfillmentLabels = fulfillmentLabelsVisible
    ? await loadFulfillmentLabels(
        supabase,
        context.activeOrganizationId,
        shipments.map((shipment) => shipment.fulfillment_id)
      )
    : { labels: new Map<string, string>(), statuses: new Map<string, string>(), errorMessage: null };

  if (fulfillmentLabels.errorMessage) {
    return queryErrorModel(context, fulfillmentLabels.errorMessage);
  }

  const fulfillmentItems = packageItemLabelsVisible
    ? await loadFulfillmentItemLabels(
        supabase,
        context.activeOrganizationId,
        ((packageItemData ?? []) as PackageItemRow[]).map((item) => item.fulfillment_item_id)
      )
    : { rows: [] as FulfillmentItemLabelRow[], errorMessage: null };

  if (fulfillmentItems.errorMessage) {
    return queryErrorModel(context, fulfillmentItems.errorMessage);
  }

  const variantLabels = context.permissions.includes("product.view")
    ? await loadVariantLabels(
        supabase,
        context.activeOrganizationId,
        fulfillmentItems.rows.flatMap((item) => (item.variant_id ? [item.variant_id] : []))
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (variantLabels.errorMessage) {
    return queryErrorModel(context, variantLabels.errorMessage);
  }

  const qcSessions = qcSignalsVisible
    ? await loadQcSessions(
        supabase,
        context.activeOrganizationId,
        shipments.map((shipment) => shipment.fulfillment_id)
      )
    : { rows: [] as QcSessionRow[], errorMessage: null };

  if (qcSessions.errorMessage) {
    return queryErrorModel(context, qcSessions.errorMessage);
  }

  const packageItems = (packageItemData ?? []) as PackageItemRow[];
  const trackingEvents = (trackingData ?? []) as TrackingEventRow[];
  const shipmentLabels = mapShipmentLabels(shipments);
  const packageLabels = mapPackageLabels(packages, shipmentLabels);
  const providerLabels = mapProviderLabels(providers.rows);
  const providerCounts = mapProviderShipmentCounts(shipments);
  const fulfillmentItemLabels = mapFulfillmentItemLabels(fulfillmentItems.rows, variantLabels.labels);
  const qcStatuses = mapLatestQcStatus(qcSessions.rows);
  const shipmentSummaries = shipments.map((shipment) =>
    toShipmentSummary(
      shipment,
      fulfillmentLabels.labels,
      fulfillmentLabels.statuses,
      providerLabels,
      qcStatuses
    )
  );
  const packageSummaries = packages.map((shipmentPackage) =>
    toPackageSummary(shipmentPackage, shipmentLabels)
  );
  const packageItemSummaries = packageItems.map((item) =>
    toPackageItemSummary(item, packageLabels, fulfillmentItemLabels)
  );
  const trackingSummaries = trackingEvents.map((event) =>
    toTrackingEventSummary(event, shipmentLabels)
  );
  const providerSummaries = providers.rows.map((provider) => ({
    id: provider.id,
    providerCode: provider.provider_code,
    name: provider.name,
    status: provider.status,
    shipmentCount: providerCounts.get(provider.id) ?? 0
  }));

  return {
    context,
    state: "ready",
    metrics: {
      shipmentCount: shipmentSummaries.length,
      readyForHandoffCount: shipmentSummaries.filter(
        (shipment) => shipment.status === "READY_FOR_HANDOFF"
      ).length,
      inTransitCount: shipmentSummaries.filter((shipment) => shipment.status === "IN_TRANSIT").length,
      deliveredCount: shipmentSummaries.filter((shipment) => shipment.status === "DELIVERED").length,
      exceptionCount: shipmentSummaries.filter((shipment) =>
        ["EXCEPTION", "RTO", "CANCELLED"].includes(shipment.status)
      ).length,
      packageCount: shipmentSummaries.reduce((total, shipment) => total + shipment.packageCount, 0),
      trackingEventCount: trackingSummaries.length
    },
    shipments: shipmentSummaries,
    packages: packageSummaries,
    packageItems: packageItemSummaries,
    trackingEvents: trackingSummaries,
    providers: providerSummaries,
    fulfillmentLabelsVisible,
    packageItemLabelsVisible,
    qcSignalsVisible,
    printLabelVisible,
    errorMessage: null
  };
}

async function loadProviders(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  providerIds: string[]
) {
  const uniqueProviderIds = Array.from(new Set(providerIds));

  if (uniqueProviderIds.length === 0) {
    return { rows: [] as ProviderRow[], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("shipping_providers")
    .select("id, provider_code, name, status")
    .eq("organization_id", organizationId)
    .in("id", uniqueProviderIds)
    .limit(100);

  if (error) {
    return { rows: [] as ProviderRow[], errorMessage: error.message };
  }

  return { rows: (data ?? []) as ProviderRow[], errorMessage: null };
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
    .select("id, variant_id, quantity")
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

async function loadQcSessions(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  fulfillmentIds: string[]
) {
  const uniqueFulfillmentIds = Array.from(new Set(fulfillmentIds));

  if (uniqueFulfillmentIds.length === 0) {
    return { rows: [] as QcSessionRow[], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("fulfillment_qc_sessions")
    .select("id, fulfillment_id, status, completed_at, updated_at")
    .eq("organization_id", organizationId)
    .in("fulfillment_id", uniqueFulfillmentIds)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return { rows: [] as QcSessionRow[], errorMessage: error.message };
  }

  return { rows: (data ?? []) as QcSessionRow[], errorMessage: null };
}

function mapShipmentLabels(rows: ShipmentRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((shipment) => labels.set(shipment.id, shipment.shipment_number));
  return labels;
}

function mapPackageLabels(rows: PackageRow[], shipmentLabels: Map<string, string>) {
  const labels = new Map<string, { shipmentNumber: string; packageNumber: number }>();
  rows.forEach((shipmentPackage) => {
    labels.set(shipmentPackage.id, {
      shipmentNumber: shipmentLabels.get(shipmentPackage.shipment_id) ?? shipmentPackage.shipment_id,
      packageNumber: shipmentPackage.package_number
    });
  });
  return labels;
}

function mapProviderLabels(rows: ProviderRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((provider) => labels.set(provider.id, `${provider.name} / ${provider.provider_code}`));
  return labels;
}

function mapProviderShipmentCounts(rows: ShipmentRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((shipment) => {
    if (shipment.shipping_provider_id) {
      counts.set(shipment.shipping_provider_id, (counts.get(shipment.shipping_provider_id) ?? 0) + 1);
    }
  });
  return counts;
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

function mapLatestQcStatus(rows: QcSessionRow[]) {
  const statuses = new Map<string, string>();
  rows.forEach((session) => {
    if (!statuses.has(session.fulfillment_id)) {
      statuses.set(session.fulfillment_id, session.status);
    }
  });
  return statuses;
}

function toShipmentSummary(
  shipment: ShipmentRow,
  fulfillmentLabels: Map<string, string>,
  fulfillmentStatuses: Map<string, string>,
  providerLabels: Map<string, string>,
  qcStatuses: Map<string, string>
): ShippingShipmentSummary {
  return {
    id: shipment.id,
    fulfillmentId: shipment.fulfillment_id,
    fulfillmentLabel: fulfillmentLabels.get(shipment.fulfillment_id) ?? shipment.fulfillment_id,
    fulfillmentStatus: fulfillmentStatuses.get(shipment.fulfillment_id) ?? null,
    providerLabel: shipment.shipping_provider_id
      ? providerLabels.get(shipment.shipping_provider_id) ?? shipment.shipping_provider_id
      : "-",
    shipmentNumber: shipment.shipment_number,
    trackingNumber: shipment.tracking_number,
    shippingMethod: shipment.shipping_method,
    status: shipment.status,
    packageCount: shipment.package_count,
    actualWeightGrams: shipment.actual_weight_grams,
    createdAt: shipment.created_at,
    shippedAt: shipment.shipped_at,
    deliveredAt: shipment.delivered_at,
    cancelledAt: shipment.cancelled_at,
    qcStatus: qcStatuses.get(shipment.fulfillment_id) ?? null
  };
}

function toPackageSummary(
  shipmentPackage: PackageRow,
  shipmentLabels: Map<string, string>
): ShippingPackageSummary {
  return {
    id: shipmentPackage.id,
    shipmentId: shipmentPackage.shipment_id,
    shipmentNumber: shipmentLabels.get(shipmentPackage.shipment_id) ?? shipmentPackage.shipment_id,
    packageNumber: shipmentPackage.package_number,
    weightGrams: shipmentPackage.weight_grams,
    dimensionsLabel: formatDimensions(shipmentPackage),
    trackingNumber: shipmentPackage.tracking_number,
    createdAt: shipmentPackage.created_at
  };
}

function toPackageItemSummary(
  item: PackageItemRow,
  packageLabels: Map<string, { shipmentNumber: string; packageNumber: number }>,
  fulfillmentItemLabels: Map<string, string>
): ShippingPackageItemSummary {
  const packageLabel = packageLabels.get(item.package_id);

  return {
    id: item.id,
    packageId: item.package_id,
    shipmentNumber: packageLabel?.shipmentNumber ?? item.package_id,
    packageNumber: packageLabel?.packageNumber ?? null,
    fulfillmentItemLabel: fulfillmentItemLabels.get(item.fulfillment_item_id) ?? item.fulfillment_item_id,
    quantity: toNumber(item.quantity),
    createdAt: item.created_at
  };
}

function toTrackingEventSummary(
  event: TrackingEventRow,
  shipmentLabels: Map<string, string>
): ShippingTrackingEventSummary {
  return {
    id: event.id,
    shipmentId: event.shipment_id,
    shipmentNumber: shipmentLabels.get(event.shipment_id) ?? event.shipment_id,
    eventCode: event.event_code,
    eventDescription: event.event_description,
    eventAt: event.event_at,
    createdAt: event.created_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: ShippingReadModelState
): ShippingReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    shipments: [],
    packages: [],
    packageItems: [],
    trackingEvents: [],
    providers: [],
    fulfillmentLabelsVisible: false,
    packageItemLabelsVisible: false,
    qcSignalsVisible: false,
    printLabelVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): ShippingReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    shipments: [],
    packages: [],
    packageItems: [],
    trackingEvents: [],
    providers: [],
    fulfillmentLabelsVisible: false,
    packageItemLabelsVisible: false,
    qcSignalsVisible: false,
    printLabelVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

function formatDimensions(row: PackageRow) {
  const dimensions = [row.length_cm, row.width_cm, row.height_cm]
    .map((value) => (value == null ? null : toNumber(value)))
    .filter((value): value is number => value != null);

  if (dimensions.length !== 3) {
    return "-";
  }

  return dimensions.map((value) => value.toString()).join(" x ");
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

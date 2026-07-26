export type JsonObject = Record<string, unknown>;

export type ShipmentStatus = "IN_TRANSIT" | "DELIVERED" | "EXCEPTION" | "RTO" | "CANCELLED";

export type NormalizedCarrierEvent = {
  organizationId: string;
  shipmentId?: string;
  trackingNumber?: string;
  providerCode: string;
  idempotencyKey: string;
  externalEventId?: string;
  eventCode: string;
  eventDescription: string;
  eventAt: string;
  shipmentStatus?: ShipmentStatus;
};

type AdapterContext = {
  req: Request;
  providerCode: string;
};

type ProviderAdapter = (payload: JsonObject, context: AdapterContext) => NormalizedCarrierEvent;

const providerAdapters: Record<string, ProviderAdapter> = {
  flash: adaptFlashEvent,
  kerry: adaptKerryEvent,
  jandt: adaptJandtEvent,
  thailand_post: adaptThailandPostEvent,
};

export function normalizeCarrierEvent(
  providerCode: string,
  payload: JsonObject,
  req: Request,
): NormalizedCarrierEvent {
  const normalizedProvider = normalizeKey(providerCode);
  const adapter = providerAdapters[normalizedProvider] ?? adaptGenericEvent;

  return adapter(payload, { req, providerCode: normalizedProvider });
}

export function readString(payload: JsonObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = readPath(payload, key);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function adaptGenericEvent(payload: JsonObject, context: AdapterContext): NormalizedCarrierEvent {
  const statusText = normalizeKey(
    readString(payload, [
      "shipment_status",
      "status",
      "status_code",
      "state",
      "logistics_status",
      "event_code",
    ]) ?? "",
  );
  const eventCode = readString(payload, ["event_code", "code", "status_code", "state"]) ??
    (statusText || "TRACKING_EVENT");

  return buildEvent(payload, context, {
    eventCode,
    statusText,
    eventDescription: readString(payload, [
      "event_description",
      "description",
      "status_description",
      "message",
      "remark",
    ]),
    eventAt: readString(payload, ["event_at", "timestamp", "occurred_at", "status_at"]),
    externalEventId: readString(payload, ["external_event_id", "event_id", "tracking_event_id"]),
    trackingNumber: readString(payload, [
      "tracking_number",
      "tracking_no",
      "awb",
      "awb_no",
      "waybill",
    ]),
  });
}

function adaptFlashEvent(payload: JsonObject, context: AdapterContext): NormalizedCarrierEvent {
  const statusText = normalizeKey(
    readString(payload, [
      "data.status",
      "data.status_code",
      "status",
      "status_code",
      "logistics_status",
    ]) ?? "",
  );
  const eventCode = readString(payload, [
    "data.event_code",
    "data.status_code",
    "event_code",
    "status_code",
  ]) ?? "FLASH_TRACKING_EVENT";

  return buildEvent(payload, context, {
    eventCode,
    statusText,
    eventDescription: readString(payload, [
      "data.description",
      "data.status_desc",
      "description",
      "status_description",
      "message",
    ]),
    eventAt: readString(payload, ["data.event_time", "data.timestamp", "event_at", "timestamp"]),
    externalEventId: readString(payload, ["data.event_id", "event_id", "external_event_id"]),
    trackingNumber: readString(payload, [
      "data.tracking_number",
      "data.tracking_no",
      "tracking_number",
      "tracking_no",
      "awb",
    ]),
  });
}

function adaptKerryEvent(payload: JsonObject, context: AdapterContext): NormalizedCarrierEvent {
  const statusText = normalizeKey(
    readString(payload, [
      "event.status_code",
      "event.status",
      "status_code",
      "status",
    ]) ?? "",
  );
  const eventCode = readString(payload, [
    "event.event_code",
    "event.status_code",
    "event.code",
    "status_code",
  ]) ?? "KERRY_TRACKING_EVENT";

  return buildEvent(payload, context, {
    eventCode,
    statusText,
    eventDescription: readString(payload, [
      "event.description",
      "event.status_description",
      "description",
      "message",
    ]),
    eventAt: readString(payload, [
      "event.event_at",
      "event.timestamp",
      "event_time",
      "timestamp",
    ]),
    externalEventId: readString(payload, ["event.id", "event.event_id", "event_id"]),
    trackingNumber: readString(payload, [
      "shipment.tracking_number",
      "shipment.consignment_no",
      "tracking_number",
      "consignment_no",
    ]),
  });
}

function adaptJandtEvent(payload: JsonObject, context: AdapterContext): NormalizedCarrierEvent {
  const statusText = normalizeKey(
    readString(payload, [
      "trace.status",
      "trace.status_code",
      "status",
      "status_code",
    ]) ?? "",
  );
  const eventCode = readString(payload, [
    "trace.event_code",
    "trace.status_code",
    "event_code",
    "status_code",
  ]) ?? "JANDT_TRACKING_EVENT";

  return buildEvent(payload, context, {
    eventCode,
    statusText,
    eventDescription: readString(payload, [
      "trace.description",
      "trace.remark",
      "description",
      "remark",
    ]),
    eventAt: readString(payload, [
      "trace.scan_time",
      "trace.event_at",
      "scan_time",
      "event_at",
    ]),
    externalEventId: readString(payload, ["trace.id", "trace.event_id", "event_id"]),
    trackingNumber: readString(payload, [
      "bill_code",
      "waybill",
      "tracking_number",
      "tracking_no",
    ]),
  });
}

function adaptThailandPostEvent(payload: JsonObject, context: AdapterContext): NormalizedCarrierEvent {
  const statusText = normalizeKey(
    readString(payload, [
      "track.status",
      "track.status_code",
      "status",
      "status_code",
    ]) ?? "",
  );
  const eventCode = readString(payload, [
    "track.event_code",
    "track.status",
    "event_code",
    "status_code",
  ]) ?? "THAILAND_POST_TRACKING_EVENT";

  return buildEvent(payload, context, {
    eventCode,
    statusText,
    eventDescription: readString(payload, [
      "track.description",
      "track.status_description",
      "description",
      "message",
    ]),
    eventAt: readString(payload, [
      "track.status_date",
      "track.event_at",
      "status_date",
      "event_at",
    ]),
    externalEventId: readString(payload, ["track.event_id", "event_id", "external_event_id"]),
    trackingNumber: readString(payload, [
      "barcode",
      "track.barcode",
      "tracking_number",
      "tracking_no",
    ]),
  });
}

function buildEvent(
  payload: JsonObject,
  context: AdapterContext,
  event: {
    eventCode: string;
    statusText: string;
    eventDescription?: string;
    eventAt?: string;
    externalEventId?: string;
    trackingNumber?: string;
  },
): NormalizedCarrierEvent {
  const shipmentId = readString(payload, ["shipment_id", "data.shipment_id", "shipment.id"]);
  const trackingNumber = event.trackingNumber;

  return {
    organizationId: readString(payload, ["organization_id", "org_id", "data.organization_id"]) ??
      context.req.headers.get("x-organization-id") ??
      "",
    shipmentId,
    trackingNumber,
    providerCode: context.providerCode,
    idempotencyKey: context.req.headers.get("idempotency-key") ??
      context.req.headers.get("x-idempotency-key") ??
      event.externalEventId ??
      readString(payload, ["idempotency_key", "event_id", "external_event_id", "tracking_event_id"]) ??
      `${context.providerCode}:${event.eventCode}:${trackingNumber ?? shipmentId ?? "unknown"}:${event.eventAt ?? ""}`,
    externalEventId: event.externalEventId,
    eventCode: event.eventCode,
    eventDescription: event.eventDescription ?? event.eventCode,
    eventAt: event.eventAt ?? new Date().toISOString(),
    shipmentStatus: mapShipmentStatus(context.providerCode, event.statusText),
  };
}

function mapShipmentStatus(providerCode: string, statusText: string): ShipmentStatus | undefined {
  const commonDelivered = ["DELIVERED", "DELIVERY_SUCCESS", "SUCCESS", "SIGNED", "RECEIVED"];
  const commonTransit = ["PICKED_UP", "PICKUP", "IN_TRANSIT", "TRANSIT", "SHIPPED", "ON_ROUTE"];
  const commonException = ["EXCEPTION", "FAILED", "DAMAGED", "LOST", "DELAYED", "HOLD"];
  const commonRto = ["RTO", "RETURN", "RETURNED", "RETURN_TO_SENDER"];
  const commonCancelled = ["CANCELLED", "CANCELED", "VOID"];

  const providerAliases: Record<string, Record<string, ShipmentStatus>> = {
    flash: {
      "1": "IN_TRANSIT",
      "2": "IN_TRANSIT",
      "3": "DELIVERED",
      "4": "EXCEPTION",
      "5": "RTO",
      delivering: "IN_TRANSIT",
      delivered: "DELIVERED",
      problem: "EXCEPTION",
      return: "RTO",
    },
    kerry: {
      pod: "DELIVERED",
      del: "DELIVERED",
      delivered: "DELIVERED",
      ofd: "IN_TRANSIT",
      rcv: "IN_TRANSIT",
      pickup: "IN_TRANSIT",
      rts: "RTO",
      exc: "EXCEPTION",
    },
    jandt: {
      pickup: "IN_TRANSIT",
      sending: "IN_TRANSIT",
      signed: "DELIVERED",
      problem: "EXCEPTION",
      return: "RTO",
    },
    thailand_post: {
      delivered: "DELIVERED",
      transporting: "IN_TRANSIT",
      unsuccessful: "EXCEPTION",
      returned: "RTO",
    },
  };

  const providerMap = providerAliases[providerCode] ?? {};

  if (providerMap[statusText]) return providerMap[statusText];
  if (commonDelivered.includes(statusText.toUpperCase())) return "DELIVERED";
  if (commonTransit.includes(statusText.toUpperCase())) return "IN_TRANSIT";
  if (commonException.includes(statusText.toUpperCase())) return "EXCEPTION";
  if (commonRto.includes(statusText.toUpperCase())) return "RTO";
  if (commonCancelled.includes(statusText.toUpperCase())) return "CANCELLED";

  return undefined;
}

function readPath(payload: JsonObject, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as JsonObject)[key];
    }

    return undefined;
  }, payload);
}

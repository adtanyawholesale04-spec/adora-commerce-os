import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  recordOrderPlacedAttribution,
  type OrderPlacedAttributionState,
} from "@/lib/storefront/checkout-attribution";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const ADDRESS_KEYS = new Set([
  "recipientName",
  "phone",
  "addressLine1",
  "addressLine2",
  "subdistrict",
  "district",
  "province",
  "postalCode",
  "countryCode",
]);

export type StorefrontRuntimeFailureCode =
  | "feature_disabled"
  | "auth_required"
  | "cart_not_found"
  | "cart_not_ready"
  | "address_required"
  | "address_invalid"
  | "coupon_invalid"
  | "coupon_unavailable"
  | "item_unavailable"
  | "promotion_unavailable"
  | "checkout_reprice_required"
  | "request_in_progress"
  | "request_conflict"
  | "persistence_error";

export type StorefrontRuntimeFailure = {
  ok: false;
  code: StorefrontRuntimeFailureCode;
  retryable: boolean;
};

export type StorefrontCartItem = {
  productId: string;
  variantId: string;
  quantity: string;
  originalUnitPrice: string;
  calculatedUnitPrice: string;
  lineDiscountTotal: string;
  lineTotal: string;
};

export type StorefrontCartSuccess = {
  ok: true;
  code: "cart_ready" | "checkout_started";
  operation: "CART_CREATE" | "CART_ITEM_SET" | "CART_ITEM_REMOVE" | "CHECKOUT_START";
  cartId: string;
  status: "OPEN" | "READY" | "RESERVED";
  currencyCode: string;
  subtotal: string;
  discountTotal: string;
  shippingEstimate: string;
  grandTotal: string;
  items: StorefrontCartItem[];
  idempotencyReused: boolean;
};

export type StorefrontCheckoutSuccess = {
  ok: true;
  code: "checkout_submitted";
  cartId: string;
  orderId: string;
  paymentId: string;
  orderNumber: string;
  orderStatus: "PENDING_CONFIRMATION";
  currencyCode: string;
  subtotal: string;
  itemDiscountTotal: string;
  orderDiscountTotal: string;
  shippingCharge: string;
  grandTotal: string;
  reservedUntil: string;
  paymentDueAt: string;
  idempotencyReused: boolean;
  attributionState: OrderPlacedAttributionState;
};

export type StorefrontRuntimeResult =
  | StorefrontRuntimeFailure
  | StorefrontCartSuccess
  | StorefrontCheckoutSuccess;

export type CheckoutAddressInput = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postalCode?: string | null;
  countryCode: string;
};

type SessionClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type CheckoutDependencies = {
  createClient?: () => Promise<SessionClient>;
  recordAttribution?: (
    organizationId: string,
    orderId: string,
  ) => Promise<OrderPlacedAttributionState>;
  available?: () => boolean;
};

export function createStorefrontCheckoutService(
  dependencies: CheckoutDependencies = {},
) {
  const createClient = dependencies.createClient ?? createSupabaseServerClient;
  const recordAttribution =
    dependencies.recordAttribution ?? recordOrderPlacedAttribution;
  const available = dependencies.available ?? isStorefrontCheckoutAvailable;

  async function resolveCart(input: {
    organizationSlug: string;
    requestId: string;
  }): Promise<StorefrontRuntimeResult> {
    return runCartRpc(input.organizationSlug, input.requestId, async (context) =>
      context.client.rpc("api_resolve_storefront_cart", {
        p_organization_id: context.organizationId,
        p_request_id: input.requestId,
      }),
    );
  }

  async function setCartItem(input: {
    organizationSlug: string;
    cartId: string;
    variantId: string;
    quantity: number;
    requestId: string;
  }): Promise<StorefrontRuntimeResult> {
    if (
      !isUuid(input.cartId) ||
      !isUuid(input.variantId) ||
      !isQuantity(input.quantity)
    ) {
      return failure("item_unavailable");
    }
    return runCartRpc(input.organizationSlug, input.requestId, async (context) =>
      context.client.rpc("api_set_storefront_cart_item", {
        p_organization_id: context.organizationId,
        p_cart_id: input.cartId,
        p_variant_id: input.variantId,
        p_quantity: input.quantity,
        p_request_id: input.requestId,
      }),
    );
  }

  async function removeCartItem(input: {
    organizationSlug: string;
    cartId: string;
    variantId: string;
    requestId: string;
  }): Promise<StorefrontRuntimeResult> {
    if (!isUuid(input.cartId) || !isUuid(input.variantId)) {
      return failure("cart_not_found");
    }
    return runCartRpc(input.organizationSlug, input.requestId, async (context) =>
      context.client.rpc("api_remove_storefront_cart_item", {
        p_organization_id: context.organizationId,
        p_cart_id: input.cartId,
        p_variant_id: input.variantId,
        p_request_id: input.requestId,
      }),
    );
  }

  async function startCheckout(input: {
    organizationSlug: string;
    cartId: string;
    requestId: string;
  }): Promise<StorefrontRuntimeResult> {
    if (!isUuid(input.cartId)) return failure("cart_not_found");
    return runCartRpc(input.organizationSlug, input.requestId, async (context) =>
      context.client.rpc("api_start_storefront_checkout", {
        p_organization_id: context.organizationId,
        p_cart_id: input.cartId,
        p_request_id: input.requestId,
      }),
    );
  }

  async function submitCheckout(input: {
    organizationSlug: string;
    cartId: string;
    customerAddressId?: string | null;
    checkoutAddress?: CheckoutAddressInput | null;
    couponCode?: string | null;
    requestId: string;
  }): Promise<StorefrontRuntimeResult> {
    if (!available()) return failure("feature_disabled");
    if (!isUuid(input.cartId) || !isUuid(input.requestId)) {
      return failure("request_conflict");
    }
    const address = normalizeAddressUnion(
      input.customerAddressId,
      input.checkoutAddress,
    );
    if (!address.ok) return failure(address.code);
    const couponCode = normalizeCoupon(input.couponCode);
    if (couponCode === undefined) return failure("coupon_invalid");

    const context = await createContext(input.organizationSlug);
    if (!context.ok) return context;

    try {
      const { data, error } = await context.client.rpc(
        "api_submit_storefront_checkout",
        {
          p_organization_id: context.organizationId,
          p_cart_id: input.cartId,
          p_customer_address_id: address.customerAddressId,
          p_checkout_address: address.checkoutAddress,
          p_coupon_code: couponCode,
          p_request_id: input.requestId,
        },
      );
      if (error) return mapRpcError(error.message);

      const controlled = parseControlledCheckoutResult(data);
      if (controlled) return controlled;
      const success = parseCheckoutSuccess(data);
      if (!success) return failure("persistence_error");

      const attributionState = await recordAttribution(
        context.organizationId,
        success.orderId,
      );
      return { ...success, attributionState };
    } catch {
      return failure("persistence_error");
    }
  }

  async function runCartRpc(
    organizationSlug: string,
    requestId: string,
    invoke: (
      context: RuntimeContext,
    ) => Promise<{ data: unknown; error: { message: string } | null }>,
  ): Promise<StorefrontRuntimeResult> {
    if (!available()) return failure("feature_disabled");
    if (!isUuid(requestId)) return failure("request_conflict");
    const context = await createContext(organizationSlug);
    if (!context.ok) return context;
    try {
      const { data, error } = await invoke(context);
      if (error) return mapRpcError(error.message);
      return parseCartSuccess(data) ?? failure("persistence_error");
    } catch {
      return failure("persistence_error");
    }
  }

  async function createContext(
    organizationSlug: string,
  ): Promise<RuntimeContext | StorefrontRuntimeFailure> {
    const slug = normalizeSlug(organizationSlug);
    if (!slug) return failure("feature_disabled");
    try {
      const client = await createClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) return failure("auth_required");

      const { data, error } = await client
        .from("organizations")
        .select("id,slug,status")
        .eq("slug", slug)
        .eq("status", "ACTIVE")
        .maybeSingle();
      const row = asObject(data);
      const organizationId = row ? asUuid(row.id) : null;
      if (error || !organizationId || row?.slug !== slug) {
        return failure("feature_disabled");
      }
      return { ok: true, client, organizationId, organizationSlug: slug };
    } catch {
      return failure("persistence_error");
    }
  }

  return {
    resolveCart,
    setCartItem,
    removeCartItem,
    startCheckout,
    submitCheckout,
  };
}

export function isStorefrontCheckoutAvailable() {
  return (
    process.env.ACOS_STOREFRONT_CHECKOUT_ENABLED === "true" &&
    process.env.ACOS_STOREFRONT_CHECKOUT_KILL_SWITCH !== "true"
  );
}

type RuntimeContext = {
  ok: true;
  client: SessionClient;
  organizationId: string;
  organizationSlug: string;
};

function parseCartSuccess(value: unknown): StorefrontCartSuccess | null {
  const row = asObject(value);
  if (!row || row.ok !== true) return null;
  const operation = asCartOperation(row.operation);
  const cartId = asUuid(row.cart_id);
  const status = asCartStatus(row.status);
  const currencyCode = asCurrency(row.currency_code);
  const subtotal = asMoney(row.subtotal);
  const discountTotal = asMoney(row.discount_total);
  const shippingEstimate = asMoney(row.shipping_estimate);
  const grandTotal = asMoney(row.grand_total);
  const items = Array.isArray(row.items)
    ? row.items.map(parseCartItem).filter(isPresent)
    : null;
  if (
    !operation ||
    !cartId ||
    !status ||
    !currencyCode ||
    !subtotal ||
    !discountTotal ||
    !shippingEstimate ||
    !grandTotal ||
    !items ||
    items.length !== (row.items as unknown[]).length ||
    typeof row.idempotency_reused !== "boolean"
  ) {
    return null;
  }
  return {
    ok: true,
    code: operation === "CHECKOUT_START" ? "checkout_started" : "cart_ready",
    operation,
    cartId,
    status,
    currencyCode,
    subtotal,
    discountTotal,
    shippingEstimate,
    grandTotal,
    items,
    idempotencyReused: row.idempotency_reused,
  };
}

function parseCheckoutSuccess(value: unknown): Omit<StorefrontCheckoutSuccess, "attributionState"> | null {
  const row = asObject(value);
  if (!row || row.ok !== true || row.operation !== "CHECKOUT_SUBMIT") return null;
  const cartId = asUuid(row.cart_id);
  const orderId = asUuid(row.order_id);
  const paymentId = asUuid(row.payment_id);
  const orderNumber = asBoundedString(row.order_number, 100);
  const currencyCode = asCurrency(row.currency_code);
  const subtotal = asMoney(row.subtotal);
  const itemDiscountTotal = asMoney(row.item_discount_total);
  const orderDiscountTotal = asMoney(row.order_discount_total);
  const shippingCharge = asMoney(row.shipping_charge);
  const grandTotal = asMoney(row.grand_total);
  const reservedUntil = asTimestamp(row.reserved_until);
  const paymentDueAt = asTimestamp(row.payment_due_at);
  if (
    !cartId || !orderId || !paymentId || !orderNumber ||
    row.order_status !== "PENDING_CONFIRMATION" || !currencyCode ||
    !subtotal || !itemDiscountTotal || !orderDiscountTotal ||
    !shippingCharge || !grandTotal || !reservedUntil || !paymentDueAt ||
    typeof row.idempotency_reused !== "boolean"
  ) {
    return null;
  }
  return {
    ok: true,
    code: "checkout_submitted",
    cartId,
    orderId,
    paymentId,
    orderNumber,
    orderStatus: "PENDING_CONFIRMATION",
    currencyCode,
    subtotal,
    itemDiscountTotal,
    orderDiscountTotal,
    shippingCharge,
    grandTotal,
    reservedUntil,
    paymentDueAt,
    idempotencyReused: row.idempotency_reused,
  };
}

function parseControlledCheckoutResult(value: unknown) {
  const row = asObject(value);
  if (row?.ok !== false) return null;
  return row.code === "CHECKOUT_REPRICE_REQUIRED"
    ? failure("checkout_reprice_required")
    : null;
}

function parseCartItem(value: unknown): StorefrontCartItem | null {
  const row = asObject(value);
  if (!row) return null;
  const productId = asUuid(row.product_id);
  const variantId = asUuid(row.variant_id);
  const quantity = asQuantity(row.quantity);
  const originalUnitPrice = asMoney(row.original_unit_price);
  const calculatedUnitPrice = asMoney(row.calculated_unit_price);
  const lineDiscountTotal = asMoney(row.line_discount_total);
  const lineTotal = asMoney(row.line_total);
  return productId && variantId && quantity && originalUnitPrice &&
    calculatedUnitPrice && lineDiscountTotal && lineTotal
    ? { productId, variantId, quantity, originalUnitPrice, calculatedUnitPrice, lineDiscountTotal, lineTotal }
    : null;
}

function normalizeAddressUnion(
  customerAddressId: string | null | undefined,
  checkoutAddress: CheckoutAddressInput | null | undefined,
):
  | {
      ok: true;
      customerAddressId: string | null;
      checkoutAddress: Record<string, string | null> | null;
    }
  | { ok: false; code: "address_required" | "address_invalid" } {
  const hasSaved = typeof customerAddressId === "string" && customerAddressId !== "";
  const hasCheckout = checkoutAddress != null;
  if (hasSaved === hasCheckout) return { ok: false, code: "address_required" };
  if (hasSaved) {
    return isUuid(customerAddressId)
      ? { ok: true, customerAddressId, checkoutAddress: null }
      : { ok: false, code: "address_invalid" };
  }
  const address = normalizeAddress(checkoutAddress);
  return address
    ? { ok: true, customerAddressId: null, checkoutAddress: address }
    : { ok: false, code: "address_invalid" };
}

function normalizeAddress(value: CheckoutAddressInput | null | undefined) {
  const row = asObject(value);
  if (!row || Object.keys(row).some((key) => !ADDRESS_KEYS.has(key))) return null;
  const recipientName = normalizedRequired(row.recipientName, 200);
  const phone = normalizedRequired(row.phone, 50);
  const addressLine1 = normalizedRequired(row.addressLine1, 500);
  const countryCode = normalizedRequired(row.countryCode, 2)?.toUpperCase();
  if (!recipientName || !phone || !addressLine1 || countryCode !== "TH") return null;
  return {
    recipient_name: recipientName,
    phone,
    address_line1: addressLine1,
    address_line2: normalizedOptional(row.addressLine2, 500),
    subdistrict: normalizedOptional(row.subdistrict, 150),
    district: normalizedOptional(row.district, 150),
    province: normalizedOptional(row.province, 150),
    postal_code: normalizedOptional(row.postalCode, 20),
    country_code: countryCode,
  };
}

function normalizeCoupon(value: string | null | undefined) {
  if (value == null || value.trim() === "") return null;
  const normalized = value.trim().toUpperCase();
  return normalized.length <= 100 && !/[\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : undefined;
}

function normalizeSlug(value: string) {
  const normalized = value.trim().toLowerCase();
  return SLUG_PATTERN.test(normalized) ? normalized : null;
}

function mapRpcError(message: string): StorefrontRuntimeFailure {
  const mappings: Array<[string, StorefrontRuntimeFailureCode]> = [
    ["AUTH_REQUIRED", "auth_required"],
    ["ACTIVE_MEMBERSHIP_REQUIRED", "auth_required"],
    ["ACTIVE_CUSTOMER_LINK_REQUIRED", "auth_required"],
    ["CHECKOUT_NOT_AVAILABLE", "feature_disabled"],
    ["CART_NOT_FOUND", "cart_not_found"],
    ["CART_NOT_READY", "cart_not_ready"],
    ["CART_NOT_MUTABLE", "cart_not_ready"],
    ["ADDRESS_REQUIRED", "address_required"],
    ["ADDRESS_INVALID", "address_invalid"],
    ["COUPON_INVALID", "coupon_invalid"],
    ["COUPON_UNAVAILABLE", "coupon_unavailable"],
    ["ITEM_UNAVAILABLE", "item_unavailable"],
    ["QUANTITY_INVALID", "item_unavailable"],
    ["PROMOTION_CONFIGURATION_UNSUPPORTED", "promotion_unavailable"],
    ["PROMOTION_PRICE_FLOOR_VIOLATION", "promotion_unavailable"],
    ["CHECKOUT_REPRICE_REQUIRED", "checkout_reprice_required"],
    ["REQUEST_IN_PROGRESS", "request_in_progress"],
    ["IDEMPOTENCY_CONFLICT", "request_conflict"],
  ];
  const result = mappings.find(([candidate]) => message.includes(candidate));
  return failure(result?.[1] ?? "persistence_error");
}

function failure(code: StorefrontRuntimeFailureCode): StorefrontRuntimeFailure {
  return {
    ok: false,
    code,
    retryable: code === "request_in_progress" || code === "persistence_error",
  };
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

function asQuantity(value: unknown) {
  const text = String(value ?? "");
  return /^\d{1,9}\.\d{3}$/.test(text) ? text : null;
}

function asCurrency(value: unknown) {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value) ? value : null;
}

function asTimestamp(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function asBoundedString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.length >= 1 && value.length <= maxLength
    ? value
    : null;
}

function normalizedRequired(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= maxLength ? normalized : null;
}

function normalizedOptional(value: unknown, maxLength: number) {
  if (value == null || value === "") return null;
  return normalizedRequired(value, maxLength);
}

function asCartOperation(value: unknown): StorefrontCartSuccess["operation"] | null {
  return value === "CART_CREATE" || value === "CART_ITEM_SET" ||
    value === "CART_ITEM_REMOVE" || value === "CHECKOUT_START"
    ? value
    : null;
}

function asCartStatus(value: unknown): StorefrontCartSuccess["status"] | null {
  return value === "OPEN" || value === "READY" || value === "RESERVED"
    ? value
    : null;
}

function isQuantity(value: number) {
  return Number.isFinite(value) && value > 0 && value <= 999 &&
    Math.round(value * 1000) === value * 1000;
}

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

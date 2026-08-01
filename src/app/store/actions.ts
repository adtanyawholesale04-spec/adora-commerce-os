"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_THEME_COOKIE,
  parseLocale,
  parseTheme,
} from "@/lib/admin/preferences";
import {
  createStorefrontCheckoutService,
  type CheckoutAddressInput,
  type StorefrontRuntimeResult,
} from "@/lib/storefront/checkout";
import {
  createManualPaymentSubmissionService,
  type ManualPaymentSubmissionResult,
} from "@/lib/storefront/manual-payment";

const checkoutService = createStorefrontCheckoutService();
const manualPaymentService = createManualPaymentSubmissionService();

export type StorefrontActionState = StorefrontRuntimeResult | {
  ok: false;
  code: "persistence_error";
  retryable: true;
};

export async function resolveStorefrontCartAction(
  _previousState: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  const organizationSlug = String(formData.get("organizationSlug") ?? "");
  const result = await checkoutService.resolveCart({
    organizationSlug,
    requestId: String(formData.get("requestId") ?? ""),
  });
  revalidateStorefrontOnSuccess(organizationSlug, result);
  return result;
}

export async function setStorefrontCartItemAction(
  _previousState: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  const organizationSlug = String(formData.get("organizationSlug") ?? "");
  const result = await checkoutService.setCartItem({
    organizationSlug,
    cartId: String(formData.get("cartId") ?? ""),
    variantId: String(formData.get("variantId") ?? ""),
    quantity: Number(formData.get("quantity")),
    requestId: String(formData.get("requestId") ?? ""),
  });
  revalidateStorefrontOnSuccess(organizationSlug, result);
  return result;
}

export async function removeStorefrontCartItemAction(
  _previousState: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  const organizationSlug = String(formData.get("organizationSlug") ?? "");
  const result = await checkoutService.removeCartItem({
    organizationSlug,
    cartId: String(formData.get("cartId") ?? ""),
    variantId: String(formData.get("variantId") ?? ""),
    requestId: String(formData.get("requestId") ?? ""),
  });
  revalidateStorefrontOnSuccess(organizationSlug, result);
  return result;
}

export async function startStorefrontCheckoutAction(
  _previousState: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  const organizationSlug = String(formData.get("organizationSlug") ?? "");
  const result = await checkoutService.startCheckout({
    organizationSlug,
    cartId: String(formData.get("cartId") ?? ""),
    requestId: String(formData.get("requestId") ?? ""),
  });
  revalidateStorefrontOnSuccess(organizationSlug, result);
  return result;
}

export async function submitStorefrontCheckoutAction(
  _previousState: StorefrontActionState,
  formData: FormData,
): Promise<StorefrontActionState> {
  const organizationSlug = String(formData.get("organizationSlug") ?? "");
  const addressMode = String(formData.get("addressMode") ?? "");
  const result = await checkoutService.submitCheckout({
    organizationSlug,
    cartId: String(formData.get("cartId") ?? ""),
    customerAddressId:
      addressMode === "saved"
        ? String(formData.get("customerAddressId") ?? "")
        : null,
    checkoutAddress:
      addressMode === "checkout" ? checkoutAddressFromForm(formData) : null,
    couponCode: String(formData.get("couponCode") ?? ""),
    requestId: String(formData.get("requestId") ?? ""),
  });
  revalidateStorefrontOnSuccess(organizationSlug, result);
  return result;
}

export async function submitStorefrontPaymentProofAction(
  _previousState: ManualPaymentSubmissionResult,
  formData: FormData,
): Promise<ManualPaymentSubmissionResult> {
  const organizationSlug = String(formData.get("organizationSlug") ?? "");
  const result = await manualPaymentService.submitPaymentProof({
    organizationSlug,
    orderId: String(formData.get("orderId") ?? ""),
    paymentReference: String(formData.get("paymentReference") ?? ""),
    requestId: String(formData.get("requestId") ?? ""),
  });
  if (result.ok) revalidateStorefrontOrders(organizationSlug);
  return result;
}

export async function setStorefrontPreferencesAction(formData: FormData) {
  const theme = formData.get("theme");
  const locale = formData.get("locale");
  const returnPath = safeStorefrontReturnPath(
    String(formData.get("returnPath") ?? ""),
  );
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };

  if (theme !== null) {
    cookieStore.set(ADMIN_THEME_COOKIE, parseTheme(String(theme)), options);
  }
  if (locale !== null) {
    cookieStore.set(ADMIN_LOCALE_COOKIE, parseLocale(String(locale)), options);
  }

  revalidatePath(returnPath);
  redirect(returnPath);
}

function safeStorefrontReturnPath(value: string) {
  return /^\/store\/[a-z0-9][a-z0-9-]{1,61}[a-z0-9](?:\/products\/[a-z0-9][a-z0-9-]{1,61}[a-z0-9])?$/.test(
    value,
  )
    ? value
    : "/";
}

function checkoutAddressFromForm(formData: FormData): CheckoutAddressInput {
  return {
    recipientName: String(formData.get("recipientName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? ""),
    addressLine2: optionalFormText(formData, "addressLine2"),
    subdistrict: optionalFormText(formData, "subdistrict"),
    district: optionalFormText(formData, "district"),
    province: optionalFormText(formData, "province"),
    postalCode: optionalFormText(formData, "postalCode"),
    countryCode: String(formData.get("countryCode") ?? ""),
  };
}

function optionalFormText(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "");
  return value === "" ? null : value;
}

function revalidateStorefrontOnSuccess(
  organizationSlug: string,
  result: StorefrontRuntimeResult,
) {
  const slug = organizationSlug.trim().toLowerCase();
  if (result.ok && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    revalidatePath(`/store/${slug}`);
  }
}

function revalidateStorefrontOrders(organizationSlug: string) {
  const slug = organizationSlug.trim().toLowerCase();
  if (/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
    revalidatePath(`/store/${slug}/orders`);
  }
}

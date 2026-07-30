import "server-only";

import { createClient } from "@supabase/supabase-js";

export type StorefrontAvailability = "IN_STOCK" | "SOLD_OUT";

export type PublicStorefront = {
  canonicalSlug: string;
  redirectRequired: boolean;
  storeName: string;
  tagline: string | null;
  description: string | null;
  currencyCode: string;
  publicationUpdatedAt: string;
};

export type StorefrontProduct = {
  publicHandle: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  brandName: string | null;
  priceMin: number;
  priceMax: number;
  currencyCode: string;
  availability: StorefrontAvailability;
  sortOrder: number;
  updatedAt: string;
};

export type StorefrontVariant = {
  variantId: string;
  variantName: string;
  basePrice: number;
  availability: StorefrontAvailability;
};

export type ProductCursor = {
  sortOrder: number;
  updatedAt: string;
  productId: string;
};

export type VariantCursor = {
  variantName: string;
  variantId: string;
};

export type StorefrontPageModel =
  | {
      state: "ready";
      storefront: PublicStorefront;
      products: StorefrontProduct[];
      hasMore: boolean;
      nextCursor: ProductCursor | null;
    }
  | {
      state: "unavailable" | "configuration_error" | "query_error";
      storefront: null;
      products: [];
      hasMore: false;
      nextCursor: null;
    };

export type StorefrontProductPageModel =
  | {
      state: "ready";
      storefront: PublicStorefront;
      product: StorefrontProduct;
      variants: StorefrontVariant[];
      hasMore: boolean;
      nextCursor: VariantCursor | null;
    }
  | {
      state: "unavailable" | "configuration_error" | "query_error";
      storefront: PublicStorefront | null;
      product: null;
      variants: [];
      hasMore: false;
      nextCursor: null;
    };

export async function getStorefrontPageModel(
  organizationSlug: string,
  cursor: ProductCursor | null = null,
): Promise<StorefrontPageModel> {
  const client = createStorefrontReadClient();
  if (!client) {
    return emptyStorefrontModel("configuration_error");
  }

  const [storeResult, productsResult] = await Promise.all([
    client.rpc("api_get_public_storefront", {
      p_organization_slug: organizationSlug,
    }),
    client.rpc("api_list_public_storefront_products", {
      p_organization_slug: organizationSlug,
      p_after_sort_order: cursor?.sortOrder ?? null,
      p_after_updated_at: cursor?.updatedAt ?? null,
      p_after_product_id: cursor?.productId ?? null,
      p_limit: 24,
    }),
  ]);

  if (storeResult.error || productsResult.error) {
    logStorefrontReadFailure(storeResult.error?.code ?? productsResult.error?.code);
    return emptyStorefrontModel("query_error");
  }

  const storefront = parseStorefront(storeResult.data);
  const productsPage = parseProductsPage(productsResult.data);
  if (!storefront || !productsPage) {
    return emptyStorefrontModel("unavailable");
  }

  return {
    state: "ready",
    storefront,
    products: productsPage.items,
    hasMore: productsPage.hasMore,
    nextCursor: productsPage.nextCursor,
  };
}

export async function getStorefrontProductPageModel(
  organizationSlug: string,
  publicHandle: string,
  cursor: VariantCursor | null = null,
): Promise<StorefrontProductPageModel> {
  const client = createStorefrontReadClient();
  if (!client) {
    return emptyProductModel("configuration_error");
  }

  const [storeResult, productResult, variantsResult] = await Promise.all([
    client.rpc("api_get_public_storefront", {
      p_organization_slug: organizationSlug,
    }),
    client.rpc("api_get_public_storefront_product", {
      p_organization_slug: organizationSlug,
      p_public_handle: publicHandle,
    }),
    client.rpc("api_list_public_storefront_product_variants", {
      p_organization_slug: organizationSlug,
      p_public_handle: publicHandle,
      p_after_variant_name: cursor?.variantName ?? null,
      p_after_variant_id: cursor?.variantId ?? null,
      p_limit: 50,
    }),
  ]);

  if (storeResult.error || productResult.error || variantsResult.error) {
    logStorefrontReadFailure(
      storeResult.error?.code ??
        productResult.error?.code ??
        variantsResult.error?.code,
    );
    return emptyProductModel("query_error");
  }

  const storefront = parseStorefront(storeResult.data);
  const product = parseProductDetail(productResult.data);
  const variantsPage = parseVariantsPage(variantsResult.data);
  if (!storefront || !product || !variantsPage) {
    return emptyProductModel("unavailable", storefront);
  }

  return {
    state: "ready",
    storefront,
    product,
    variants: variantsPage.items,
    hasMore: variantsPage.hasMore,
    nextCursor: variantsPage.nextCursor,
  };
}

function createStorefrontReadClient() {
  const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const secretKey =
    String(process.env.SUPABASE_SECRET_KEY ?? "").trim() ||
    String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!isHttpUrl(supabaseUrl) || !secretKey) {
    return null;
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function parseStorefront(value: unknown): PublicStorefront | null {
  const row = asObject(value);
  if (!row || row.available !== true) {
    return null;
  }

  const canonicalSlug = asString(row.canonical_slug);
  const storeName = asString(row.store_name);
  const currencyCode = asString(row.currency_code);
  const publicationUpdatedAt = asString(row.publication_updated_at);
  if (!canonicalSlug || !storeName || !currencyCode || !publicationUpdatedAt) {
    return null;
  }

  return {
    canonicalSlug,
    redirectRequired: row.redirect_required === true,
    storeName,
    tagline: asNullableString(row.tagline),
    description: asNullableString(row.description),
    currencyCode,
    publicationUpdatedAt,
  };
}

function parseProductsPage(value: unknown) {
  const page = asObject(value);
  if (!page || page.available !== true || !Array.isArray(page.items)) {
    return null;
  }

  const items = page.items.map(parseProduct).filter(isPresent);
  if (items.length !== page.items.length) {
    return null;
  }

  return {
    items,
    hasMore: page.has_more === true,
    nextCursor: parseProductCursor(page.next_cursor),
  };
}

function parseProductDetail(value: unknown) {
  const result = asObject(value);
  if (!result || result.available !== true) {
    return null;
  }
  return parseProduct(result.product);
}

function parseProduct(value: unknown): StorefrontProduct | null {
  const row = asObject(value);
  if (!row) {
    return null;
  }

  const publicHandle = asString(row.public_handle);
  const name = asString(row.name);
  const currencyCode = asString(row.currency_code);
  const availability = asAvailability(row.availability);
  const priceMin = asNumber(row.price_min);
  const priceMax = asNumber(row.price_max);
  const sortOrder = asNumber(row.sort_order);
  const updatedAt = asString(row.updated_at);

  if (
    !publicHandle ||
    !name ||
    !currencyCode ||
    !availability ||
    priceMin === null ||
    priceMax === null ||
    sortOrder === null ||
    !updatedAt
  ) {
    return null;
  }

  return {
    publicHandle,
    name,
    description: asNullableString(row.description),
    categoryName: asNullableString(row.category_name),
    brandName: asNullableString(row.brand_name),
    priceMin,
    priceMax,
    currencyCode,
    availability,
    sortOrder,
    updatedAt,
  };
}

function parseVariantsPage(value: unknown) {
  const page = asObject(value);
  if (!page || page.available !== true || !Array.isArray(page.items)) {
    return null;
  }

  const items = page.items.map(parseVariant).filter(isPresent);
  if (items.length !== page.items.length) {
    return null;
  }

  return {
    items,
    hasMore: page.has_more === true,
    nextCursor: parseVariantCursor(page.next_cursor),
  };
}

function parseVariant(value: unknown): StorefrontVariant | null {
  const row = asObject(value);
  if (!row) {
    return null;
  }

  const variantId = asString(row.variant_id);
  const variantName = asString(row.variant_name);
  const basePrice = asNumber(row.base_price);
  const availability = asAvailability(row.availability);
  if (!variantId || !variantName || basePrice === null || !availability) {
    return null;
  }

  return { variantId, variantName, basePrice, availability };
}

function parseProductCursor(value: unknown): ProductCursor | null {
  const row = asObject(value);
  if (!row) {
    return null;
  }
  const sortOrder = asNumber(row.sort_order);
  const updatedAt = asString(row.updated_at);
  const productId = asString(row.product_id);
  return sortOrder === null || !updatedAt || !productId
    ? null
    : { sortOrder, updatedAt, productId };
}

function parseVariantCursor(value: unknown): VariantCursor | null {
  const row = asObject(value);
  if (!row) {
    return null;
  }
  const variantName = asString(row.variant_name);
  const variantId = asString(row.variant_id);
  return !variantName || !variantId ? null : { variantName, variantId };
}

function emptyStorefrontModel(
  state: "unavailable" | "configuration_error" | "query_error",
): StorefrontPageModel {
  return {
    state,
    storefront: null,
    products: [],
    hasMore: false,
    nextCursor: null,
  };
}

function emptyProductModel(
  state: "unavailable" | "configuration_error" | "query_error",
  storefront: PublicStorefront | null = null,
): StorefrontProductPageModel {
  return {
    state,
    storefront,
    product: null,
    variants: [],
    hasMore: false,
    nextCursor: null,
  };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNullableString(value: unknown) {
  return value === null ? null : asString(value);
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asAvailability(value: unknown): StorefrontAvailability | null {
  return value === "IN_STOCK" || value === "SOLD_OUT" ? value : null;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function logStorefrontReadFailure(code: string | undefined) {
  console.error("Storefront read boundary failed.", { code: code ?? "unknown" });
}

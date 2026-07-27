import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type ProductReadModel = {
  context: AdminShellContext;
  state: ProductReadModelState;
  products: ProductSummary[];
  metrics: ProductReadMetrics;
  inventoryVisible: boolean;
  errorMessage: string | null;
};

export type ProductSummary = {
  id: string;
  code: string;
  name: string;
  status: string;
  categoryName: string | null;
  brandName: string | null;
  updatedAt: string;
  variantCount: number;
  totals: InventoryTotals | null;
  variants: VariantSummary[];
};

export type VariantSummary = {
  id: string;
  stockCode: string;
  barcode: string | null;
  name: string;
  basePrice: number;
  status: string;
  updatedAt: string;
  totals: InventoryTotals | null;
};

export type InventoryTotals = {
  onHand: number;
  reserved: number;
  allocated: number;
  available: number;
};

type ProductReadMetrics = {
  productCount: number;
  activeProductCount: number;
  variantCount: number;
  availableQuantity: number | null;
};

type ProductRow = {
  id: string;
  product_code: string;
  name: string;
  status: string;
  category_id: string | null;
  brand_id: string | null;
  updated_at: string;
};

type VariantRow = {
  id: string;
  product_id: string;
  stock_code: string;
  barcode: string | null;
  variant_name: string;
  base_price: number | string;
  status: string;
  updated_at: string;
};

type LabelRow = {
  id: string;
  name: string;
};

type InventoryBalanceRow = {
  variant_id: string;
  on_hand: number | string;
  reserved: number | string;
  allocated: number | string;
  available: number | string;
};

const emptyMetrics: ProductReadMetrics = {
  productCount: 0,
  activeProductCount: 0,
  variantCount: 0,
  availableQuantity: null
};

export async function getProductsReadModel(): Promise<ProductReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("product.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: productData, error: productError } = await supabase
    .from("products")
    .select("id, product_code, name, status, category_id, brand_id, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (productError) {
    return queryErrorModel(context, productError.message);
  }

  const products = (productData ?? []) as ProductRow[];
  const productIds = products.map((product) => product.id);

  const [variantsResult, categoriesResult, brandsResult] = await Promise.all([
    productIds.length > 0
      ? supabase
          .from("product_variants")
          .select(
            "id, product_id, stock_code, barcode, variant_name, base_price, status, updated_at"
          )
          .eq("organization_id", context.activeOrganizationId)
          .in("product_id", productIds)
          .order("updated_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    loadLabels(
      supabase,
      "categories",
      context.activeOrganizationId,
      products.map((product) => product.category_id)
    ),
    loadLabels(
      supabase,
      "brands",
      context.activeOrganizationId,
      products.map((product) => product.brand_id)
    )
  ]);

  if (variantsResult.error) {
    return queryErrorModel(context, variantsResult.error.message);
  }

  if (categoriesResult.error) {
    return queryErrorModel(context, categoriesResult.error.message);
  }

  if (brandsResult.error) {
    return queryErrorModel(context, brandsResult.error.message);
  }

  const variants = (variantsResult.data ?? []) as VariantRow[];
  const inventoryVisible = context.permissions.includes("inventory.view");
  const balances = inventoryVisible
    ? await loadInventoryBalances(
        supabase,
        context.activeOrganizationId,
        variants.map((variant) => variant.id)
      )
    : { rows: [], errorMessage: null };

  if (balances.errorMessage) {
    return queryErrorModel(context, balances.errorMessage);
  }

  const categoryNames = labelMap((categoriesResult.data ?? []) as LabelRow[]);
  const brandNames = labelMap((brandsResult.data ?? []) as LabelRow[]);
  const variantGroups = groupVariants(variants);
  const balanceTotals = groupInventoryTotals(balances.rows);
  const productSummaries = products.map((product) => {
    const productVariants = variantGroups.get(product.id) ?? [];
    const variantSummaries = productVariants.map((variant) =>
      toVariantSummary(variant, balanceTotals.get(variant.id) ?? null)
    );
    const productTotals = inventoryVisible
      ? sumTotals(variantSummaries.map((variant) => variant.totals))
      : null;

    return {
      id: product.id,
      code: product.product_code,
      name: product.name,
      status: product.status,
      categoryName: product.category_id ? categoryNames.get(product.category_id) ?? null : null,
      brandName: product.brand_id ? brandNames.get(product.brand_id) ?? null : null,
      updatedAt: product.updated_at,
      variantCount: productVariants.length,
      totals: productTotals,
      variants: variantSummaries
    };
  });

  return {
    context,
    state: "ready",
    products: productSummaries,
    metrics: {
      productCount: productSummaries.length,
      activeProductCount: productSummaries.filter(
        (product) => product.status === "ACTIVE"
      ).length,
      variantCount: variants.length,
      availableQuantity: inventoryVisible
        ? sumTotals(productSummaries.map((product) => product.totals)).available
        : null
    },
    inventoryVisible,
    errorMessage: null
  };
}

function emptyModel(
  context: AdminShellContext,
  state: ProductReadModelState
): ProductReadModel {
  return {
    context,
    state,
    products: [],
    metrics: emptyMetrics,
    inventoryVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): ProductReadModel {
  return {
    context,
    state: "query_error",
    products: [],
    metrics: emptyMetrics,
    inventoryVisible: false,
    errorMessage
  };
}

async function loadLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tableName: "categories" | "brands",
  organizationId: string,
  ids: Array<string | null>
) {
  const labelIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

  if (labelIds.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from(tableName)
    .select("id, name")
    .eq("organization_id", organizationId)
    .in("id", labelIds);
}

async function loadInventoryBalances(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  variantIds: string[]
) {
  if (variantIds.length === 0) {
    return { rows: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("inventory_balances")
    .select("variant_id, on_hand, reserved, allocated, available")
    .eq("organization_id", organizationId)
    .in("variant_id", variantIds)
    .limit(500);

  return {
    rows: (data ?? []) as InventoryBalanceRow[],
    errorMessage: error?.message ?? null
  };
}

function labelMap(rows: LabelRow[]) {
  return new Map(rows.map((row) => [row.id, row.name]));
}

function groupVariants(rows: VariantRow[]) {
  const groups = new Map<string, VariantRow[]>();

  rows.forEach((row) => {
    const group = groups.get(row.product_id) ?? [];
    group.push(row);
    groups.set(row.product_id, group);
  });

  return groups;
}

function groupInventoryTotals(rows: InventoryBalanceRow[]) {
  const groups = new Map<string, InventoryTotals>();

  rows.forEach((row) => {
    const current = groups.get(row.variant_id) ?? zeroTotals();
    groups.set(row.variant_id, {
      onHand: current.onHand + toNumber(row.on_hand),
      reserved: current.reserved + toNumber(row.reserved),
      allocated: current.allocated + toNumber(row.allocated),
      available: current.available + toNumber(row.available)
    });
  });

  return groups;
}

function toVariantSummary(
  variant: VariantRow,
  totals: InventoryTotals | null
): VariantSummary {
  return {
    id: variant.id,
    stockCode: variant.stock_code,
    barcode: variant.barcode,
    name: variant.variant_name,
    basePrice: toNumber(variant.base_price),
    status: variant.status,
    updatedAt: variant.updated_at,
    totals
  };
}

function sumTotals(values: Array<InventoryTotals | null>): InventoryTotals {
  return values.reduce<InventoryTotals>(
    (total, value) => ({
      onHand: total.onHand + (value?.onHand ?? 0),
      reserved: total.reserved + (value?.reserved ?? 0),
      allocated: total.allocated + (value?.allocated ?? 0),
      available: total.available + (value?.available ?? 0)
    }),
    zeroTotals()
  );
}

function zeroTotals(): InventoryTotals {
  return {
    onHand: 0,
    reserved: 0,
    allocated: 0,
    available: 0
  };
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InventoryReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type InventoryReadModel = {
  context: AdminShellContext;
  state: InventoryReadModelState;
  metrics: InventoryMetrics;
  warehouseSummaries: WarehouseInventorySummary[];
  balanceRows: InventoryBalanceSummary[];
  movementRows: InventoryMovementSummary[];
  productLabelsVisible: boolean;
  errorMessage: string | null;
};

export type InventoryTotals = {
  onHand: number;
  reserved: number;
  allocated: number;
  available: number;
};

export type InventoryMetrics = InventoryTotals & {
  warehouseCount: number;
  balanceCount: number;
  movementCount: number;
};

export type WarehouseInventorySummary = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseStatus: string;
  variantCount: number;
  totals: InventoryTotals;
};

export type InventoryBalanceSummary = {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  variantLabel: string;
  stockCode: string | null;
  productName: string | null;
  updatedAt: string;
  totals: InventoryTotals;
};

export type InventoryMovementSummary = {
  id: string;
  warehouseName: string;
  warehouseCode: string;
  variantLabel: string;
  stockCode: string | null;
  movementType: string;
  quantityDelta: number;
  referenceType: string | null;
  reason: string | null;
  createdAt: string;
};

type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type InventoryBalanceRow = {
  id: string;
  warehouse_id: string;
  variant_id: string;
  on_hand: number | string;
  reserved: number | string;
  allocated: number | string;
  available: number | string;
  updated_at: string;
};

type InventoryMovementRow = {
  id: string;
  warehouse_id: string;
  variant_id: string;
  movement_type: string;
  quantity_delta: number | string;
  reference_type: string | null;
  reason: string | null;
  created_at: string;
};

type VariantLabelRow = {
  id: string;
  product_id: string;
  stock_code: string;
  variant_name: string;
  status: string;
};

type ProductLabelRow = {
  id: string;
  name: string;
  product_code: string;
};

const emptyMetrics: InventoryMetrics = {
  warehouseCount: 0,
  balanceCount: 0,
  movementCount: 0,
  onHand: 0,
  reserved: 0,
  allocated: 0,
  available: 0
};

export async function getInventoryReadModel(): Promise<InventoryReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("inventory.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const [warehousesResult, balancesResult, movementsResult] = await Promise.all([
    supabase
      .from("warehouses")
      .select("id, code, name, status")
      .eq("organization_id", context.activeOrganizationId)
      .order("code", { ascending: true })
      .limit(100),
    supabase
      .from("inventory_balances")
      .select("id, warehouse_id, variant_id, on_hand, reserved, allocated, available, updated_at")
      .eq("organization_id", context.activeOrganizationId)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("inventory_movements")
      .select(
        "id, warehouse_id, variant_id, movement_type, quantity_delta, reference_type, reason, created_at"
      )
      .eq("organization_id", context.activeOrganizationId)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (warehousesResult.error) {
    return queryErrorModel(context, warehousesResult.error.message);
  }

  if (balancesResult.error) {
    return queryErrorModel(context, balancesResult.error.message);
  }

  if (movementsResult.error) {
    return queryErrorModel(context, movementsResult.error.message);
  }

  const warehouses = (warehousesResult.data ?? []) as WarehouseRow[];
  const balances = (balancesResult.data ?? []) as InventoryBalanceRow[];
  const movements = (movementsResult.data ?? []) as InventoryMovementRow[];
  const productLabelsVisible = context.permissions.includes("product.view");
  const variantLabels = productLabelsVisible
    ? await loadVariantLabels(
        supabase,
        context.activeOrganizationId,
        Array.from(
          new Set([
            ...balances.map((balance) => balance.variant_id),
            ...movements.map((movement) => movement.variant_id)
          ])
        )
      )
    : { variants: new Map<string, VariantLabel>(), errorMessage: null };

  if (variantLabels.errorMessage) {
    return queryErrorModel(context, variantLabels.errorMessage);
  }

  const warehouseMap = new Map(warehouses.map((warehouse) => [warehouse.id, warehouse]));
  const warehouseSummaries = summarizeWarehouses(warehouses, balances);
  const balanceRows = balances.map((balance) =>
    toBalanceSummary(balance, warehouseMap, variantLabels.variants)
  );
  const movementRows = movements.map((movement) =>
    toMovementSummary(movement, warehouseMap, variantLabels.variants)
  );
  const totals = sumTotals(balanceRows.map((balance) => balance.totals));

  return {
    context,
    state: "ready",
    metrics: {
      ...totals,
      warehouseCount: warehouses.length,
      balanceCount: balanceRows.length,
      movementCount: movementRows.length
    },
    warehouseSummaries,
    balanceRows,
    movementRows,
    productLabelsVisible,
    errorMessage: null
  };
}

type VariantLabel = {
  label: string;
  stockCode: string;
  productName: string | null;
};

async function loadVariantLabels(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  variantIds: string[]
) {
  if (variantIds.length === 0) {
    return { variants: new Map<string, VariantLabel>(), errorMessage: null };
  }

  const { data: variantData, error: variantError } = await supabase
    .from("product_variants")
    .select("id, product_id, stock_code, variant_name, status")
    .eq("organization_id", organizationId)
    .in("id", variantIds)
    .limit(500);

  if (variantError) {
    return { variants: new Map<string, VariantLabel>(), errorMessage: variantError.message };
  }

  const variants = (variantData ?? []) as VariantLabelRow[];
  const productIds = Array.from(new Set(variants.map((variant) => variant.product_id)));
  const { data: productData, error: productError } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select("id, product_code, name")
          .eq("organization_id", organizationId)
          .in("id", productIds)
          .limit(500)
      : { data: [], error: null };

  if (productError) {
    return { variants: new Map<string, VariantLabel>(), errorMessage: productError.message };
  }

  const productMap = new Map(
    ((productData ?? []) as ProductLabelRow[]).map((product) => [product.id, product])
  );

  return {
    variants: new Map(
      variants.map((variant) => {
        const product = productMap.get(variant.product_id);

        return [
          variant.id,
          {
            label: `${variant.stock_code} · ${variant.variant_name}`,
            stockCode: variant.stock_code,
            productName: product ? `${product.product_code} · ${product.name}` : null
          }
        ];
      })
    ),
    errorMessage: null
  };
}

function summarizeWarehouses(
  warehouses: WarehouseRow[],
  balances: InventoryBalanceRow[]
): WarehouseInventorySummary[] {
  return warehouses.map((warehouse) => {
    const rows = balances.filter((balance) => balance.warehouse_id === warehouse.id);

    return {
      warehouseId: warehouse.id,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      warehouseStatus: warehouse.status,
      variantCount: new Set(rows.map((row) => row.variant_id)).size,
      totals: sumTotals(rows.map(rowTotals))
    };
  });
}

function toBalanceSummary(
  balance: InventoryBalanceRow,
  warehouseMap: Map<string, WarehouseRow>,
  variantLabels: Map<string, VariantLabel>
): InventoryBalanceSummary {
  const warehouse = warehouseMap.get(balance.warehouse_id);
  const variant = variantLabels.get(balance.variant_id);

  return {
    id: balance.id,
    warehouseName: warehouse?.name ?? "Unknown warehouse",
    warehouseCode: warehouse?.code ?? "UNKNOWN",
    variantLabel: variant?.label ?? balance.variant_id,
    stockCode: variant?.stockCode ?? null,
    productName: variant?.productName ?? null,
    updatedAt: balance.updated_at,
    totals: rowTotals(balance)
  };
}

function toMovementSummary(
  movement: InventoryMovementRow,
  warehouseMap: Map<string, WarehouseRow>,
  variantLabels: Map<string, VariantLabel>
): InventoryMovementSummary {
  const warehouse = warehouseMap.get(movement.warehouse_id);
  const variant = variantLabels.get(movement.variant_id);

  return {
    id: movement.id,
    warehouseName: warehouse?.name ?? "Unknown warehouse",
    warehouseCode: warehouse?.code ?? "UNKNOWN",
    variantLabel: variant?.label ?? movement.variant_id,
    stockCode: variant?.stockCode ?? null,
    movementType: movement.movement_type,
    quantityDelta: toNumber(movement.quantity_delta),
    referenceType: movement.reference_type,
    reason: movement.reason,
    createdAt: movement.created_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: InventoryReadModelState
): InventoryReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    warehouseSummaries: [],
    balanceRows: [],
    movementRows: [],
    productLabelsVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): InventoryReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    warehouseSummaries: [],
    balanceRows: [],
    movementRows: [],
    productLabelsVisible: false,
    errorMessage
  };
}

function rowTotals(row: InventoryBalanceRow): InventoryTotals {
  return {
    onHand: toNumber(row.on_hand),
    reserved: toNumber(row.reserved),
    allocated: toNumber(row.allocated),
    available: toNumber(row.available)
  };
}

function sumTotals(rows: InventoryTotals[]): InventoryTotals {
  return rows.reduce<InventoryTotals>(
    (total, row) => ({
      onHand: total.onHand + row.onHand,
      reserved: total.reserved + row.reserved,
      allocated: total.allocated + row.allocated,
      available: total.available + row.available
    }),
    {
      onHand: 0,
      reserved: 0,
      allocated: 0,
      available: 0
    }
  );
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

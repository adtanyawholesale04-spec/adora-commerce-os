import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SettingsReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type SettingsReadModel = {
  context: AdminShellContext;
  state: SettingsReadModelState;
  metrics: SettingsReadMetrics;
  organization: OrganizationSummary | null;
  subscriptions: SubscriptionSummary[];
  planFeatures: PlanFeatureSummary[];
  entitlements: EntitlementSummary[];
  usageCounters: UsageCounterSummary[];
  editVisible: boolean;
  errorMessage: string | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionSummary = {
  id: string;
  planId: string;
  planLabel: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  startedAt: string;
  updatedAt: string;
};

export type PlanFeatureSummary = {
  id: string;
  planId: string;
  planLabel: string;
  featureId: string;
  featureCode: string;
  featureName: string;
  featureType: string;
  unit: string | null;
  enabled: boolean;
  limitValue: string | null;
};

export type EntitlementSummary = {
  id: string;
  featureId: string;
  featureCode: string;
  featureName: string;
  sourceType: string;
  enabled: boolean;
  limitValue: string | null;
  validFrom: string | null;
  validUntil: string | null;
  updatedAt: string;
};

export type UsageCounterSummary = {
  id: string;
  featureId: string;
  featureCode: string;
  featureName: string;
  periodStart: string;
  periodEnd: string;
  usedQuantity: string;
  unit: string | null;
  updatedAt: string;
};

type SettingsReadMetrics = {
  subscriptionCount: number;
  activeSubscriptionCount: number;
  planFeatureCount: number;
  enabledPlanFeatureCount: number;
  entitlementCount: number;
  enabledEntitlementCount: number;
  usageCounterCount: number;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  timezone: string;
  currency_code: string;
  created_at: string;
  updated_at: string;
};

type SubscriptionRow = {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  started_at: string;
  updated_at: string;
};

type PlanRow = {
  id: string;
  code: string;
  name: string;
  billing_interval: string;
  base_price: string;
  currency_code: string;
  status: string;
};

type FeatureRow = {
  id: string;
  code: string;
  name: string;
  feature_type: string;
  unit: string | null;
  status: string;
};

type PlanFeatureRow = {
  plan_id: string;
  feature_id: string;
  enabled: boolean;
  limit_value: string | null;
};

type EntitlementRow = {
  id: string;
  feature_id: string;
  source_type: string;
  enabled: boolean;
  limit_value: string | null;
  valid_from: string | null;
  valid_until: string | null;
  updated_at: string;
};

type UsageRow = {
  id: string;
  feature_id: string;
  usage_period_start: string;
  usage_period_end: string;
  used_quantity: string;
  updated_at: string;
};

const emptyMetrics: SettingsReadMetrics = {
  subscriptionCount: 0,
  activeSubscriptionCount: 0,
  planFeatureCount: 0,
  enabledPlanFeatureCount: 0,
  entitlementCount: 0,
  enabledEntitlementCount: 0,
  usageCounterCount: 0
};

export async function getSettingsReadModel(): Promise<SettingsReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("organization.settings.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, status, timezone, currency_code, created_at, updated_at")
    .eq("id", context.activeOrganizationId)
    .maybeSingle();

  if (organizationError) {
    return queryErrorModel(context, organizationError.message);
  }

  const { data: subscriptionData, error: subscriptionError } = await supabase
    .from("organization_subscriptions")
    .select(
      "id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, cancelled_at, started_at, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (subscriptionError) {
    return queryErrorModel(context, subscriptionError.message);
  }

  const subscriptions = (subscriptionData ?? []) as SubscriptionRow[];
  const planIds = subscriptions.map((subscription) => subscription.plan_id);
  const { data: planData, error: planError } = await supabase
    .from("plans")
    .select("id, code, name, billing_interval, base_price, currency_code, status")
    .in("id", nonEmptyIds(planIds))
    .limit(25);

  if (planError) {
    return queryErrorModel(context, planError.message);
  }

  const { data: featureData, error: featureError } = await supabase
    .from("features")
    .select("id, code, name, feature_type, unit, status")
    .order("code", { ascending: true })
    .limit(250);

  if (featureError) {
    return queryErrorModel(context, featureError.message);
  }

  const { data: planFeatureData, error: planFeatureError } = await supabase
    .from("plan_features")
    .select("plan_id, feature_id, enabled, limit_value")
    .in("plan_id", nonEmptyIds(planIds))
    .limit(200);

  if (planFeatureError) {
    return queryErrorModel(context, planFeatureError.message);
  }

  const { data: entitlementData, error: entitlementError } = await supabase
    .from("organization_entitlements")
    .select("id, feature_id, source_type, enabled, limit_value, valid_from, valid_until, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (entitlementError) {
    return queryErrorModel(context, entitlementError.message);
  }

  const { data: usageData, error: usageError } = await supabase
    .from("subscription_usage")
    .select("id, feature_id, usage_period_start, usage_period_end, used_quantity, updated_at")
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (usageError) {
    return queryErrorModel(context, usageError.message);
  }

  const plans = (planData ?? []) as PlanRow[];
  const features = (featureData ?? []) as FeatureRow[];
  const planLabels = mapPlanLabels(plans);
  const featureLabels = mapFeatureLabels(features);
  const planFeatures = ((planFeatureData ?? []) as PlanFeatureRow[]).map((planFeature) =>
    toPlanFeatureSummary(planFeature, planLabels, featureLabels)
  );
  const entitlements = ((entitlementData ?? []) as EntitlementRow[]).map((entitlement) =>
    toEntitlementSummary(entitlement, featureLabels)
  );
  const usageCounters = ((usageData ?? []) as UsageRow[]).map((usage) =>
    toUsageCounterSummary(usage, featureLabels)
  );

  return {
    context,
    state: "ready",
    metrics: {
      subscriptionCount: subscriptions.length,
      activeSubscriptionCount: subscriptions.filter((subscription) =>
        ["TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED"].includes(subscription.status)
      ).length,
      planFeatureCount: planFeatures.length,
      enabledPlanFeatureCount: planFeatures.filter((feature) => feature.enabled).length,
      entitlementCount: entitlements.length,
      enabledEntitlementCount: entitlements.filter((entitlement) => entitlement.enabled).length,
      usageCounterCount: usageCounters.length
    },
    organization: organizationData ? toOrganizationSummary(organizationData as OrganizationRow) : null,
    subscriptions: subscriptions.map((subscription) => toSubscriptionSummary(subscription, planLabels)),
    planFeatures,
    entitlements,
    usageCounters,
    editVisible: context.permissions.includes("organization.settings.edit"),
    errorMessage: null
  };
}

function mapPlanLabels(rows: PlanRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((plan) => {
    labels.set(plan.id, `${plan.code} / ${plan.name}`);
  });
  return labels;
}

function mapFeatureLabels(rows: FeatureRow[]) {
  const labels = new Map<string, { code: string; name: string; featureType: string; unit: string | null }>();
  rows.forEach((feature) => {
    labels.set(feature.id, {
      code: feature.code,
      name: feature.name,
      featureType: feature.feature_type,
      unit: feature.unit
    });
  });
  return labels;
}

function toOrganizationSummary(row: OrganizationRow): OrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    timezone: row.timezone,
    currencyCode: row.currency_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toSubscriptionSummary(
  row: SubscriptionRow,
  planLabels: Map<string, string>
): SubscriptionSummary {
  return {
    id: row.id,
    planId: row.plan_id,
    planLabel: planLabels.get(row.plan_id) ?? row.plan_id,
    status: row.status,
    billingCycle: row.billing_cycle,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    trialEndsAt: row.trial_ends_at,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    cancelledAt: row.cancelled_at,
    startedAt: row.started_at,
    updatedAt: row.updated_at
  };
}

function toPlanFeatureSummary(
  row: PlanFeatureRow,
  planLabels: Map<string, string>,
  featureLabels: Map<string, { code: string; name: string; featureType: string; unit: string | null }>
): PlanFeatureSummary {
  const feature = featureLabels.get(row.feature_id);

  return {
    id: `${row.plan_id}:${row.feature_id}`,
    planId: row.plan_id,
    planLabel: planLabels.get(row.plan_id) ?? row.plan_id,
    featureId: row.feature_id,
    featureCode: feature?.code ?? row.feature_id,
    featureName: feature?.name ?? row.feature_id,
    featureType: feature?.featureType ?? "-",
    unit: feature?.unit ?? null,
    enabled: row.enabled,
    limitValue: row.limit_value
  };
}

function toEntitlementSummary(
  row: EntitlementRow,
  featureLabels: Map<string, { code: string; name: string; featureType: string; unit: string | null }>
): EntitlementSummary {
  const feature = featureLabels.get(row.feature_id);

  return {
    id: row.id,
    featureId: row.feature_id,
    featureCode: feature?.code ?? row.feature_id,
    featureName: feature?.name ?? row.feature_id,
    sourceType: row.source_type,
    enabled: row.enabled,
    limitValue: row.limit_value,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    updatedAt: row.updated_at
  };
}

function toUsageCounterSummary(
  row: UsageRow,
  featureLabels: Map<string, { code: string; name: string; featureType: string; unit: string | null }>
): UsageCounterSummary {
  const feature = featureLabels.get(row.feature_id);

  return {
    id: row.id,
    featureId: row.feature_id,
    featureCode: feature?.code ?? row.feature_id,
    featureName: feature?.name ?? row.feature_id,
    periodStart: row.usage_period_start,
    periodEnd: row.usage_period_end,
    usedQuantity: row.used_quantity,
    unit: feature?.unit ?? null,
    updatedAt: row.updated_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: SettingsReadModelState
): SettingsReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    organization: null,
    subscriptions: [],
    planFeatures: [],
    entitlements: [],
    usageCounters: [],
    editVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): SettingsReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    organization: null,
    subscriptions: [],
    planFeatures: [],
    entitlements: [],
    usageCounters: [],
    editVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

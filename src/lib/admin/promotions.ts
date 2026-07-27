import { getAdminShellContext, type AdminShellContext } from "@/lib/admin/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PromotionsReadModelState =
  | "missing_env"
  | "anonymous"
  | "missing_membership"
  | "permission_denied"
  | "ready"
  | "query_error";

export type PromotionsReadModel = {
  context: AdminShellContext;
  state: PromotionsReadModelState;
  metrics: PromotionsReadMetrics;
  campaigns: PromotionCampaignSummary[];
  versions: PromotionVersionSummary[];
  rules: PromotionRuleSummary[];
  actions: PromotionActionSummary[];
  coupons: CouponSummary[];
  triggerCodes: PromotionTriggerCodeSummary[];
  appliedBenefits: PromotionAppliedBenefitSummary[];
  createVisible: boolean;
  publishVisible: boolean;
  orderLabelsVisible: boolean;
  errorMessage: string | null;
};

export type PromotionCampaignSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  scope: string;
  priority: number;
  stackable: boolean;
  exclusiveGroup: string | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  currencyCode: string;
  versionCount: number;
  latestVersionStatus: string | null;
  updatedAt: string;
};

export type PromotionVersionSummary = {
  id: string;
  campaignId: string;
  campaignLabel: string;
  versionNumber: number;
  status: string;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  publishedAt: string | null;
  createdAt: string;
};

export type PromotionRuleSummary = {
  id: string;
  campaignVersionId: string;
  versionLabel: string;
  ruleType: string;
  scopeType: string | null;
  minQuantity: number | null;
  minSpend: number | null;
  repeatable: boolean;
  maxRepeatCount: number | null;
  priority: number;
  createdAt: string;
};

export type PromotionActionSummary = {
  id: string;
  campaignVersionId: string;
  versionLabel: string;
  ruleId: string | null;
  actionType: string;
  priority: number;
  stackable: boolean;
  exclusiveGroup: string | null;
  maxDiscountAmount: number | null;
  createdAt: string;
};

export type CouponSummary = {
  id: string;
  campaignVersionId: string | null;
  versionLabel: string | null;
  code: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  customerId: string | null;
  createdAt: string;
};

export type PromotionTriggerCodeSummary = {
  id: string;
  campaignVersionId: string;
  versionLabel: string;
  code: string;
  triggerType: string;
  status: string;
  activeFrom: string | null;
  activeUntil: string | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  createdAt: string;
};

export type PromotionAppliedBenefitSummary = {
  id: string;
  orderId: string;
  orderLabel: string;
  campaignLabel: string;
  versionLabel: string;
  benefitType: string;
  originalAmount: number | null;
  benefitAmount: number | null;
  finalAmount: number | null;
  quantity: number | null;
  createdAt: string;
};

type PromotionsReadMetrics = {
  campaignCount: number;
  activeCampaignCount: number;
  versionCount: number;
  publishedVersionCount: number;
  ruleCount: number;
  actionCount: number;
  couponCount: number;
  triggerCodeCount: number;
  appliedBenefitCount: number;
  totalBenefitAmount: number;
};

type CampaignRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  scope: string;
  priority: number;
  stackable: boolean;
  exclusive_group: string | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  currency_code: string;
  updated_at: string;
};

type VersionRow = {
  id: string;
  campaign_id: string;
  version_number: number;
  status: string;
  effective_from: string | null;
  effective_until: string | null;
  published_at: string | null;
  created_at: string;
};

type RuleRow = {
  id: string;
  campaign_version_id: string;
  rule_type: string;
  scope_type: string | null;
  min_quantity: number | string | null;
  min_spend: number | string | null;
  repeatable: boolean;
  max_repeat_count: number | null;
  priority: number;
  created_at: string;
};

type ActionRow = {
  id: string;
  campaign_version_id: string;
  rule_id: string | null;
  action_type: string;
  priority: number;
  stackable: boolean;
  exclusive_group: string | null;
  max_discount_amount: number | string | null;
  created_at: string;
};

type CouponRow = {
  id: string;
  campaign_version_id: string | null;
  code: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  customer_id: string | null;
  created_at: string;
};

type TriggerCodeRow = {
  id: string;
  campaign_version_id: string;
  code: string;
  trigger_type: string;
  status: string;
  active_from: string | null;
  active_until: string | null;
  usage_limit: number | null;
  usage_limit_per_customer: number | null;
  created_at: string;
};

type AppliedBenefitRow = {
  id: string;
  order_id: string;
  campaign_id: string;
  campaign_version_id: string;
  benefit_type: string;
  original_amount: number | string | null;
  benefit_amount: number | string | null;
  final_amount: number | string | null;
  quantity: number | string | null;
  created_at: string;
};

type OrderLabelRow = {
  id: string;
  order_number: string;
};

const emptyMetrics: PromotionsReadMetrics = {
  campaignCount: 0,
  activeCampaignCount: 0,
  versionCount: 0,
  publishedVersionCount: 0,
  ruleCount: 0,
  actionCount: 0,
  couponCount: 0,
  triggerCodeCount: 0,
  appliedBenefitCount: 0,
  totalBenefitAmount: 0
};

export async function getPromotionsReadModel(): Promise<PromotionsReadModel> {
  const context = await getAdminShellContext();

  if (context.mode !== "configured") {
    return emptyModel(context, context.mode);
  }

  if (!context.activeOrganizationId) {
    return emptyModel(context, "missing_membership");
  }

  if (!context.permissions.includes("promotion.view")) {
    return emptyModel(context, "permission_denied");
  }

  const supabase = await createSupabaseServerClient();
  const { data: campaignData, error: campaignError } = await supabase
    .from("promotion_campaigns")
    .select(
      "id, code, name, description, status, scope, priority, stackable, exclusive_group, usage_limit, usage_limit_per_customer, currency_code, updated_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .order("updated_at", { ascending: false })
    .limit(75);

  if (campaignError) {
    return queryErrorModel(context, campaignError.message);
  }

  const campaigns = (campaignData ?? []) as CampaignRow[];
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const { data: versionData, error: versionError } = await supabase
    .from("promotion_campaign_versions")
    .select("id, campaign_id, version_number, status, effective_from, effective_until, published_at, created_at")
    .eq("organization_id", context.activeOrganizationId)
    .in("campaign_id", nonEmptyIds(campaignIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (versionError) {
    return queryErrorModel(context, versionError.message);
  }

  const versions = (versionData ?? []) as VersionRow[];
  const versionIds = versions.map((version) => version.id);
  const { data: ruleData, error: ruleError } = await supabase
    .from("promotion_rules")
    .select(
      "id, campaign_version_id, rule_type, scope_type, min_quantity, min_spend, repeatable, max_repeat_count, priority, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("campaign_version_id", nonEmptyIds(versionIds))
    .order("created_at", { ascending: false })
    .limit(200);

  if (ruleError) {
    return queryErrorModel(context, ruleError.message);
  }

  const { data: actionData, error: actionError } = await supabase
    .from("promotion_actions")
    .select(
      "id, campaign_version_id, rule_id, action_type, priority, stackable, exclusive_group, max_discount_amount, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("campaign_version_id", nonEmptyIds(versionIds))
    .order("created_at", { ascending: false })
    .limit(200);

  if (actionError) {
    return queryErrorModel(context, actionError.message);
  }

  const { data: couponData, error: couponError } = await supabase
    .from("coupons")
    .select(
      "id, campaign_version_id, code, status, starts_at, ends_at, usage_limit, usage_limit_per_customer, customer_id, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("campaign_version_id", nonEmptyIds(versionIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (couponError) {
    return queryErrorModel(context, couponError.message);
  }

  const { data: triggerData, error: triggerError } = await supabase
    .from("promotion_trigger_codes")
    .select(
      "id, campaign_version_id, code, trigger_type, status, active_from, active_until, usage_limit, usage_limit_per_customer, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("campaign_version_id", nonEmptyIds(versionIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (triggerError) {
    return queryErrorModel(context, triggerError.message);
  }

  const { data: appliedData, error: appliedError } = await supabase
    .from("promotion_applied_benefits")
    .select(
      "id, order_id, campaign_id, campaign_version_id, benefit_type, original_amount, benefit_amount, final_amount, quantity, created_at"
    )
    .eq("organization_id", context.activeOrganizationId)
    .in("campaign_id", nonEmptyIds(campaignIds))
    .order("created_at", { ascending: false })
    .limit(150);

  if (appliedError) {
    return queryErrorModel(context, appliedError.message);
  }

  const orderLabelsVisible = context.permissions.includes("order.view");
  const orderLabels = orderLabelsVisible
    ? await loadOrderLabels(
        supabase,
        context.activeOrganizationId,
        ((appliedData ?? []) as AppliedBenefitRow[]).map((benefit) => benefit.order_id)
      )
    : { labels: new Map<string, string>(), errorMessage: null };

  if (orderLabels.errorMessage) {
    return queryErrorModel(context, orderLabels.errorMessage);
  }

  const campaignLabels = mapCampaignLabels(campaigns);
  const versionLabels = mapVersionLabels(versions, campaignLabels);
  const versionCounts = mapVersionCounts(versions);
  const latestVersionStatuses = mapLatestVersionStatuses(versions);
  const campaignSummaries = campaigns.map((campaign) =>
    toCampaignSummary(campaign, versionCounts, latestVersionStatuses)
  );
  const versionSummaries = versions.map((version) =>
    toVersionSummary(version, campaignLabels)
  );
  const ruleSummaries = ((ruleData ?? []) as RuleRow[]).map((rule) =>
    toRuleSummary(rule, versionLabels)
  );
  const actionSummaries = ((actionData ?? []) as ActionRow[]).map((action) =>
    toActionSummary(action, versionLabels)
  );
  const couponSummaries = ((couponData ?? []) as CouponRow[]).map((coupon) =>
    toCouponSummary(coupon, versionLabels)
  );
  const triggerSummaries = ((triggerData ?? []) as TriggerCodeRow[]).map((trigger) =>
    toTriggerSummary(trigger, versionLabels)
  );
  const appliedSummaries = ((appliedData ?? []) as AppliedBenefitRow[]).map((benefit) =>
    toAppliedBenefitSummary(benefit, campaignLabels, versionLabels, orderLabels.labels)
  );

  return {
    context,
    state: "ready",
    metrics: {
      campaignCount: campaignSummaries.length,
      activeCampaignCount: campaignSummaries.filter((campaign) => campaign.status === "ACTIVE").length,
      versionCount: versionSummaries.length,
      publishedVersionCount: versionSummaries.filter((version) =>
        ["PUBLISHED", "ACTIVE"].includes(version.status)
      ).length,
      ruleCount: ruleSummaries.length,
      actionCount: actionSummaries.length,
      couponCount: couponSummaries.length,
      triggerCodeCount: triggerSummaries.length,
      appliedBenefitCount: appliedSummaries.length,
      totalBenefitAmount: appliedSummaries.reduce(
        (total, benefit) => total + (benefit.benefitAmount ?? 0),
        0
      )
    },
    campaigns: campaignSummaries,
    versions: versionSummaries,
    rules: ruleSummaries,
    actions: actionSummaries,
    coupons: couponSummaries,
    triggerCodes: triggerSummaries,
    appliedBenefits: appliedSummaries,
    createVisible: context.permissions.includes("promotion.create"),
    publishVisible: context.permissions.includes("promotion.publish"),
    orderLabelsVisible,
    errorMessage: null
  };
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

function mapCampaignLabels(rows: CampaignRow[]) {
  const labels = new Map<string, string>();
  rows.forEach((campaign) => labels.set(campaign.id, `${campaign.code} / ${campaign.name}`));
  return labels;
}

function mapVersionLabels(rows: VersionRow[], campaignLabels: Map<string, string>) {
  const labels = new Map<string, string>();
  rows.forEach((version) => {
    const campaignLabel = campaignLabels.get(version.campaign_id) ?? version.campaign_id;
    labels.set(version.id, `${campaignLabel} v${version.version_number}`);
  });
  return labels;
}

function mapVersionCounts(rows: VersionRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((version) => counts.set(version.campaign_id, (counts.get(version.campaign_id) ?? 0) + 1));
  return counts;
}

function mapLatestVersionStatuses(rows: VersionRow[]) {
  const statuses = new Map<string, string>();
  rows.forEach((version) => {
    if (!statuses.has(version.campaign_id)) {
      statuses.set(version.campaign_id, version.status);
    }
  });
  return statuses;
}

function toCampaignSummary(
  campaign: CampaignRow,
  versionCounts: Map<string, number>,
  latestVersionStatuses: Map<string, string>
): PromotionCampaignSummary {
  return {
    id: campaign.id,
    code: campaign.code,
    name: campaign.name,
    description: campaign.description,
    status: campaign.status,
    scope: campaign.scope,
    priority: campaign.priority,
    stackable: campaign.stackable,
    exclusiveGroup: campaign.exclusive_group,
    usageLimit: campaign.usage_limit,
    usageLimitPerCustomer: campaign.usage_limit_per_customer,
    currencyCode: campaign.currency_code,
    versionCount: versionCounts.get(campaign.id) ?? 0,
    latestVersionStatus: latestVersionStatuses.get(campaign.id) ?? null,
    updatedAt: campaign.updated_at
  };
}

function toVersionSummary(
  version: VersionRow,
  campaignLabels: Map<string, string>
): PromotionVersionSummary {
  return {
    id: version.id,
    campaignId: version.campaign_id,
    campaignLabel: campaignLabels.get(version.campaign_id) ?? version.campaign_id,
    versionNumber: version.version_number,
    status: version.status,
    effectiveFrom: version.effective_from,
    effectiveUntil: version.effective_until,
    publishedAt: version.published_at,
    createdAt: version.created_at
  };
}

function toRuleSummary(rule: RuleRow, versionLabels: Map<string, string>): PromotionRuleSummary {
  return {
    id: rule.id,
    campaignVersionId: rule.campaign_version_id,
    versionLabel: versionLabels.get(rule.campaign_version_id) ?? rule.campaign_version_id,
    ruleType: rule.rule_type,
    scopeType: rule.scope_type,
    minQuantity: rule.min_quantity == null ? null : toNumber(rule.min_quantity),
    minSpend: rule.min_spend == null ? null : toNumber(rule.min_spend),
    repeatable: rule.repeatable,
    maxRepeatCount: rule.max_repeat_count,
    priority: rule.priority,
    createdAt: rule.created_at
  };
}

function toActionSummary(action: ActionRow, versionLabels: Map<string, string>): PromotionActionSummary {
  return {
    id: action.id,
    campaignVersionId: action.campaign_version_id,
    versionLabel: versionLabels.get(action.campaign_version_id) ?? action.campaign_version_id,
    ruleId: action.rule_id,
    actionType: action.action_type,
    priority: action.priority,
    stackable: action.stackable,
    exclusiveGroup: action.exclusive_group,
    maxDiscountAmount: action.max_discount_amount == null ? null : toNumber(action.max_discount_amount),
    createdAt: action.created_at
  };
}

function toCouponSummary(coupon: CouponRow, versionLabels: Map<string, string>): CouponSummary {
  return {
    id: coupon.id,
    campaignVersionId: coupon.campaign_version_id,
    versionLabel: coupon.campaign_version_id
      ? versionLabels.get(coupon.campaign_version_id) ?? coupon.campaign_version_id
      : null,
    code: coupon.code,
    status: coupon.status,
    startsAt: coupon.starts_at,
    endsAt: coupon.ends_at,
    usageLimit: coupon.usage_limit,
    usageLimitPerCustomer: coupon.usage_limit_per_customer,
    customerId: coupon.customer_id,
    createdAt: coupon.created_at
  };
}

function toTriggerSummary(
  trigger: TriggerCodeRow,
  versionLabels: Map<string, string>
): PromotionTriggerCodeSummary {
  return {
    id: trigger.id,
    campaignVersionId: trigger.campaign_version_id,
    versionLabel: versionLabels.get(trigger.campaign_version_id) ?? trigger.campaign_version_id,
    code: trigger.code,
    triggerType: trigger.trigger_type,
    status: trigger.status,
    activeFrom: trigger.active_from,
    activeUntil: trigger.active_until,
    usageLimit: trigger.usage_limit,
    usageLimitPerCustomer: trigger.usage_limit_per_customer,
    createdAt: trigger.created_at
  };
}

function toAppliedBenefitSummary(
  benefit: AppliedBenefitRow,
  campaignLabels: Map<string, string>,
  versionLabels: Map<string, string>,
  orderLabels: Map<string, string>
): PromotionAppliedBenefitSummary {
  return {
    id: benefit.id,
    orderId: benefit.order_id,
    orderLabel: orderLabels.get(benefit.order_id) ?? benefit.order_id,
    campaignLabel: campaignLabels.get(benefit.campaign_id) ?? benefit.campaign_id,
    versionLabel: versionLabels.get(benefit.campaign_version_id) ?? benefit.campaign_version_id,
    benefitType: benefit.benefit_type,
    originalAmount: benefit.original_amount == null ? null : toNumber(benefit.original_amount),
    benefitAmount: benefit.benefit_amount == null ? null : toNumber(benefit.benefit_amount),
    finalAmount: benefit.final_amount == null ? null : toNumber(benefit.final_amount),
    quantity: benefit.quantity == null ? null : toNumber(benefit.quantity),
    createdAt: benefit.created_at
  };
}

function emptyModel(
  context: AdminShellContext,
  state: PromotionsReadModelState
): PromotionsReadModel {
  return {
    context,
    state,
    metrics: emptyMetrics,
    campaigns: [],
    versions: [],
    rules: [],
    actions: [],
    coupons: [],
    triggerCodes: [],
    appliedBenefits: [],
    createVisible: false,
    publishVisible: false,
    orderLabelsVisible: false,
    errorMessage: null
  };
}

function queryErrorModel(
  context: AdminShellContext,
  errorMessage: string
): PromotionsReadModel {
  return {
    context,
    state: "query_error",
    metrics: emptyMetrics,
    campaigns: [],
    versions: [],
    rules: [],
    actions: [],
    coupons: [],
    triggerCodes: [],
    appliedBenefits: [],
    createVisible: false,
    publishVisible: false,
    orderLabelsVisible: false,
    errorMessage
  };
}

function nonEmptyIds(ids: string[]) {
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

function toNumber(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

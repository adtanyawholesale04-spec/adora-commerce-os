import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CircleSlash,
  FileText,
  ListChecks,
  Percent,
  ShieldCheck,
  Ticket
} from "lucide-react";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";
import {
  getPromotionsReadModel,
  type CouponSummary,
  type PromotionActionSummary,
  type PromotionAppliedBenefitSummary,
  type PromotionCampaignSummary,
  type PromotionRuleSummary,
  type PromotionTriggerCodeSummary,
  type PromotionVersionSummary
} from "@/lib/admin/promotions";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const model = await getPromotionsReadModel();
  const canReadPromotions = model.state === "ready";

  return (
    <main className="min-h-screen bg-surface text-ink">
      <header className="border-b-4 border-b-brand bg-panel px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {copy.common.admin}
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <Percent aria-hidden className="h-6 w-6 text-brand" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand">
                  {copy.promotions.pageCode}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {copy.promotions.pageTitle}
                </h1>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <AdminPreferenceSwitcher preferences={preferences} returnPath="/admin/promotions" />
            <div className="grid gap-1 rounded-lg border border-line bg-panel-strong px-3 py-2 text-sm">
              <span className="font-medium">
                {model.context.organizationName ?? copy.common.noOrganization}
              </span>
              <span className="text-muted">
                {model.context.userEmail ?? copy.common.anonymous} /{" "}
                {copy.promotions.promotionAccess}:{" "}
                {permissionLabel(model.context.permissions, "promotion.view", preferences.locale)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label={copy.promotions.campaigns} value={model.metrics.campaignCount.toString()} />
          <Metric label={copy.promotions.activeCampaigns} value={model.metrics.activeCampaignCount.toString()} />
          <Metric label={copy.promotions.rulesAndActions} value={`${model.metrics.ruleCount}/${model.metrics.actionCount}`} />
          <Metric
            label={copy.promotions.totalBenefitAmount}
            value={formatMoney(model.metrics.totalBenefitAmount, preferences.locale)}
          />
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-6">
            {!canReadPromotions ? (
              <EmptyState
                title={copy.promotionStates[model.state].title}
                detail={
                  model.errorMessage
                    ? `${copy.promotionStates[model.state].detail} ${model.errorMessage}`
                    : copy.promotionStates[model.state].detail
                }
              />
            ) : (
              <>
                <CampaignsTable copy={copy.promotions} campaigns={model.campaigns} locale={preferences.locale} />
                <VersionsTable copy={copy.promotions} versions={model.versions} locale={preferences.locale} />
                <RulesTable copy={copy.promotions} rules={model.rules} locale={preferences.locale} />
                <ActionsTable copy={copy.promotions} actions={model.actions} locale={preferences.locale} />
                <CouponsTable
                  copy={copy.promotions}
                  coupons={model.coupons}
                  triggerCodes={model.triggerCodes}
                  locale={preferences.locale}
                />
                <AppliedBenefitsTable
                  copy={copy.promotions}
                  benefits={model.appliedBenefits}
                  locale={preferences.locale}
                />
              </>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <BoundaryPanel
              icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />}
              title={copy.promotions.readBoundary}
              rows={[
                [copy.products.tenant, model.context.organizationName ?? copy.common.unavailable],
                [
                  copy.promotions.promotionAccess,
                  permissionLabel(model.context.permissions, "promotion.view", preferences.locale)
                ],
                [
                  copy.promotions.createPermission,
                  model.createVisible ? copy.common.granted : `${copy.common.requires} promotion.create`
                ],
                [
                  copy.promotions.publishPermission,
                  model.publishVisible ? copy.common.granted : `${copy.common.requires} promotion.publish`
                ],
                [
                  copy.promotions.orderLabels,
                  model.orderLabelsVisible ? copy.promotions.visibleWithOrderView : copy.promotions.hiddenWithoutOrderView
                ]
              ]}
            />
            <BoundaryPanel
              icon={<CircleSlash aria-hidden className="h-4 w-4 text-danger" />}
              title={copy.promotions.blockedInScreen}
              rows={[
                [copy.promotions.createEdit, copy.promotions.serviceRequired],
                [copy.promotions.publishValidate, copy.promotions.engineRequired],
                [copy.promotions.previewSimulator, copy.promotions.productionEngineOnly],
                [copy.promotions.checkoutEvaluation, copy.promotions.serverEngineOnly],
                [copy.promotions.rewriteAppliedBenefits, copy.promotions.forbiddenHistoricalRewrite]
              ]}
            />
            <BoundaryPanel
              icon={<Boxes aria-hidden className="h-4 w-4 text-accent" />}
              title={copy.promotions.snapshotScope}
              rows={[
                [copy.promotions.campaignLimit, copy.promotions.seventyFiveLatest],
                [copy.promotions.versionLimit, copy.promotions.oneHundredFiftyLatest],
                [copy.promotions.ruleActionLimit, copy.promotions.twoHundredLatest],
                [copy.promotions.couponTriggerLimit, copy.promotions.oneHundredFiftyLatest],
                [copy.promotions.appliedBenefitLimit, copy.promotions.oneHundredFiftyLatest],
                [copy.promotions.rawConfig, copy.promotions.notSelected]
              ]}
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function CampaignsTable({
  copy,
  campaigns,
  locale
}: {
  copy: Record<string, string>;
  campaigns: PromotionCampaignSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<Percent aria-hidden className="h-4 w-4 text-brand" />} title={copy.campaignQueue} count={`${campaigns.length} ${copy.campaigns}`} />
      {campaigns.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noCampaigns}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.campaign}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.scope}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.priority}</th>
                <th className="px-5 py-3 font-medium">{copy.stacking}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.usageLimit}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.versions}</th>
                <th className="px-5 py-3 font-medium">{copy.latestVersion}</th>
                <th className="px-5 py-3 font-medium">{copy.updated}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{campaign.code}</p>
                    <p className="max-w-[260px] truncate text-xs text-muted">{campaign.name}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={campaign.status} /></td>
                  <td className="px-5 py-4">{campaign.scope}</td>
                  <td className="px-5 py-4 text-right font-medium">{campaign.priority}</td>
                  <td className="px-5 py-4">
                    <p>{campaign.stackable ? copy.stackable : copy.exclusive}</p>
                    <p className="max-w-[160px] truncate text-xs text-muted">{campaign.exclusiveGroup ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalNumber(campaign.usageLimit, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{campaign.versionCount}</td>
                  <td className="px-5 py-4">{campaign.latestVersionStatus ? <StatusBadge status={campaign.latestVersionStatus} /> : "-"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(campaign.updatedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function VersionsTable({
  copy,
  versions,
  locale
}: {
  copy: Record<string, string>;
  versions: PromotionVersionSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<FileText aria-hidden className="h-4 w-4 text-brand" />} title={copy.versionHistory} count={`${versions.length} ${copy.versions}`} />
      {versions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noVersions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.campaign}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.version}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 font-medium">{copy.effectiveFrom}</th>
                <th className="px-5 py-3 font-medium">{copy.effectiveUntil}</th>
                <th className="px-5 py-3 font-medium">{copy.published}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {versions.map((version) => (
                <tr key={version.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4"><p className="max-w-[360px] truncate font-semibold">{version.campaignLabel}</p></td>
                  <td className="px-5 py-4 text-right font-medium">v{version.versionNumber}</td>
                  <td className="px-5 py-4"><StatusBadge status={version.status} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(version.effectiveFrom, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(version.effectiveUntil, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatOptionalDate(version.publishedAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RulesTable({
  copy,
  rules,
  locale
}: {
  copy: Record<string, string>;
  rules: PromotionRuleSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<ListChecks aria-hidden className="h-4 w-4 text-brand" />} title={copy.ruleList} count={`${rules.length} ${copy.rules}`} />
      {rules.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noRules}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.version}</th>
                <th className="px-5 py-3 font-medium">{copy.ruleType}</th>
                <th className="px-5 py-3 font-medium">{copy.scope}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.minQuantity}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.minSpend}</th>
                <th className="px-5 py-3 font-medium">{copy.repeatable}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.priority}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4"><p className="max-w-[340px] truncate font-semibold">{rule.versionLabel}</p></td>
                  <td className="px-5 py-4">{rule.ruleType}</td>
                  <td className="px-5 py-4">{rule.scopeType ?? "-"}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalNumber(rule.minQuantity, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalMoney(rule.minSpend, locale)}</td>
                  <td className="px-5 py-4"><StatusBadge status={rule.repeatable ? "REPEATABLE" : "ONCE"} /></td>
                  <td className="px-5 py-4 text-right font-medium">{rule.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ActionsTable({
  copy,
  actions,
  locale
}: {
  copy: Record<string, string>;
  actions: PromotionActionSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<Percent aria-hidden className="h-4 w-4 text-brand" />} title={copy.actionList} count={`${actions.length} ${copy.actions}`} />
      {actions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noActions}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.version}</th>
                <th className="px-5 py-3 font-medium">{copy.actionType}</th>
                <th className="px-5 py-3 font-medium">{copy.stacking}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.maxDiscount}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.priority}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {actions.map((action) => (
                <tr key={action.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4"><p className="max-w-[340px] truncate font-semibold">{action.versionLabel}</p></td>
                  <td className="px-5 py-4">{action.actionType}</td>
                  <td className="px-5 py-4">
                    <p>{action.stackable ? copy.stackable : copy.exclusive}</p>
                    <p className="max-w-[160px] truncate text-xs text-muted">{action.exclusiveGroup ?? "-"}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalMoney(action.maxDiscountAmount, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{action.priority}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(action.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CouponsTable({
  copy,
  coupons,
  triggerCodes,
  locale
}: {
  copy: Record<string, string>;
  coupons: CouponSummary[];
  triggerCodes: PromotionTriggerCodeSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<Ticket aria-hidden className="h-4 w-4 text-brand" />} title={copy.couponAndTriggers} count={`${coupons.length + triggerCodes.length} ${copy.codes}`} />
      <div className="grid min-w-0 gap-0 xl:grid-cols-2">
        <MiniCodeTable copy={copy} title={copy.coupons} empty={copy.noCoupons} rows={coupons} locale={locale} kind="coupon" />
        <MiniCodeTable copy={copy} title={copy.triggerCodes} empty={copy.noTriggerCodes} rows={triggerCodes} locale={locale} kind="trigger" />
      </div>
    </section>
  );
}

function MiniCodeTable({
  copy,
  title,
  empty,
  rows,
  locale,
  kind
}: {
  copy: Record<string, string>;
  title: string;
  empty: string;
  rows: Array<CouponSummary | PromotionTriggerCodeSummary>;
  locale: "th" | "en";
  kind: "coupon" | "trigger";
}) {
  return (
    <div className="min-w-0 border-t border-line xl:border-r xl:border-t-0">
      <div className="border-b border-line bg-panel-strong px-5 py-3 text-sm font-semibold">{title}</div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.code}</th>
                <th className="px-5 py-3 font-medium">{copy.status}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.usageLimit}</th>
                <th className="px-5 py-3 font-medium">{copy.window}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{row.code}</p>
                    <p className="max-w-[240px] truncate text-xs text-muted">
                      {kind === "trigger" ? (row as PromotionTriggerCodeSummary).triggerType : row.versionLabel ?? "-"}
                    </p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalNumber(row.usageLimit, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">
                    {kind === "trigger"
                      ? formatDateWindow((row as PromotionTriggerCodeSummary).activeFrom, (row as PromotionTriggerCodeSummary).activeUntil, locale)
                      : formatDateWindow((row as CouponSummary).startsAt, (row as CouponSummary).endsAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AppliedBenefitsTable({
  copy,
  benefits,
  locale
}: {
  copy: Record<string, string>;
  benefits: PromotionAppliedBenefitSummary[];
  locale: "th" | "en";
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <SectionHeader icon={<ShieldCheck aria-hidden className="h-4 w-4 text-brand" />} title={copy.appliedBenefits} count={`${benefits.length} ${copy.benefits}`} />
      {benefits.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{copy.noAppliedBenefits}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-panel-strong text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">{copy.order}</th>
                <th className="px-5 py-3 font-medium">{copy.campaign}</th>
                <th className="px-5 py-3 font-medium">{copy.benefitType}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.originalAmount}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.benefitAmount}</th>
                <th className="px-5 py-3 text-right font-medium">{copy.finalAmount}</th>
                <th className="px-5 py-3 font-medium">{copy.created}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {benefits.map((benefit) => (
                <tr key={benefit.id} className="hover:bg-panel-strong/60">
                  <td className="px-5 py-4"><p className="max-w-[180px] truncate font-semibold">{benefit.orderLabel}</p></td>
                  <td className="px-5 py-4"><p className="max-w-[300px] truncate">{benefit.campaignLabel}</p></td>
                  <td className="px-5 py-4"><StatusBadge status={benefit.benefitType} /></td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalMoney(benefit.originalAmount, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalMoney(benefit.benefitAmount, locale)}</td>
                  <td className="px-5 py-4 text-right font-medium">{formatOptionalMoney(benefit.finalAmount, locale)}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{formatDate(benefit.createdAt, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SectionHeader({ icon, title, count }: { icon: ReactNode; title: string; count: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <span className="text-xs text-muted">{count}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line border-t-2 border-t-brand bg-panel p-5 shadow-[var(--shadow-panel)]">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${statusBadgeClass(status)}`}>
      {status}
    </span>
  );
}

function statusBadgeClass(status: string) {
  if (["ACTIVE", "PUBLISHED", "CONSUMED", "FIXED_DISCOUNT", "PERCENT_DISCOUNT", "FREE_SHIPPING"].includes(status)) {
    return "border-success/30 bg-success/10 text-success";
  }

  if (["ENDED", "ARCHIVED", "CANCELLED", "EXPIRED", "DISABLED", "REJECTED"].includes(status)) {
    return "border-danger/30 bg-danger/10 text-danger";
  }

  if (["DRAFT", "VALIDATING", "PAUSED", "INACTIVE", "RESERVED", "REPEATABLE"].includes(status)) {
    return "border-warning/30 bg-warning/10 text-accent";
  }

  return "border-line bg-panel-strong text-muted";
}

function BoundaryPanel({
  icon,
  title,
  rows
}: {
  icon: ReactNode;
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        {icon}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <dl className="grid gap-3 px-5 py-4">
        {rows.map(([label, value], index) => (
          <div key={`${label}-${index}`} className="grid gap-1">
            <dt className="text-xs uppercase text-muted">{label}</dt>
            <dd className="break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-lg border border-line bg-panel px-6 py-16 text-center shadow-[var(--shadow-panel)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-accent">
        <AlertCircle aria-hidden className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{detail}</p>
    </div>
  );
}

function permissionLabel(permissions: string[], permission: string, locale: "th" | "en") {
  const copy = adminCopy[locale].common;
  return permissions.includes(permission) ? copy.granted : `${copy.requires} ${permission}`;
}

function formatOptionalNumber(value: number | null, locale: "th" | "en") {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 3
  }).format(value);
}

function formatMoney(value: number, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2
  }).format(value);
}

function formatOptionalMoney(value: number | null, locale: "th" | "en") {
  return value == null ? "-" : formatMoney(value, locale);
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null, locale: "th" | "en") {
  return value ? formatDate(value, locale) : "-";
}

function formatDateWindow(start: string | null, end: string | null, locale: "th" | "en") {
  return `${formatOptionalDate(start, locale)} - ${formatOptionalDate(end, locale)}`;
}

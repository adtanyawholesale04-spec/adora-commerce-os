import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PackageCheck,
  PackageX,
  ShoppingBag,
} from "lucide-react";
import { StorefrontShell } from "@/app/store/_components/storefront-shell";
import { StorefrontState } from "@/app/store/_components/storefront-state";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { storefrontCopy } from "@/lib/storefront/i18n";
import {
  getStorefrontProductPageModel,
  type StorefrontProduct,
  type StorefrontVariant,
  type VariantCursor,
} from "@/lib/storefront/service";

export const dynamic = "force-dynamic";

type ProductPageProps = {
  params: Promise<{ organizationSlug: string; productHandle: string }>;
  searchParams: Promise<{ afterName?: string; afterVariant?: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { organizationSlug, productHandle } = await params;
  const model = await getStorefrontProductPageModel(
    organizationSlug,
    productHandle,
  );
  if (model.state === "unavailable") {
    notFound();
  }
  return {
    title:
      model.state === "ready"
        ? `${model.product.name} | ${model.storefront.storeName}`
        : "Product | ACOS Storefront",
    description:
      model.state === "ready" ? model.product.description ?? undefined : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function StorefrontProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const [{ organizationSlug, productHandle }, query, preferences] =
    await Promise.all([params, searchParams, getAdminPreferences()]);
  const cursor = parseVariantCursor(query);
  const model = await getStorefrontProductPageModel(
    organizationSlug,
    productHandle,
    cursor,
  );
  const text = storefrontCopy[preferences.locale];

  if (model.state === "unavailable") {
    notFound();
  }
  if (model.state !== "ready") {
    return (
      <StorefrontState
        kind={model.state}
        text={text}
        retryPath={`/store/${organizationSlug}/products/${productHandle}`}
      />
    );
  }
  if (model.storefront.redirectRequired) {
    permanentRedirect(
      `/store/${model.storefront.canonicalSlug}/products/${productHandle}`,
    );
  }

  const storePath = `/store/${model.storefront.canonicalSlug}`;
  const productPath = `${storePath}/products/${model.product.publicHandle}`;
  const nextPath = model.nextCursor
    ? variantCursorPath(productPath, model.nextCursor)
    : null;
  const inStock = model.product.availability === "IN_STOCK";

  return (
    <StorefrontShell
      preferences={preferences}
      text={text}
      returnPath={productPath}
      storeName={model.storefront.storeName}
      storePath={storePath}
    >
      <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-10">
        <Link
          href={storePath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-brand"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {text.previousStore}
        </Link>
      </div>

      <section aria-labelledby="storefront-product-title" className="border-y border-line bg-panel">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="relative aspect-[4/3] min-w-0 overflow-hidden bg-panel-strong lg:aspect-auto lg:min-h-[620px]">
            <Image
              src="/storefront/product-placeholder.png"
              alt={text.controlledMedia}
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-5 py-10 lg:px-12 lg:py-14">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
              {model.product.categoryName ? <span>{model.product.categoryName}</span> : null}
              {model.product.categoryName && model.product.brandName ? (
                <span aria-hidden>·</span>
              ) : null}
              {model.product.brandName ? <span>{model.product.brandName}</span> : null}
            </div>
            <span
              className={`mt-5 inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                inStock
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-line bg-panel-strong text-muted"
              }`}
            >
              {inStock ? (
                <PackageCheck aria-hidden className="h-4 w-4" />
              ) : (
                <PackageX aria-hidden className="h-4 w-4" />
              )}
              {inStock ? text.inStock : text.soldOut}
            </span>
            <h1
              id="storefront-product-title"
              className="mt-5 break-words text-3xl font-semibold sm:text-4xl"
            >
              {model.product.name}
            </h1>
            <p className="mt-4 text-2xl font-semibold text-brand">
              {formatPriceRange(model.product, preferences.locale)}
            </p>
            <p className="mt-6 break-words text-sm leading-7 text-muted">
              {model.product.description ?? text.noDescription}
            </p>
            <div className="mt-8 border-t border-line pt-6">
              <button
                type="button"
                disabled
                title={inStock ? text.cartUnavailable : text.soldOutAction}
                aria-describedby="storefront-ordering-note"
                className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-brand/45 px-5 text-sm font-semibold text-white sm:w-auto"
              >
                <ShoppingBag aria-hidden className="h-4 w-4" />
                {inStock ? text.orderingUnavailable : text.soldOut}
              </button>
              <p
                id="storefront-ordering-note"
                className="mt-3 text-xs leading-5 text-muted"
              >
                {inStock ? text.cartUnavailable : text.soldOutAction}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="border-b border-line pb-5">
              <p className="text-xs font-bold uppercase text-brand">
                {text.productDetails}
              </p>
              <h2 className="mt-2 text-2xl font-semibold">{text.variants}</h2>
            </div>
            {model.variants.length === 0 ? (
              <p className="py-8 text-sm text-muted">{text.emptyDetail}</p>
            ) : (
              <div className="divide-y divide-line">
                {model.variants.map((variant) => (
                  <VariantRow
                    key={variant.variantId}
                    variant={variant}
                    locale={preferences.locale}
                    currencyCode={model.storefront.currencyCode}
                    text={text}
                  />
                ))}
              </div>
            )}
            {model.hasMore && nextPath ? (
              <Link
                href={nextPath}
                className="mt-7 inline-flex h-11 items-center gap-2 rounded-md border border-brand bg-panel px-5 text-sm font-semibold text-brand hover:bg-brand hover:text-on-brand"
              >
                {text.nextPage}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            ) : null}
          </div>

          <aside className="h-fit border-l-4 border-brand bg-panel-strong px-5 py-5">
            <Check aria-hidden className="h-5 w-5 text-brand" />
            <h2 className="mt-3 text-base font-semibold">{text.productDetails}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {text.unavailableAction}
            </p>
            <dl className="mt-5 grid gap-4 border-t border-line pt-5">
              <Info label={text.availability} value={inStock ? text.inStock : text.soldOut} />
              <Info
                label={text.updated}
                value={formatDate(model.product.updatedAt, preferences.locale)}
              />
            </dl>
          </aside>
        </div>
      </section>
    </StorefrontShell>
  );
}

function VariantRow({
  variant,
  locale,
  currencyCode,
  text,
}: {
  variant: StorefrontVariant;
  locale: "th" | "en";
  currencyCode: string;
  text: (typeof storefrontCopy)["th"] | (typeof storefrontCopy)["en"];
}) {
  const inStock = variant.availability === "IN_STOCK";

  return (
    <article className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6">
      <div>
        <h3 className="text-sm font-semibold">{variant.variantName}</h3>
        <p className="mt-1 text-xs text-muted">{text.controlledMedia}</p>
      </div>
      <p className="text-sm font-semibold">
        {formatMoney(variant.basePrice, currencyCode, locale)}
      </p>
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
          inStock
            ? "border-success/30 bg-success/10 text-success"
            : "border-line bg-panel-strong text-muted"
        }`}
      >
        {inStock ? (
          <PackageCheck aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <PackageX aria-hidden className="h-3.5 w-3.5" />
        )}
        {inStock ? text.inStock : text.soldOut}
      </span>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}

function parseVariantCursor(query: {
  afterName?: string;
  afterVariant?: string;
}): VariantCursor | null {
  if (
    !query.afterName ||
    query.afterName.length > 255 ||
    !query.afterVariant ||
    !isUuid(query.afterVariant)
  ) {
    return null;
  }
  return { variantName: query.afterName, variantId: query.afterVariant };
}

function variantCursorPath(productPath: string, cursor: VariantCursor) {
  const query = new URLSearchParams({
    afterName: cursor.variantName,
    afterVariant: cursor.variantId,
  });
  return `${productPath}?${query.toString()}`;
}

function formatPriceRange(product: StorefrontProduct, locale: "th" | "en") {
  const formatter = moneyFormatter(product.currencyCode, locale);
  return product.priceMin === product.priceMax
    ? formatter.format(product.priceMin)
    : `${formatter.format(product.priceMin)} – ${formatter.format(product.priceMax)}`;
}

function formatMoney(value: number, currencyCode: string, locale: "th" | "en") {
  return moneyFormatter(currencyCode, locale).format(value);
}

function moneyFormatter(currencyCode: string, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

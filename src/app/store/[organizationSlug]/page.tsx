import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowRight,
  Box,
  CircleSlash,
  PackageCheck,
  PackageX,
  UserPlus,
} from "lucide-react";
import { StorefrontShell } from "@/app/store/_components/storefront-shell";
import { StorefrontState } from "@/app/store/_components/storefront-state";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { storefrontCopy } from "@/lib/storefront/i18n";
import {
  getStorefrontPageModel,
  type ProductCursor,
  type StorefrontProduct,
} from "@/lib/storefront/service";

export const dynamic = "force-dynamic";

type StorePageProps = {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{
    afterSort?: string;
    afterUpdated?: string;
    afterProduct?: string;
  }>;
};

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { organizationSlug } = await params;
  const model = await getStorefrontPageModel(organizationSlug);
  if (model.state === "unavailable") {
    notFound();
  }
  const title =
    model.state === "ready"
      ? `${model.storefront.storeName} | ACOS Storefront`
      : "Storefront | ADORA Commerce OS";

  return {
    title,
    description:
      model.state === "ready"
        ? model.storefront.tagline ?? model.storefront.description ?? undefined
        : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function StorefrontPage({
  params,
  searchParams,
}: StorePageProps) {
  const [{ organizationSlug }, query, preferences] = await Promise.all([
    params,
    searchParams,
    getAdminPreferences(),
  ]);
  const cursor = parseProductCursor(query);
  const model = await getStorefrontPageModel(organizationSlug, cursor);
  const text = storefrontCopy[preferences.locale];

  if (model.state === "unavailable") {
    notFound();
  }
  if (model.state !== "ready") {
    return (
      <StorefrontState
        kind={model.state}
        text={text}
        retryPath={`/store/${organizationSlug}`}
      />
    );
  }
  if (model.storefront.redirectRequired) {
    permanentRedirect(`/store/${model.storefront.canonicalSlug}`);
  }

  const storePath = `/store/${model.storefront.canonicalSlug}`;
  const nextPath = model.nextCursor
    ? productCursorPath(storePath, model.nextCursor)
    : null;

  return (
    <StorefrontShell
      preferences={preferences}
      text={text}
      returnPath={storePath}
      storeName={model.storefront.storeName}
      storePath={storePath}
    >
      <section
        aria-labelledby="storefront-title"
        className="relative isolate min-h-[500px] overflow-hidden bg-sidebar text-white sm:min-h-[540px]"
      >
        <Image
          src="/storefront/product-placeholder.png"
          alt=""
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-sidebar/75" aria-hidden />
        <div className="relative mx-auto flex min-h-[500px] max-w-7xl items-end px-5 pb-14 pt-20 sm:min-h-[540px] sm:pb-16 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase text-[#50c3ff]">
              {text.localPreview}
            </p>
            <h1
              id="storefront-title"
              className="mt-3 break-words text-4xl font-semibold sm:text-5xl"
            >
              {model.storefront.storeName}
            </h1>
            {model.storefront.tagline ? (
              <p className="mt-4 max-w-2xl break-words text-lg leading-8 text-white/90">
                {model.storefront.tagline}
              </p>
            ) : null}
            {model.storefront.description ? (
              <p className="mt-3 max-w-2xl break-words text-sm leading-7 text-white/85">
                {model.storefront.description}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <DisabledAction
                icon={<UserPlus aria-hidden className="h-4 w-4" />}
                label={text.join}
                reason={text.unavailableAction}
                describedBy="storefront-preview-actions-note"
              />
              <DisabledAction
                icon={<CircleSlash aria-hidden className="h-4 w-4" />}
                label={text.follow}
                reason={text.unavailableAction}
                describedBy="storefront-preview-actions-note"
              />
            </div>
            <p
              id="storefront-preview-actions-note"
              className="mt-3 text-xs leading-5 text-white/80"
            >
              {text.unavailableAction}
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="storefront-catalog-title"
        className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14"
      >
        <div className="flex flex-col gap-3 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-brand">{text.products}</p>
            <h2
              id="storefront-catalog-title"
              className="mt-2 text-2xl font-semibold"
            >
              {text.catalog}
            </h2>
            <p className="mt-2 text-sm text-muted">{text.catalogDescription}</p>
          </div>
          <p className="text-sm font-medium text-muted">
            {model.products.length} {text.products}
          </p>
        </div>

        {model.products.length === 0 ? (
          <EmptyCatalog text={text} />
        ) : (
          <div className="grid gap-5 py-7 sm:grid-cols-2 xl:grid-cols-3">
            {model.products.map((product, index) => (
              <ProductCard
                key={product.publicHandle}
                product={product}
                storePath={storePath}
                locale={preferences.locale}
                text={text}
                eagerImage={index === 0}
              />
            ))}
          </div>
        )}

        {model.hasMore && nextPath ? (
          <div className="flex justify-center border-t border-line pt-7">
            <Link
              href={nextPath}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-brand bg-panel px-5 text-sm font-semibold text-brand hover:bg-brand hover:text-on-brand"
            >
              {text.nextPage}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>
    </StorefrontShell>
  );
}

function ProductCard({
  product,
  storePath,
  locale,
  text,
  eagerImage,
}: {
  product: StorefrontProduct;
  storePath: string;
  locale: "th" | "en";
  text: (typeof storefrontCopy)["th"] | (typeof storefrontCopy)["en"];
  eagerImage: boolean;
}) {
  const inStock = product.availability === "IN_STOCK";

  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-panel-strong">
        <Image
          src="/storefront/product-placeholder.png"
          alt={text.controlledMedia}
          fill
          loading={eagerImage ? "eager" : "lazy"}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
            inStock
              ? "border-success/30 bg-panel/95 text-success"
              : "border-line bg-panel/95 text-muted"
          }`}
        >
          {inStock ? (
            <PackageCheck aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <PackageX aria-hidden className="h-3.5 w-3.5" />
          )}
          {inStock ? text.inStock : text.soldOut}
        </span>
      </div>
      <div className="p-5">
        <p className="text-xs font-medium text-muted">
          {[product.categoryName, product.brandName].filter(Boolean).join(" · ") ||
            text.products}
        </p>
        <h3 className="mt-2 break-words text-lg font-semibold">{product.name}</h3>
        <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-muted">
          {product.description ?? text.noDescription}
        </p>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="text-xs text-muted">
              {product.priceMin === product.priceMax ? text.price : text.priceRange}
            </p>
            <p className="mt-1 text-lg font-semibold text-brand">
              {formatPriceRange(product, locale)}
            </p>
          </div>
          <Link
            href={`${storePath}/products/${product.publicHandle}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-sidebar hover:text-white"
          >
            {text.viewProduct}
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyCatalog({
  text,
}: {
  text: (typeof storefrontCopy)["th"] | (typeof storefrontCopy)["en"];
}) {
  return (
    <div className="grid min-h-72 place-items-center py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-brand/10 text-brand">
        <Box aria-hidden className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{text.emptyTitle}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{text.emptyDetail}</p>
    </div>
  );
}

function DisabledAction({
  icon,
  label,
  reason,
  describedBy,
}: {
  icon: React.ReactNode;
  label: string;
  reason: string;
  describedBy: string;
}) {
  return (
    <div>
      <button
        type="button"
        disabled
        title={reason}
        aria-describedby={describedBy}
        className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-md border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white/80"
      >
        {icon}
        {label}
      </button>
    </div>
  );
}

function parseProductCursor(query: {
  afterSort?: string;
  afterUpdated?: string;
  afterProduct?: string;
}): ProductCursor | null {
  if (!query.afterSort || !query.afterUpdated || !query.afterProduct) {
    return null;
  }
  const sortOrder = Number(query.afterSort);
  if (
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    Number.isNaN(Date.parse(query.afterUpdated)) ||
    !isUuid(query.afterProduct)
  ) {
    return null;
  }
  return {
    sortOrder,
    updatedAt: query.afterUpdated,
    productId: query.afterProduct,
  };
}

function productCursorPath(storePath: string, cursor: ProductCursor) {
  const query = new URLSearchParams({
    afterSort: String(cursor.sortOrder),
    afterUpdated: cursor.updatedAt,
    afterProduct: cursor.productId,
  });
  return `${storePath}?${query.toString()}`;
}

function formatPriceRange(product: StorefrontProduct, locale: "th" | "en") {
  const formatter = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: product.currencyCode,
    maximumFractionDigits: 2,
  });
  return product.priceMin === product.priceMax
    ? formatter.format(product.priceMin)
    : `${formatter.format(product.priceMin)} – ${formatter.format(product.priceMax)}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

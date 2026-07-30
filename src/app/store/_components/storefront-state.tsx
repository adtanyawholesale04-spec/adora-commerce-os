import Link from "next/link";
import { CircleAlert, RefreshCcw, SearchX } from "lucide-react";
import type { StorefrontText } from "@/lib/storefront/i18n";

export function StorefrontState({
  kind,
  text,
  retryPath = "/",
}: {
  kind: "not_found" | "configuration_error" | "query_error";
  text: StorefrontText;
  retryPath?: string;
}) {
  const notFound = kind === "not_found";
  const configuration = kind === "configuration_error";
  const title = notFound
    ? text.notFoundTitle
    : configuration
      ? text.configTitle
      : text.errorTitle;
  const detail = notFound
    ? text.notFoundDetail
    : configuration
      ? text.configDetail
      : text.errorDetail;

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-5 py-16 text-ink">
      <section className="w-full max-w-xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-brand/10 text-brand">
          {notFound ? (
            <SearchX aria-hidden className="h-7 w-7" />
          ) : (
            <CircleAlert aria-hidden className="h-7 w-7" />
          )}
        </span>
        <p className="mt-6 text-xs font-bold uppercase text-brand">{text.localPreview}</p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{detail}</p>
        {!notFound ? (
          <Link
            href={retryPath}
            className="mt-7 inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-sidebar hover:text-white"
          >
            <RefreshCcw aria-hidden className="h-4 w-4" />
            {text.retry}
          </Link>
        ) : null}
      </section>
    </main>
  );
}

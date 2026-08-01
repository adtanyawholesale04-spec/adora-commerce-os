import { Eye } from "lucide-react";

export default function ManualPaymentReviewDetailLoading() {
  return (
    <main className="min-h-screen bg-surface text-ink" aria-busy="true">
      <header className="border-b-4 border-b-brand bg-panel px-5 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-panel-strong text-brand">
            <Eye aria-hidden className="h-5 w-5" />
          </div>
          <div className="grid gap-2">
            <div className="h-3 w-28 animate-pulse rounded bg-panel-strong" />
            <div className="h-6 w-64 animate-pulse rounded bg-panel-strong" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6">
        <span className="sr-only">Loading private payment review detail</span>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className="h-24 animate-pulse rounded-lg border border-line bg-panel" />
          ))}
        </div>
      </div>
    </main>
  );
}

import { ListChecks } from "lucide-react";

export default function ManualPaymentReviewQueueLoading() {
  return (
    <main className="min-h-screen bg-surface text-ink" aria-busy="true">
      <header className="border-b-4 border-b-brand bg-panel px-5 py-5">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-panel-strong text-brand">
            <ListChecks aria-hidden className="h-5 w-5" />
          </div>
          <div className="grid gap-2">
            <div className="h-3 w-28 animate-pulse rounded bg-panel-strong" />
            <div className="h-6 w-56 animate-pulse rounded bg-panel-strong" />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-6">
        <span className="sr-only">Loading manual payment review queue</span>
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-4 gap-4 border-b border-line p-5 last:border-b-0">
              {[0, 1, 2, 3].map((cell) => (
                <div key={cell} className="h-4 animate-pulse rounded bg-panel-strong" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

const foundationChecks = [
  "Supabase migrations 001-034 replayed on a fresh database",
  "Auth profile resolves to active organization membership",
  "RLS denies cross-tenant reads and writes",
  "Entitlement and role permission gates are enforced",
  "Append-only ledgers reject update and delete"
];

const phaseZeroScope = [
  "Backoffice shell",
  "Login and organization switcher",
  "Membership and role seed",
  "Subscription entitlement baseline",
  "Security validation dashboard"
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">ACOS</p>
            <h1 className="text-2xl font-semibold text-ink">ADORA Commerce OS</h1>
          </div>
          <div className="rounded-md border border-line bg-panel-strong px-3 py-2 text-sm text-muted">Phase 0 Foundation</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-line bg-panel p-6">
          <h2 className="text-xl font-semibold text-ink">Supabase Validation Gate</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Development starts only after a fresh Supabase database validates migrations,
            tenant isolation, RLS helpers, transaction RPCs, and append-only ledger enforcement.
          </p>
          <ul className="mt-6 grid gap-3">
            {foundationChecks.map((check) => (
              <li key={check} className="flex items-start gap-3 text-sm text-ink">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand" />
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-line bg-panel p-6">
          <h2 className="text-xl font-semibold text-ink">Phase 0 Scope</h2>
          <div className="mt-5 grid gap-3">
            {phaseZeroScope.map((item) => (
              <div key={item} className="rounded-md border border-line bg-panel-strong px-4 py-3 text-sm text-ink">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

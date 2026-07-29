import Link from "next/link";

import { SignupForm } from "@/app/signup/signup-form";
import { isLocalPlatformSignupAvailable } from "@/lib/platform-signup/local-flow";

export default async function PlatformSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const available = isLocalPlatformSignupAvailable();
  const siteKey = String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();
  const { status } = await searchParams;

  return (
    <main className="min-h-screen bg-surface px-5 py-10">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-sidebar px-7 py-10 text-white">
          <p className="text-sm font-semibold text-brand">ADORA Commerce OS</p>
          <h1 className="mt-4 text-3xl font-semibold">Create your ACOS account</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/75">
            Local platform signup creates only your private platform profile and
            onboarding record. It does not join a store or create a customer record.
          </p>
          <Link className="mt-8 inline-block text-sm font-semibold text-brand" href="/">
            Back to ACOS
          </Link>
        </section>
        <section className="px-7 py-10">
          <div className="mb-7">
            <p className="text-sm font-semibold text-brand">LOCAL PREVIEW</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Account details</h2>
            <p className="mt-2 text-sm text-muted">
              Email confirmation is captured by local Mailpit.
            </p>
          </div>
          {status === "callback_retry" ? (
            <div className="mb-5 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
              Account setup was interrupted after email verification.{" "}
              <Link
                className="font-semibold text-brand"
                href="/auth/platform/callback?retry=1"
              >
                Retry account setup
              </Link>
            </div>
          ) : null}
          {available ? (
            <SignupForm siteKey={siteKey} />
          ) : (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
              Platform signup is disabled. Local flags and server configuration
              must be explicitly enabled before this form can be used.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

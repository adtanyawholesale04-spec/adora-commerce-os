import Link from "next/link";
import { redirect } from "next/navigation";

import { getLocalPlatformOnboardingSnapshot } from "@/lib/platform-signup/local-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PlatformOnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id || !user.email_confirmed_at) {
    redirect("/signup?status=auth_required");
  }

  const snapshot = await getLocalPlatformOnboardingSnapshot(user.id);
  if (!snapshot.ok) {
    return (
      <OnboardingShell>
        <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
          Private onboarding is currently unavailable.
        </p>
      </OnboardingShell>
    );
  }

  const displayName = readText(snapshot.data.display_name) ?? "ACOS member";
  const onboarding = readRecord(snapshot.data.onboarding);
  const status = readText(onboarding?.status) ?? snapshot.code;
  const interests = readRecordArray(snapshot.data.active_interests);
  const selectedInterestCount = interests.filter(
    (interest) => interest.selected === true,
  ).length;

  return (
    <OnboardingShell>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section>
          <p className="text-sm font-semibold text-brand">PRIVATE ONBOARDING</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">
            Welcome, {displayName}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            This read-only skeleton confirms the verified platform account. Interest,
            terms and public-profile actions remain unavailable in Part 8D.
          </p>
        </section>
        <dl className="grid gap-3 rounded-lg border border-line bg-panel-strong p-5">
          <div>
            <dt className="text-xs font-semibold text-muted">Onboarding status</dt>
            <dd className="mt-1 font-semibold text-ink">{status}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-muted">Selected interests</dt>
            <dd className="mt-1 font-semibold text-ink">
              {selectedInterestCount}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-8 border-t border-line pt-5">
        <Link className="text-sm font-semibold text-brand" href="/">
          Return to ACOS
        </Link>
      </div>
    </OnboardingShell>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-surface px-5 py-10">
      <div className="mx-auto max-w-5xl rounded-lg border border-line bg-panel p-7 shadow-[var(--shadow-panel)]">
        {children}
      </div>
    </main>
  );
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { signInWithEmailAction } from "@/app/admin/actions";
import { AdminMagicLinkForm } from "@/app/admin/_components/admin-magic-link-form";
import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { adminCopy } from "@/lib/admin/i18n";
import { getAdminPreferences } from "@/lib/admin/preferences";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const preferences = await getAdminPreferences();
  const copy = adminCopy[preferences.locale];
  const isThai = preferences.locale === "th";
  const siteKey = String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();

  return (
    <main className="min-h-screen bg-surface px-5 py-5 text-ink sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-6xl justify-end">
        <AdminPreferenceSwitcher preferences={preferences} returnPath="/login" />
      </div>

      <div className="mx-auto mt-5 grid min-h-[calc(100vh-9rem)] w-full max-w-6xl overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-7 py-9 text-white sm:px-10 sm:py-12">
          <div className="relative z-10">
            <p className="text-sm font-semibold tracking-[0.08em] text-brand">ADORA COMMERCE OS</p>
            <div className="mt-12 max-w-xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-on-brand">
                <ShieldCheck aria-hidden className="h-6 w-6" />
              </div>
              <p className="mt-7 text-sm font-semibold uppercase tracking-[0.08em] text-brand">
                Commerce trust
              </p>
              <h1 className="mt-3 max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">
                {isThai ? "เข้าสู่พื้นที่ทำงานของคุณ" : "Enter your commerce workspace"}
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/75 sm:text-base">
                {isThai
                  ? "จัดการร้านค้า ลูกค้า คำสั่งซื้อ และงานปฏิบัติการด้วยขอบเขตสิทธิ์ที่ชัดเจน"
                  : "Manage stores, customers, orders and operations with clear permission boundaries."}
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 flex items-center gap-3 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {isThai ? "ปลอดภัยตามขอบเขตองค์กร" : "Protected by organization boundaries"}
          </div>
          <div className="pointer-events-none absolute right-16 top-24 h-20 w-20 border border-white/10" />
        </section>

        <section className="flex items-center bg-panel px-7 py-9 sm:px-12 sm:py-12">
          <div className="w-full max-w-md">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
              href="/"
            >
              <ArrowLeft aria-hidden className="h-4 w-4" />
              {isThai ? "กลับหน้าแรก" : "Back to home"}
            </Link>

            <div className="mt-12">
              <p className="text-sm font-semibold text-brand">{isThai ? "เข้าสู่ระบบ" : "SIGN IN"}</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                {isThai ? "ยินดีต้อนรับกลับ" : "Welcome back"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {isThai
                  ? "กรอกอีเมลเพื่อรับลิงก์เข้าสู่ระบบแบบใช้ครั้งเดียว"
                  : "Enter your email to receive a secure one-time sign-in link."}
              </p>
            </div>

            <div className="mt-8">
              <AdminMagicLinkForm
                action={signInWithEmailAction}
                siteKey={siteKey}
                emailLabel={copy.shell.email}
                submitLabel={copy.shell.sendMagicLink}
                unavailableLabel={
                  isThai
                    ? "ยังไม่ได้ตั้งค่าการตรวจสอบความปลอดภัย จึงยังไม่เปิดการเข้าสู่ระบบ"
                    : "Security verification is not configured, so sign-in is unavailable."
                }
                emailRequiredLabel={copy.shell.emailRequired}
                showEmailRequired={false}
              />
            </div>

            <p className="mt-8 border-t border-line pt-5 text-sm text-muted">
              {isThai ? "ยังไม่มีบัญชีใช่ไหม" : "New to ACOS?"}{" "}
              <Link className="font-semibold text-brand hover:underline" href="/signup">
                {isThai ? "สร้างบัญชี" : "Create an account"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

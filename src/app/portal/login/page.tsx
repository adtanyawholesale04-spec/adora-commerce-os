import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminPreferenceSwitcher } from "@/app/admin/_components/admin-preference-switcher";
import { signInToCustomerPortalAction } from "@/app/portal/auth-actions";
import { PortalMagicLinkForm } from "@/app/portal/portal-magic-link-form";
import { getAdminPreferences } from "@/lib/admin/preferences";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PortalLoginPageProps = {
  searchParams: Promise<{ auth?: string }>;
};

export default async function PortalLoginPage({
  searchParams,
}: PortalLoginPageProps) {
  const [{ auth }, preferences] = await Promise.all([
    searchParams,
    getAdminPreferences(),
  ]);
  const isThai = preferences.locale === "th";
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  if (supabaseUrl && supabasePublishableKey) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/portal");
    }
  }

  const notice = portalLoginNotice(auth, isThai);
  const siteKey = String(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  ).trim();

  return (
    <main className="min-h-screen bg-surface px-5 py-6 text-ink sm:px-8 sm:py-8">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-b border-line pb-5">
        <Link className="text-sm tracking-[0.08em]" href="/">
          <span className="font-extrabold text-accent">ADORA</span>{" "}
          <span className="font-normal text-ink">ACOS</span>
        </Link>
        <AdminPreferenceSwitcher
          preferences={preferences}
          returnPath="/portal/login"
        />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-7rem)] w-full max-w-5xl items-center py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.72fr)] lg:gap-16">
        <section className="hidden lg:block">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-brand/15 text-brand">
            <ShieldCheck aria-hidden className="h-6 w-6" />
          </div>
          <p className="mt-7 text-sm font-semibold uppercase text-brand">
            ADORA CUSTOMER
          </p>
          <h1 className="mt-3 max-w-md text-4xl font-semibold leading-tight">
            {isThai ? "พื้นที่ส่วนตัวของคุณ" : "Your private customer space"}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">
            {isThai
              ? "ดูคำสั่งซื้อ สิทธิประโยชน์ และการตั้งค่าการสื่อสารที่เชื่อมกับบัญชีของคุณ"
              : "View orders, benefits, and communication preferences linked to your verified account."}
          </p>
        </section>

        <section className="rounded-lg border border-line bg-panel p-6 shadow-[var(--shadow-panel)] sm:p-8">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
            href="/portal"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {isThai ? "กลับพอร์ทัลลูกค้า" : "Back to customer portal"}
          </Link>

          <p className="mt-9 text-sm font-semibold text-brand">
            {isThai ? "เข้าสู่ระบบลูกค้า" : "CUSTOMER SIGN IN"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold">
            {isThai ? "ยินดีต้อนรับกลับ" : "Welcome back"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {isThai
              ? "กรอกอีเมลที่ลงทะเบียนไว้เพื่อรับลิงก์เข้าสู่ระบบแบบใช้ครั้งเดียว"
              : "Enter your registered email to receive a secure one-time sign-in link."}
          </p>

          {notice ? (
            <p
              className={`mt-5 rounded-md border p-3 text-sm ${
                auth === "check_email" || auth === "signed_out"
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger"
              }`}
              role="status"
            >
              {notice}
            </p>
          ) : null}

          <div className="mt-7">
            <PortalMagicLinkForm
              action={signInToCustomerPortalAction}
              siteKey={siteKey}
              emailLabel={isThai ? "อีเมล" : "Email"}
              submitLabel={isThai ? "ส่งลิงก์เข้าสู่ระบบ" : "Send sign-in link"}
              unavailableLabel={
                isThai
                  ? "ยังไม่ได้ตั้งค่าการตรวจสอบความปลอดภัย จึงยังไม่เปิดการเข้าสู่ระบบ"
                  : "Security verification is not configured, so sign-in is unavailable."
              }
              emailRequiredLabel={
                isThai ? "กรุณากรอกอีเมล" : "Email is required."
              }
              showEmailRequired={auth === "missing_email"}
            />
          </div>

          <p className="mt-7 border-t border-line pt-5 text-sm text-muted">
            {isThai ? "ยังไม่มีบัญชี?" : "New to ADORA?"}{" "}
            <Link className="font-semibold text-brand hover:underline" href="/signup">
              {isThai ? "สร้างบัญชี" : "Create an account"}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

function portalLoginNotice(auth: string | undefined, isThai: boolean) {
  if (auth === "check_email") {
    return isThai
      ? "ส่งลิงก์เข้าสู่ระบบแล้ว กรุณาตรวจสอบอีเมลของคุณ"
      : "Your sign-in link has been sent. Please check your email.";
  }
  if (auth === "signed_out") {
    return isThai ? "ออกจากระบบแล้ว" : "You are signed out.";
  }
  if (auth === "callback_error") {
    return isThai
      ? "ลิงก์เข้าสู่ระบบไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่"
      : "The sign-in link is invalid or expired. Please request a new one.";
  }
  if (auth === "missing_env") {
    return isThai
      ? "ยังไม่ได้ตั้งค่า Supabase สำหรับสภาพแวดล้อมนี้"
      : "Supabase is not configured for this environment.";
  }
  if (auth === "missing_email" || auth === "sign_in_error") {
    return isThai
      ? "ไม่สามารถส่งลิงก์เข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง"
      : "We could not send a sign-in link. Check your details and try again.";
  }
  return null;
}

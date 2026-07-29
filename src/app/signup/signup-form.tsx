"use client";

import Script from "next/script";
import { useActionState, useEffect } from "react";

import {
  submitPlatformSignup,
  type SignupFormState,
} from "@/app/signup/actions";

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

const initialState: SignupFormState = { status: "idle" };

export function SignupForm({ siteKey }: { siteKey: string }) {
  const [state, action, pending] = useActionState(
    submitPlatformSignup,
    initialState,
  );

  useEffect(() => {
    if (state.status !== "idle") window.turnstile?.reset();
  }, [state]);

  if (!siteKey) {
    return (
      <p className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
        Local Turnstile site key is not configured. Signup remains safely disabled.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <form action={action} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Display name
          <input
            className="h-11 rounded-md border border-line bg-panel px-3 text-ink"
            name="displayName"
            maxLength={120}
            required
            autoComplete="name"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Email
          <input
            className="h-11 rounded-md border border-line bg-panel px-3 text-ink"
            name="email"
            type="email"
            maxLength={320}
            required
            autoComplete="email"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-ink">
          Password
          <input
            className="h-11 rounded-md border border-line bg-panel px-3 text-ink"
            name="password"
            type="password"
            minLength={8}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </label>
        <div
          className="cf-turnstile min-h-[65px]"
          data-sitekey={siteKey}
          data-action="platform_signup"
          data-response-field-name="cf-turnstile-response"
        />
        <button
          className="h-11 rounded-md bg-brand px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={pending}
        >
          {pending ? "Submitting..." : "Create account"}
        </button>
        <div aria-live="polite" className="min-h-6 text-sm text-muted">
          {state.status === "accepted"
            ? "Check Mailpit for the confirmation email, then open its link."
            : state.status === "error"
              ? "Signup is unavailable or could not be completed. Please retry."
              : null}
        </div>
      </form>
    </>
  );
}

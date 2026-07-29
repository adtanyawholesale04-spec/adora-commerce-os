"use client";

import { Mail } from "lucide-react";
import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

export function AdminMagicLinkForm({
  action,
  siteKey,
  emailLabel,
  submitLabel,
  unavailableLabel,
  emailRequiredLabel,
  showEmailRequired,
}: {
  action: (formData: FormData) => void | Promise<void>;
  siteKey: string;
  emailLabel: string;
  submitLabel: string;
  unavailableLabel: string;
  emailRequiredLabel: string;
  showEmailRequired: boolean;
}) {
  useEffect(() => {
    return () => window.turnstile?.reset();
  }, []);

  if (!siteKey) {
    return (
      <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
        {unavailableLabel}
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <form
        action={action}
        className="grid gap-3"
      >
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{emailLabel}</span>
          <input
            name="email"
            type="email"
            required
            className="h-10 rounded-lg border border-line bg-panel px-3 text-sm text-ink outline-hidden focus:border-brand"
            placeholder="admin@example.com"
          />
        </label>
        <div
          className="cf-turnstile min-h-[65px]"
          data-sitekey={siteKey}
          data-action="admin_magic_link"
          data-response-field-name="cf-turnstile-response"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          <Mail aria-hidden className="h-4 w-4" />
          {submitLabel}
        </button>
        {showEmailRequired ? (
          <p className="text-xs text-danger">{emailRequiredLabel}</p>
        ) : null}
      </form>
    </>
  );
}

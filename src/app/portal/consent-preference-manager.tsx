"use client";

import { BellRing, Check, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { updatePortalConsentAction } from "@/app/portal/actions";
import type { PortalConsent } from "@/lib/portal/customer";

type Copy = {
  consents: string;
  consentDescription: string;
  granted: string;
  revoked: string;
  consentSaved: string;
  consentError: string;
  emptyConsents: string;
};

export function ConsentPreferenceManager({
  consents,
  copy
}: {
  consents: PortalConsent[];
  copy: Copy;
}) {
  return (
    <div>
      <div className="border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <BellRing aria-hidden className="h-4 w-4 text-brand" />
          <h2 className="text-base font-semibold">{copy.consents}</h2>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">{copy.consentDescription}</p>
      </div>
      {consents.length === 0 ? (
        <p className="py-5 text-sm text-muted">{copy.emptyConsents}</p>
      ) : (
        <div className="divide-y divide-line">
          {consents.map((consent) => (
            <ConsentPreference key={consent.id} consent={consent} copy={copy} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConsentPreference({
  consent,
  copy
}: {
  consent: PortalConsent;
  copy: Copy;
}) {
  const initialGranted = consent.status === "GRANTED";
  const [granted, setGranted] = useState(initialGranted);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(nextGranted: boolean) {
    const form = new FormData();
    form.set("channel", consent.channel);
    form.set("purpose", consent.purpose);
    form.set("status", nextGranted ? "GRANTED" : "REVOKED");
    if (consent.destination) form.set("destination", consent.destination);
    if (consent.policy_version) form.set("policy_version", consent.policy_version);

    setMessage(null);
    setFailed(false);
    startTransition(async () => {
      const result = await updatePortalConsentAction(form);
      if (result.ok) {
        setGranted(nextGranted);
        setMessage(copy.consentSaved);
        return;
      }
      setFailed(true);
      setMessage(copy.consentError);
    });
  }

  return (
    <div className="grid min-h-20 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{formatLabel(consent.purpose)}</p>
        <p className="mt-1 text-xs text-muted">
          {formatLabel(consent.channel)}
          {consent.destination ? ` · ${maskDestination(consent.destination)}` : ""}
        </p>
        {message ? (
          <p className={`mt-2 flex items-center gap-1 text-xs ${failed ? "text-danger" : "text-success"}`}>
            {!failed ? <Check aria-hidden className="h-3.5 w-3.5" /> : null}
            {message}
          </p>
        ) : null}
      </div>
      <label className="inline-flex min-w-28 cursor-pointer items-center justify-between gap-3">
        <span className="text-xs font-semibold text-muted">
          {pending ? (
            <LoaderCircle aria-label="Updating" className="h-4 w-4 animate-spin" />
          ) : granted ? (
            copy.granted
          ) : (
            copy.revoked
          )}
        </span>
        <input
          type="checkbox"
          checked={granted}
          disabled={pending}
          onChange={(event) => update(event.target.checked)}
          className="peer sr-only"
          aria-label={`${formatLabel(consent.channel)} ${formatLabel(consent.purpose)}`}
        />
        <span className="relative h-6 w-11 rounded-full bg-panel-strong ring-1 ring-line transition-colors peer-checked:bg-brand peer-disabled:opacity-50 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function maskDestination(destination: string) {
  if (destination.includes("@")) {
    const [name, domain] = destination.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return destination.length > 4 ? `${"*".repeat(Math.min(6, destination.length - 4))}${destination.slice(-4)}` : "****";
}

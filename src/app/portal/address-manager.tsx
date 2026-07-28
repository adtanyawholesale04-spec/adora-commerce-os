"use client";

import { Archive, Check, Edit3, MapPin, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import type { PortalAddress } from "@/lib/portal/customer";
import {
  archivePortalAddressAction,
  createPortalAddressAction,
  updatePortalAddressAction
} from "@/app/portal/actions";

type Copy = {
  add: string;
  edit: string;
  archive: string;
  cancel: string;
  save: string;
  recipient: string;
  phone: string;
  address: string;
  district: string;
  province: string;
  postal: string;
  label: string;
  defaultAddress: string;
  empty: string;
  confirmArchive: string;
  saved: string;
};

export function AddressManager({ addresses, copy }: { addresses: PortalAddress[]; copy: Copy }) {
  const [editing, setEditing] = useState<PortalAddress | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2"><MapPin aria-hidden className="h-4 w-4 text-brand" /><h2 className="text-base font-semibold">{copy.label}</h2></div>
        <button type="button" onClick={() => { setAdding(true); setEditing(null); setMessage(null); }} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white hover:brightness-95"><Plus aria-hidden className="h-4 w-4" />{copy.add}</button>
      </div>
      {message ? <p className="mt-3 rounded-md bg-success/10 px-3 py-2 text-xs text-success">{message}</p> : null}
      {adding ? <AddressForm copy={copy} onCancel={() => setAdding(false)} onDone={() => { setAdding(false); setMessage(copy.saved); }} /> : null}
      {!adding && addresses.length === 0 ? <p className="py-5 text-sm text-muted">{copy.empty}</p> : null}
      {!adding
        ? addresses.map((address) => (
            editing?.id === address.id ? (
              <AddressForm key={address.id} address={address} copy={copy} onCancel={() => setEditing(null)} onDone={() => { setEditing(null); setMessage(copy.saved); }} />
            ) : (
              <AddressRow key={address.id} address={address} copy={copy} onEdit={() => { setEditing(address); setMessage(null); }} onArchived={() => setMessage(copy.saved)} />
            )
          ))
        : null}
    </div>
  );
}

function AddressRow({ address, copy, onEdit, onArchived }: { address: PortalAddress; copy: Copy; onEdit: () => void; onArchived: () => void }) {
  const [pending, startTransition] = useTransition();
  function archive() {
    if (!window.confirm(copy.confirmArchive)) return;
    const form = new FormData();
    form.set("address_id", address.id);
    startTransition(async () => {
      const result = await archivePortalAddressAction(form);
      if (result.ok) onArchived();
    });
  }
  return <div className="border-b border-line py-4 last:border-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{address.label ?? address.recipient_name}</p>{address.is_default ? <span className="rounded-full bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">{copy.defaultAddress}</span> : null}</div><p className="mt-1 text-xs leading-5 text-muted">{address.recipient_name} · {address.phone}<br />{[address.address_line1, address.district, address.province, address.postal_code].filter(Boolean).join(", ")}</p></div><div className="flex shrink-0 gap-1"><button type="button" aria-label={copy.edit} title={copy.edit} onClick={onEdit} className="rounded-md p-2 text-muted hover:bg-panel-strong hover:text-brand"><Edit3 aria-hidden className="h-4 w-4" /></button><button type="button" aria-label={copy.archive} title={copy.archive} disabled={pending} onClick={archive} className="rounded-md p-2 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-50"><Archive aria-hidden className="h-4 w-4" /></button></div></div></div>;
}

function AddressForm({ address, copy, onCancel, onDone }: { address?: PortalAddress; copy: Copy; onCancel: () => void; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const editing = Boolean(address);
  function submit(formData: FormData) {
    if (editing && address) formData.set("address_id", address.id);
    startTransition(async () => {
      const result = editing ? await updatePortalAddressAction(formData) : await createPortalAddressAction(formData);
      if (result.ok) onDone();
    });
  }
  return <form action={submit} className="mt-4 grid gap-3 rounded-md border border-brand/25 bg-brand/5 p-4"><div className="grid gap-3 sm:grid-cols-2"><Field name="label" label={copy.label} value={address?.label ?? ""} /><Field name="recipient_name" label={copy.recipient} value={address?.recipient_name ?? ""} required /><Field name="phone" label={copy.phone} value={address?.phone ?? ""} required /><Field name="address_line1" label={copy.address} value={address?.address_line1 ?? ""} required /><Field name="district" label={copy.district} value={address?.district ?? ""} /><Field name="province" label={copy.province} value={address?.province ?? ""} /><Field name="postal_code" label={copy.postal} value={address?.postal_code ?? ""} /></div><label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" name="is_default" defaultChecked={address?.is_default ?? false} className="h-4 w-4 accent-[rgb(var(--color-brand))]" />{copy.defaultAddress}</label><div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted hover:bg-panel-strong"><X aria-hidden className="h-4 w-4" />{copy.cancel}</button><button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check aria-hidden className="h-4 w-4" />{pending ? "..." : copy.save}</button></div></form>;
}

function Field({ name, label, value, required }: { name: string; label: string; value: string; required?: boolean }) { return <label className="grid gap-1 text-xs font-medium text-muted"><span>{label}</span><input name={name} defaultValue={value} required={required} className="min-h-9 rounded-md border border-line bg-panel px-3 text-sm text-ink" /></label>; }

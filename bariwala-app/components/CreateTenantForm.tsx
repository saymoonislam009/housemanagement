"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createTenant } from "@/lib/actions/tenants";
import { Field, Input, Select, Button } from "./ui";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function CreateTenantForm({
  flats,
  fixedFlatId,
  fixedFlatLabel,
  labels,
}: {
  flats?: { id: string; name: string; floor: string; propertyName: string }[];
  fixedFlatId?: string;
  fixedFlatLabel?: string;
  labels: {
    selectFlat: string;
    tenantName: string;
    phone: string;
    email: string;
    nid: string;
    moveInDate: string;
    additional: string;
    save: string;
  };
}) {
  const [state, formAction] = useFormState(createTenant, null);

  return (
    <form action={formAction} className="space-y-4">
      {fixedFlatId ? (
        <>
          <input type="hidden" name="flatId" value={fixedFlatId} />
          {fixedFlatLabel && <p className="text-sm text-ink-600">{fixedFlatLabel}</p>}
        </>
      ) : (
        <Field label={labels.selectFlat}>
          <Select name="flatId" required defaultValue="">
            <option value="" disabled>
              {labels.selectFlat}
            </option>
            {flats?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.propertyName} · {f.name} ({f.floor})
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={labels.tenantName}>
        <Input name="name" required autoFocus />
      </Field>
      <Field label={labels.phone}>
        <Input name="phone" type="tel" />
      </Field>

      <details className="rounded-lg border border-ink-900/10 p-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-700">{labels.additional}</summary>
        <div className="mt-3 space-y-4">
          <Field label={labels.email}>
            <Input name="email" type="email" />
          </Field>
          <Field label={labels.nid}>
            <Input name="nid" />
          </Field>
          <Field label={labels.moveInDate}>
            <Input name="moveInDate" type="date" />
          </Field>
        </div>
      </details>

      {state?.error && (
        <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>
      )}

      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

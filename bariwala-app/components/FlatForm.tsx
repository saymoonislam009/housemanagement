"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createFlat, updateFlat } from "@/lib/actions/properties";
import { Field, Input, Button } from "./ui";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function FlatForm({
  propertyId,
  flatId,
  defaultName,
  defaultFloor,
  defaultRent,
  defaultServiceCharge,
  defaultActive,
  labels,
}: {
  propertyId: string;
  flatId?: string;
  defaultName?: string;
  defaultFloor?: string;
  defaultRent?: string;
  defaultServiceCharge?: string;
  defaultActive?: boolean;
  labels: {
    flatName: string;
    flatNameHint?: string;
    floor: string;
    floorHint?: string;
    rent: string;
    serviceCharge: string;
    active?: string;
    save: string;
  };
}) {
  const action = flatId ? updateFlat.bind(null, flatId, propertyId) : createFlat.bind(null, propertyId);
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label={labels.flatName} hint={labels.flatNameHint}>
        <Input name="name" required autoFocus defaultValue={defaultName} placeholder="3A" />
      </Field>
      <Field label={labels.floor} hint={labels.floorHint}>
        <Input name="floor" required defaultValue={defaultFloor} placeholder="3rd Floor" />
      </Field>
      <Field label={labels.rent}>
        <Input name="rentAmount" type="number" step="0.01" min="0" required defaultValue={defaultRent ?? "0"} />
      </Field>
      <details className="rounded-lg border border-ink-900/10 p-3">
        <summary className="cursor-pointer text-xs font-medium text-ink-700">More settings</summary>
        <div className="mt-3">
          <Field label={labels.serviceCharge} hint="Optional recurring monthly charge, separate from rent">
            <Input name="serviceCharge" type="number" step="0.01" min="0" defaultValue={defaultServiceCharge ?? "0"} />
          </Field>
        </div>
      </details>
      {flatId && (
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <input type="checkbox" name="active" defaultChecked={defaultActive} className="h-4 w-4 rounded border-ink-900/20" />
          {labels.active}
        </label>
      )}
      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}
      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

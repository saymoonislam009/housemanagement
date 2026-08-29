"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createProperty, updateProperty } from "@/lib/actions/properties";
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

export function PropertyForm({
  propertyId,
  defaultName,
  defaultAddress,
  labels,
}: {
  propertyId?: string;
  defaultName?: string;
  defaultAddress?: string;
  labels: { name: string; nameHint?: string; address: string; save: string };
}) {
  const action = propertyId ? updateProperty.bind(null, propertyId) : createProperty;
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label={labels.name} hint={labels.nameHint}>
        <Input name="name" required autoFocus defaultValue={defaultName} />
      </Field>
      <Field label={labels.address}>
        <Input name="address" defaultValue={defaultAddress} />
      </Field>
      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}
      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

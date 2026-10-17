"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Field, Input, Select, Button } from "./ui";
import { updatePayment } from "@/lib/actions/billing";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function EditPaymentForm({
  paymentId,
  amount,
  method,
  paidOn,
  note,
  labels,
}: {
  paymentId: string;
  amount: string;
  method: string;
  paidOn: string;
  note: string | null;
  labels: Record<string, string>;
}) {
  const action = updatePayment.bind(null, paymentId);
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label={labels.amount}>
        <Input name="amount" type="number" step="0.01" min="0.01" required defaultValue={amount} className="tabular" />
      </Field>
      <Field label={labels.method}>
        <Select name="method" defaultValue={method}>
          <option value="cash">{labels.cash}</option>
          <option value="bkash">{labels.bkash}</option>
          <option value="nagad">{labels.nagad}</option>
          <option value="bank">{labels.bank}</option>
          <option value="other">{labels.other}</option>
        </Select>
      </Field>
      <Field label={labels.date}>
        <Input name="paidOn" type="date" required defaultValue={paidOn} />
      </Field>
      <Field label={labels.note}>
        <Input name="note" defaultValue={note ?? ""} />
      </Field>
      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}
      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

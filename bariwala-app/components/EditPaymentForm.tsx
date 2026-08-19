"use client";

import { Field, Input, Select, Button } from "./ui";
import { updatePayment } from "@/lib/actions/billing";

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
  return (
    <form action={updatePayment.bind(null, paymentId)} className="space-y-4">
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
      <Button type="submit" className="w-full">
        {labels.save}
      </Button>
    </form>
  );
}

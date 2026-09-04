"use client";

import { useState } from "react";
import { Field, Input, Select, Button } from "./ui";
import { recordPayment } from "@/lib/actions/billing";
import { CloseOnSuccess } from "./CloseOnSuccess";

export function PaymentForm({
  flatId,
  tenantId,
  adjustmentId,
  balance,
  labels,
}: {
  flatId: string;
  tenantId?: string | null;
  adjustmentId: string;
  balance: number;
  labels: Record<string, string>;
}) {
  const [amount, setAmount] = useState(Math.max(0, balance));
  return (
    <form action={recordPayment} className="space-y-4">
      <input type="hidden" name="flatId" value={flatId} />
      {tenantId && <input type="hidden" name="tenantId" value={tenantId} />}
      <input type="hidden" name="adjustmentId" value={adjustmentId} />

      <Field label={labels.amount}>
        <Input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="tabular"
        />
      </Field>
      <Field label={labels.method}>
        <Select name="method" defaultValue="cash">
          <option value="cash">{labels.cash}</option>
          <option value="bkash">{labels.bkash}</option>
          <option value="nagad">{labels.nagad}</option>
          <option value="bank">{labels.bank}</option>
          <option value="other">{labels.other}</option>
        </Select>
      </Field>
      <Field label={labels.date}>
        <Input name="paidOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label={labels.note}>
        <Input name="note" />
      </Field>
      <Button type="submit" className="w-full">
        {labels.save}
      </Button>
      <CloseOnSuccess />
    </form>
  );
}

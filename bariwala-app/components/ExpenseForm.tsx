"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { Field, Input, Select, Textarea, Button } from "./ui";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function ExpenseForm({
  expenseId,
  properties,
  defaultCategory,
  defaultPropertyId,
  defaultAmount,
  defaultSpentOn,
  defaultNote,
  labels,
}: {
  expenseId?: string;
  properties: { id: string; name: string }[];
  defaultCategory?: string;
  defaultPropertyId?: string | null;
  defaultAmount?: string;
  defaultSpentOn?: string;
  defaultNote?: string | null;
  labels: {
    category: string;
    properties: string;
    optional: string;
    amount: string;
    spentOn: string;
    note: string;
    save: string;
  };
}) {
  const action = expenseId ? updateExpense.bind(null, expenseId) : createExpense;
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label={labels.category}>
        <Input name="category" required autoFocus defaultValue={defaultCategory} placeholder="Maintenance, Repairs, Staff…" />
      </Field>
      <Field label={`${labels.properties} (${labels.optional})`}>
        <Select name="propertyId" defaultValue={defaultPropertyId ?? ""}>
          <option value="">—</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.amount}>
        <Input name="amount" type="number" step="0.01" min="0.01" required defaultValue={defaultAmount} />
      </Field>
      <Field label={labels.spentOn}>
        <Input name="spentOn" type="date" required defaultValue={defaultSpentOn ?? new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label={labels.note}>
        <Textarea name="note" rows={2} defaultValue={defaultNote ?? ""} />
      </Field>
      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}
      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

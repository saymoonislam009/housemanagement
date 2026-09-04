"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Field, Input, Button } from "./ui";
import { recordReading } from "@/lib/actions/meters";
import { money } from "@/lib/format";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function ReadingForm({
  meterId,
  month,
  previousReading,
  unitRate,
  meterCharge,
  otherCharge,
  existingCurrent,
  labels,
  currency,
}: {
  meterId: string;
  month: string;
  previousReading: number;
  unitRate: number;
  meterCharge: number;
  otherCharge: number;
  existingCurrent?: number;
  labels: Record<string, string>;
  currency: string;
}) {
  const [current, setCurrent] = useState(existingCurrent ?? previousReading);
  const [mCharge, setMCharge] = useState(meterCharge);
  const [oCharge, setOCharge] = useState(otherCharge);
  const [state, formAction] = useFormState(recordReading, null);

  const units = Math.max(0, current - previousReading);
  const amount = units * unitRate + mCharge + oCharge;
  const readingTooLow = current < previousReading;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="meterId" value={meterId} />
      <input type="hidden" name="month" value={month} />

      <div className="grid grid-cols-2 gap-3">
        <Field label={labels.previous_reading}>
          <Input value={previousReading} disabled className="tabular bg-ink-900/5" />
        </Field>
        <Field label={labels.current_reading}>
          <Input
            name="currentReading"
            type="number"
            step="0.01"
            required
            value={current}
            onChange={(e) => setCurrent(parseFloat(e.target.value) || 0)}
            className={`tabular ${readingTooLow ? "border-clay-500" : ""}`}
          />
        </Field>
      </div>

      {readingTooLow && (
        <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-xs text-clay-500">
          This is lower than the previous reading ({previousReading}). If the meter was reset or replaced, edit the
          meter's starting reading instead of entering a lower number here.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={labels.meter_charge}>
          <Input
            name="meterCharge"
            type="number"
            step="0.01"
            value={mCharge}
            onChange={(e) => setMCharge(parseFloat(e.target.value) || 0)}
            className="tabular"
          />
        </Field>
        <Field label={labels.other_charge}>
          <Input
            name="otherCharge"
            type="number"
            step="0.01"
            value={oCharge}
            onChange={(e) => setOCharge(parseFloat(e.target.value) || 0)}
            className="tabular"
          />
        </Field>
      </div>

      <Field label={labels.note}>
        <Input name="notes" />
      </Field>

      <div className="rounded-lg bg-brass-400/10 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-ink-700">{labels.units_used}</span>
          <span className="tabular font-medium text-ink-900">{units.toFixed(2)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-ink-700">{labels.amount}</span>
          <span className="tabular font-semibold text-ink-950">{money(amount, currency)}</span>
        </div>
      </div>

      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}

      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

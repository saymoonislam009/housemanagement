"use client";

import { useState } from "react";
import { Field, Input, Button } from "./ui";
import { recordReading } from "@/lib/actions/meters";
import { money } from "@/lib/format";
import { CloseOnSuccess } from "./CloseOnSuccess";

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

  const units = Math.max(0, current - previousReading);
  const amount = units * unitRate + mCharge + oCharge;

  return (
    <form action={recordReading} className="space-y-4">
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
            className="tabular"
          />
        </Field>
      </div>

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

      <Button type="submit" className="w-full">
        {labels.save}
      </Button>
      <CloseOnSuccess />
    </form>
  );
}

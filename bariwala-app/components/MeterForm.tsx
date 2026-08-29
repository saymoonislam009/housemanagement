"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMeter, updateMeter } from "@/lib/actions/meters";
import { Field, Input, Select, Button } from "./ui";
import { CloseOnSuccess } from "./CloseOnSuccess";
import { AllocationAdvanced } from "./AllocationAdvanced";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

const TYPE_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "electricity", labelKey: "electricity" },
  { value: "water", labelKey: "water" },
  { value: "gas", labelKey: "gas" },
  { value: "pump", labelKey: "pump" },
  { value: "other", labelKey: "other" },
];

export function MeterForm({
  meterId,
  properties,
  flatOptions,
  defaultValues,
  labels,
}: {
  meterId?: string;
  properties?: { id: string; name: string }[];
  flatOptions?: { id: string; name: string; propertyName: string }[];
  defaultValues?: {
    propertyId?: string;
    flatId?: string | null;
    scope?: string;
    type?: string;
    label?: string;
    unitRate?: string;
    meterCharge?: string;
    otherCharge?: string;
    startingReading?: string;
    allocationMethod?: string;
    active?: boolean;
    defaultUnitRate?: number;
    defaultMeterCharge?: number;
    defaultOtherCharge?: number;
  };
  labels: {
    property: string;
    selectFlat: string;
    optional: string;
    sharedMeter: string;
    type: string;
    electricity: string;
    water: string;
    gas: string;
    pump: string;
    other: string;
    label: string;
    unitRate: string;
    meterCharge: string;
    otherCharge: string;
    startingReading: string;
    active: string;
    save: string;
  };
}) {
  const typeLabelMap: Record<string, string> = {
    electricity: labels.electricity,
    water: labels.water,
    gas: labels.gas,
    pump: labels.pump,
    other: labels.other,
  };

  const action = meterId ? updateMeter.bind(null, meterId) : createMeter;
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      {!meterId && properties && (
        <Field label={labels.property}>
          <Select name="propertyId" required defaultValue="">
            <option value="" disabled>
              {labels.property}
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {!meterId && flatOptions && (
        <Field label={`${labels.selectFlat} (${labels.optional} — ${labels.sharedMeter})`}>
          <Select name="flatId" defaultValue="">
            <option value="">{labels.sharedMeter}</option>
            {flatOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.propertyName} · {f.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={labels.type}>
        <Select name="type" defaultValue={defaultValues?.type ?? "electricity"}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {typeLabelMap[o.labelKey]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.label}>
        <Input name="label" required defaultValue={defaultValues?.label} placeholder="Electricity - 3B" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={labels.unitRate}>
          <Input
            name="unitRate"
            type="number"
            step="0.0001"
            min="0"
            defaultValue={defaultValues?.unitRate ?? defaultValues?.defaultUnitRate ?? 0}
          />
        </Field>
        <Field label={labels.meterCharge}>
          <Input
            name="meterCharge"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.meterCharge ?? defaultValues?.defaultMeterCharge ?? 0}
          />
        </Field>
        <Field label={labels.otherCharge}>
          <Input
            name="otherCharge"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.otherCharge ?? defaultValues?.defaultOtherCharge ?? 0}
          />
        </Field>
      </div>
      {!meterId && (
        <Field label={labels.startingReading}>
          <Input name="startingReading" type="number" step="0.01" min="0" defaultValue={defaultValues?.startingReading ?? 0} />
        </Field>
      )}
      {!meterId && (
        <AllocationAdvanced
          labels={{
            advanced: "More settings",
            allocation: "Shared cost handling",
            ownerExpense: "Owner expense (don't bill tenants)",
            equalSplit: "Split equally across flats",
            hint: "Only applies to shared meters like a water pump",
          }}
        />
      )}
      {meterId && !defaultValues?.flatId && (
        <Field label="Shared cost handling" hint="How this shared meter's cost affects tenant bills">
          <Select name="allocationMethod" defaultValue={defaultValues?.allocationMethod ?? "owner_expense"}>
            <option value="owner_expense">Owner expense (don't bill tenants)</option>
            <option value="equal_split">Split equally across flats</option>
          </Select>
        </Field>
      )}
      {meterId && (
        <label className="flex items-center gap-2 text-sm text-ink-800">
          <input type="checkbox" name="active" defaultChecked={defaultValues?.active} className="h-4 w-4 rounded border-ink-900/20" />
          {labels.active}
        </label>
      )}
      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}
      <SubmitButton label={labels.save} />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

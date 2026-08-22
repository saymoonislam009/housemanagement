"use client";

import { useState } from "react";
import { setCategoryOverride } from "@/lib/actions/billing";
import { money } from "@/lib/format";

export function CategoryRow({
  adjustmentId,
  category,
  label,
  computedValue,
  overrideValue,
  currency,
  useMeterLabel,
}: {
  adjustmentId: string;
  category: "electricity" | "water" | "gas" | "other" | "serviceCharge";
  label: string;
  computedValue: number;
  overrideValue: number | undefined;
  currency: string;
  useMeterLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const displayValue = overrideValue ?? computedValue;
  const isOverridden = overrideValue !== undefined;

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-ink-900/[0.03]"
      >
        <span className="text-xs text-ink-600">
          {label}
          {isOverridden && <span className="ml-1 text-brass-600">•</span>}
        </span>
        <span className="tabular text-sm font-medium text-ink-900">{money(displayValue, currency)}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-brass-400/10 px-2 py-1.5">
      <form
        action={async (formData) => {
          await setCategoryOverride(adjustmentId, formData);
          setEditing(false);
        }}
        className="flex flex-1 items-center gap-2"
      >
        <input type="hidden" name="category" value={category} />
        <span className="shrink-0 text-xs text-ink-700">{label}</span>
        <input
          name="value"
          type="number"
          step="0.01"
          defaultValue={displayValue}
          autoFocus
          className="tabular w-24 rounded border border-ink-900/15 bg-paper-50 px-2 py-1 text-sm"
        />
        <button type="submit" className="shrink-0 text-xs font-medium text-brass-600">
          ✓
        </button>
      </form>
      {isOverridden && (
        <form
          action={async (formData) => {
            await setCategoryOverride(adjustmentId, formData);
            setEditing(false);
          }}
        >
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="value" value="" />
          <button type="submit" className="shrink-0 text-[11px] text-ink-500 underline" title={useMeterLabel}>
            ↺
          </button>
        </form>
      )}
      <button type="button" onClick={() => setEditing(false)} className="shrink-0 text-xs text-ink-500">
        ✕
      </button>
    </div>
  );
}

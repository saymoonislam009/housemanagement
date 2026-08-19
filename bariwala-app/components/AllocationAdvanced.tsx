"use client";

import { useEffect, useState } from "react";
import { Field, Select } from "./ui";

export function AllocationAdvanced({
  flatSelectName = "flatId",
  labels,
  defaultValue = "owner_expense",
}: {
  flatSelectName?: string;
  labels: { advanced: string; allocation: string; ownerExpense: string; equalSplit: string; hint: string };
  defaultValue?: string;
}) {
  const [isShared, setIsShared] = useState(true);

  useEffect(() => {
    const el = document.querySelector<HTMLSelectElement>(`select[name="${flatSelectName}"]`);
    if (!el) return;
    const update = () => setIsShared(el.value === "");
    update();
    el.addEventListener("change", update);
    return () => el.removeEventListener("change", update);
  }, [flatSelectName]);

  if (!isShared) return null;

  return (
    <details className="rounded-lg border border-ink-900/10 p-3 open:bg-ink-900/[0.02]">
      <summary className="cursor-pointer text-xs font-medium text-ink-700">{labels.advanced}</summary>
      <div className="mt-3">
        <Field label={labels.allocation} hint={labels.hint}>
          <Select name="allocationMethod" defaultValue={defaultValue}>
            <option value="owner_expense">{labels.ownerExpense}</option>
            <option value="equal_split">{labels.equalSplit}</option>
          </Select>
        </Field>
      </div>
    </details>
  );
}

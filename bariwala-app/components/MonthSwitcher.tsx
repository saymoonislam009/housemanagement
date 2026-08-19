"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Icon, paths } from "./icons";
import { monthLabel, monthOffset } from "@/lib/format";

export function MonthSwitcher({ month, locale }: { month: string; locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dLocale = locale === "bn" ? "bn-BD" : "en-US";

  function go(m: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", m);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-ink-900/12 bg-paper-50 p-1">
      <button onClick={() => go(monthOffset(month, -1))} className="rounded-md p-1.5 hover:bg-ink-900/5" aria-label="Previous month">
        <Icon path={paths.arrowRight} className="h-4 w-4 rotate-180" />
      </button>
      <span className="min-w-[9rem] text-center text-sm font-medium text-ink-900">{monthLabel(month, dLocale)}</span>
      <button onClick={() => go(monthOffset(month, 1))} className="rounded-md p-1.5 hover:bg-ink-900/5" aria-label="Next month">
        <Icon path={paths.arrowRight} className="h-4 w-4" />
      </button>
    </div>
  );
}

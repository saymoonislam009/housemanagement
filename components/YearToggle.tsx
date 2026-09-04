"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function YearToggle({
  showYear,
  thisYearLabel,
  monthLabel,
}: {
  showYear: boolean;
  thisYearLabel: string;
  monthLabel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(view: "month" | "year") {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "year") params.set("view", "year");
    else params.delete("view");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-ink-900/12 bg-paper-50 p-1 text-xs">
      <button
        onClick={() => setView("month")}
        className={`rounded-md px-2.5 py-1.5 font-medium ${!showYear ? "bg-ink-900 text-paper-50" : "text-ink-700"}`}
      >
        {monthLabel}
      </button>
      <button
        onClick={() => setView("year")}
        className={`rounded-md px-2.5 py-1.5 font-medium ${showYear ? "bg-ink-900 text-paper-50" : "text-ink-700"}`}
      >
        {thisYearLabel}
      </button>
    </div>
  );
}

"use client";

export function PrintButton({ label = "Print / Save as PDF", showHint = true }: { label?: string; showHint?: boolean }) {
  return (
    <div className="print:hidden flex flex-col items-end gap-1">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-800"
      >
        {label}
      </button>
      {showHint && (
        <p className="max-w-[220px] text-right text-[11px] text-ink-500">
          In the dialog, choose "Save as PDF" as the printer to download it instead
        </p>
      )}
    </div>
  );
}

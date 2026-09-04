"use client";

export function MarkMovedOutButton({
  action,
  confirmText,
  label,
}: {
  action: () => Promise<void>;
  confirmText: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink-900/12 bg-transparent px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-900/5"
      >
        {label}
      </button>
    </form>
  );
}

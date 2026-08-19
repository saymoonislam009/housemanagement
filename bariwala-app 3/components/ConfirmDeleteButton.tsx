"use client";

import { Icon, paths } from "./icons";

export function ConfirmDeleteButton({
  action,
  confirmText,
  className = "rounded-lg p-1.5 text-ink-600/50 hover:bg-clay-500/10 hover:text-clay-500",
  iconClassName = "h-4 w-4",
}: {
  action: () => Promise<void>;
  confirmText: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <button type="submit" className={className} aria-label="Delete">
        <Icon path={paths.trash} className={iconClassName} />
      </button>
    </form>
  );
}

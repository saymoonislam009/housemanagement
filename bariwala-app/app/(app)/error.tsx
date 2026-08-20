"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep this out of the user-facing UI (spec #49) — a server-side log is enough here.
    console.error(error);
  }, [error]);

  const isOwnership = error.message === "NOT_FOUND_OR_FORBIDDEN";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-500/15 text-clay-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
          <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      {isOwnership ? (
        <>
          <h1 className="font-display text-xl font-semibold text-ink-950">That couldn't be found</h1>
          <p className="mt-2 max-w-sm text-sm text-ink-600">
            It may have been removed, or it doesn't belong to your account.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-display text-xl font-semibold text-ink-950">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-ink-600">
            Please try again. If this keeps happening, come back to the dashboard and retry from there.
          </p>
          {/* TEMPORARY debug output — remove once the root cause is confirmed fixed. */}
          <div className="mt-4 max-w-md rounded-lg bg-ink-900/5 p-3 text-left">
            <p className="break-words font-mono text-xs text-clay-500">{error.message || "(no message)"}</p>
            {error.digest && <p className="mt-1 font-mono text-[10px] text-ink-500">digest: {error.digest}</p>}
          </div>
        </>
      )}
      <div className="mt-6 flex gap-2">
        <Button variant="ghost" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

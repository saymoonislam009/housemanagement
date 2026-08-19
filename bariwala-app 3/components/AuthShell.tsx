import { ReactNode } from "react";
import { getDict, getLocale } from "@/lib/i18n";
import { setLanguage } from "@/lib/actions/settings";

export function AuthShell({ children }: { children: ReactNode }) {
  const locale = getLocale();
  const t = getDict(locale);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
      {/* Meter-dial signature motif, ambient */}
      <svg
        className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] opacity-[0.08] sm:-right-20 sm:-top-20"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="90" stroke="#E8C77E" strokeWidth="1" fill="none" />
        <circle cx="100" cy="100" r="70" stroke="#E8C77E" strokeWidth="1" fill="none" />
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const x1 = 100 + Math.cos(angle) * 90;
          const y1 = 100 + Math.sin(angle) * 90;
          const x2 = 100 + Math.cos(angle) * 82;
          const y2 = 100 + Math.sin(angle) * 82;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E8C77E" strokeWidth="1" />;
        })}
      </svg>

      <div className="absolute right-4 top-4">
        <form action={async () => { "use server"; await setLanguage(locale === "en" ? "bn" : "en"); }}>
          <button className="rounded-lg border border-paper-50/15 px-3 py-1.5 text-xs font-medium text-paper-50/80 hover:bg-paper-50/5">
            {locale === "en" ? "বাংলা" : "English"}
          </button>
        </form>
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass-500 font-display text-lg font-bold text-ink-950">
            বা
          </div>
          <span className="font-display text-xl font-semibold text-paper-50">{t("app_name")}</span>
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

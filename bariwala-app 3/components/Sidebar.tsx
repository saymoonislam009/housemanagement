"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { NAV_ITEMS } from "./nav-config";
import type { Locale } from "@/lib/i18n/dictionaries";
import { dictionaries } from "@/lib/i18n/dictionaries";

export function Sidebar({ locale, orgName }: { locale: Locale; orgName: string }) {
  const pathname = usePathname();
  const t = (k: keyof typeof dictionaries.en) => dictionaries[locale][k];

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-900/10 bg-ink-950 md:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brass-500 font-display text-base font-bold text-ink-950">
          বা
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-paper-50">{t("app_name")}</p>
          <p className="truncate text-xs text-paper-50/50">{orgName}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-brass-500/15 text-brass-400 font-medium"
                  : "text-paper-50/65 hover:bg-paper-50/5 hover:text-paper-50"
              }`}
            >
              <Icon path={item.icon} className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

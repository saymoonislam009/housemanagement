"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, paths } from "./icons";
import { NAV_ITEMS, MOBILE_PRIMARY } from "./nav-config";
import type { Locale } from "@/lib/i18n/dictionaries";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { useState } from "react";

export function BottomNav({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = (k: keyof typeof dictionaries.en) => dictionaries[locale][k];
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.href));
  const rest = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY.includes(i.href));
  const moreActive = rest.some((i) => pathname.startsWith(i.href));

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-paper-50 p-4 pb-8 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-900/15" />
            <div className="grid grid-cols-3 gap-2">
              {rest.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-ink-900/8 p-4 text-ink-800 active:bg-ink-900/5"
                >
                  <Icon path={item.icon} className="h-5 w-5" />
                  <span className="text-xs">{t(item.key)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-ink-900/10 bg-paper-50/95 backdrop-blur md:hidden">
        {primary.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
                active ? "text-brass-600" : "text-ink-600"
              }`}
            >
              <Icon path={item.icon} className="h-5 w-5" />
              {t(item.key).split(" ")[0]}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
            moreActive ? "text-brass-600" : "text-ink-600"
          }`}
        >
          <Icon path={paths.menu} className="h-5 w-5" />
          {locale === "bn" ? "আরও" : "More"}
        </button>
      </nav>
    </>
  );
}

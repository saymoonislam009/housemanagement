import { Icon, paths } from "./icons";
import { getDict, type Locale } from "@/lib/i18n";
import { setLanguage, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/settings";
import { logoutAction } from "@/lib/actions/auth";
import { shortDate } from "@/lib/format";

export function TopBar({
  locale,
  notifications,
  unreadCount,
  title,
}: {
  locale: Locale;
  notifications: { id: string; title: string; body: string | null; read: boolean; createdAt: Date }[];
  unreadCount: number;
  title?: string;
}) {
  const t = getDict(locale);
  const dLocale = locale === "bn" ? "bn-BD" : "en-US";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ink-900/10 bg-paper-100/90 px-4 py-3 backdrop-blur md:px-8 print:hidden">
      <p className="truncate font-display text-base font-medium text-ink-900 md:text-lg">{title}</p>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Language switcher */}
        <form action={async () => { "use server"; await setLanguage(locale === "en" ? "bn" : "en"); }}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-ink-900/12 px-2.5 py-1.5 text-xs font-medium text-ink-800 hover:bg-ink-900/5"
            aria-label="Switch language"
          >
            <Icon path={paths.globe} className="h-4 w-4" />
            {locale === "en" ? "বাং" : "EN"}
          </button>
        </form>

        {/* Notifications */}
        <details className="group relative">
          <summary className="relative flex h-9 w-9 list-none items-center justify-center rounded-lg border border-ink-900/12 text-ink-800 hover:bg-ink-900/5 [&::-webkit-details-marker]:hidden">
            <Icon path={paths.bell} className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-clay-500 text-[10px] font-bold text-paper-50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </summary>
          <div className="absolute right-0 z-30 mt-2 w-80 max-w-[85vw] rounded-card border border-ink-900/10 bg-paper-50 shadow-card">
            <div className="flex items-center justify-between border-b border-ink-900/10 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">{t("notifications")}</p>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button className="text-xs font-medium text-brass-600 hover:underline">
                    {t("mark_all_read")}
                  </button>
                </form>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-600">{t("no_notifications")}</p>
              ) : (
                notifications.map((n) => (
                  <form
                    key={n.id}
                    action={markNotificationRead.bind(null, n.id)}
                    className={`block w-full border-b border-ink-900/5 px-4 py-3 text-left last:border-0 ${
                      n.read ? "opacity-60" : "bg-brass-400/5"
                    }`}
                  >
                    <button type="submit" className="w-full text-left">
                      <p className="text-sm font-medium text-ink-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-ink-600">{n.body}</p>}
                      <p className="mt-1 text-[11px] text-ink-600/60">{shortDate(n.createdAt, dLocale)}</p>
                    </button>
                  </form>
                ))
              )}
            </div>
          </div>
        </details>

        {/* Logout */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-900/12 text-ink-800 hover:bg-ink-900/5"
            aria-label={t("log_out")}
          >
            <Icon path={paths.logout} className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}

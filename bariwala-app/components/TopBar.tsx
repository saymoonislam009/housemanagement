import { Icon, paths } from "./icons";
import { InstallApp } from "./InstallApp";
import { getDict, type Locale } from "@/lib/i18n";
import { setLanguage, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/settings";
import { logoutAction } from "@/lib/actions/auth";
import { shortDate, timeAgo } from "@/lib/format";

export function TopBar({
  locale,
  notifications,
  unreadCount,
  title,
}: {
  locale: Locale;
  notifications: { id: string; title: string; body: string | null; read: boolean; createdAt: Date; kind: string }[];
  unreadCount: number;
  title?: string;
}) {
  const t = getDict(locale);
  const dLocale = locale === "bn" ? "bn-BD" : "en-US";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ink-900/10 bg-paper-100/90 px-4 py-3 backdrop-blur md:px-8 print:hidden">
      <p className="truncate font-display text-base font-medium text-ink-900 md:text-lg">{title}</p>

      <div className="flex shrink-0 items-center gap-1.5">
        <InstallApp variant="button" />

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
                notifications.map((n) => {
                  const kindStyle: Record<string, { icon: string; color: string }> = {
                    payment: { icon: paths.wallet, color: "text-okay bg-okay/10" },
                    due: { icon: paths.receipt, color: "text-clay-500 bg-clay-500/10" },
                    system: { icon: paths.building, color: "text-brass-600 bg-brass-400/15" },
                    info: { icon: paths.bell, color: "text-ink-600 bg-ink-900/8" },
                  };
                  const style = kindStyle[n.kind] ?? kindStyle.info;
                  return (
                    <form
                      key={n.id}
                      action={markNotificationRead.bind(null, n.id)}
                      className={`block w-full border-b border-ink-900/5 px-4 py-3 text-left last:border-0 ${
                        n.read ? "opacity-60" : "bg-brass-400/5"
                      }`}
                    >
                      <button type="submit" className="flex w-full items-start gap-3 text-left">
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.color}`}>
                          <Icon path={style.icon} className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-ink-900">{n.title}</span>
                            {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brass-600" />}
                          </span>
                          {n.body && <span className="mt-0.5 block text-xs text-ink-600">{n.body}</span>}
                          <span className="mt-1 block text-[11px] text-ink-600/60">{timeAgo(n.createdAt, dLocale)}</span>
                        </span>
                      </button>
                    </form>
                  );
                })
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

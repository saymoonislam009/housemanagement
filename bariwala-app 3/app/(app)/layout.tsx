import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { TopBar } from "@/components/TopBar";
import { getOrgContext, getNotifications, getUnreadCount } from "@/lib/queries";
import { getLocale } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { org } = await getOrgContext();
  const locale = getLocale();
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(org.id),
    getUnreadCount(org.id),
  ]);

  return (
    <div className="flex min-h-screen bg-paper-100">
      <Sidebar locale={locale} orgName={org.name} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar locale={locale} notifications={notifications} unreadCount={unreadCount} title={org.name} />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-6">{children}</main>
      </div>
      <BottomNav locale={locale} />
    </div>
  );
}

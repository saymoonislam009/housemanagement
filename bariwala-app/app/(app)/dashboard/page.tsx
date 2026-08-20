import { getOrgContext, getAdjustmentsForMonth, getExpensesForOrg, getPropertiesWithFlats, getPaymentsForOrg, getNeedsAttention } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, StatusPill } from "@/components/ui";
import { money, firstOfMonth, monthLabel } from "@/lib/format";
import { Icon, paths } from "@/components/icons";
import Link from "next/link";

export default async function DashboardPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const month = firstOfMonth();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";

  const [adjustments, expensesList, properties, recentPayments, attention] = await Promise.all([
    getAdjustmentsForMonth(org.id, month),
    getExpensesForOrg(org.id),
    getPropertiesWithFlats(org.id),
    getPaymentsForOrg(org.id),
    getNeedsAttention(org.id, month),
  ]);

  const collected = adjustments.reduce((s, a) => s + parseFloat(a.totalPaid), 0);
  const due = adjustments.reduce((s, a) => s + Math.max(0, parseFloat(a.totalDue) - parseFloat(a.totalPaid)), 0);
  const occupiedFlats = properties.flatMap((p) => p.flats).filter((f: any) => f.tenants?.some((tn: any) => tn.active)).length;
  const totalFlats = properties.flatMap((p) => p.flats).length;
  const monthExpenses = expensesList
    .filter((e) => e.spentOn.slice(0, 7) === month.slice(0, 7))
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  const stats = [
    { label: t("stat_collected"), value: money(collected, org.currency), icon: paths.wallet, tone: "text-okay" },
    { label: t("stat_due"), value: money(due, org.currency), icon: paths.receipt, tone: "text-clay-500" },
    { label: t("stat_flats"), value: `${occupiedFlats}/${totalFlats}`, icon: paths.building, tone: "text-brass-600" },
    { label: t("stat_expenses"), value: money(monthExpenses, org.currency), icon: paths.chart, tone: "text-ink-700" },
  ];

  const quickActions = [
    { href: "/properties", label: t("add_property"), icon: paths.building },
    { href: "/tenants", label: t("add_tenant"), icon: paths.users },
    { href: "/meters", label: t("record_reading"), icon: paths.gauge },
    { href: "/bills", label: t("record_payment"), icon: paths.wallet },
    { href: "/expenses", label: t("add_expense"), icon: paths.chart },
  ];

  return (
    <div>
      <PageHeader title={t("dashboard_title")} sub={`${t("dashboard_sub")} · ${monthLabel(month, dLocale)}`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900/5 ${s.tone}`}>
              <Icon path={s.icon} className="h-4 w-4" />
            </div>
            <p className="tabular font-display text-xl font-semibold text-ink-950 sm:text-2xl">{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-600">{s.label}</p>
          </Card>
        ))}
      </div>

      {(attention.unpaidCount > 0 || attention.vacantCount > 0 || attention.missingReadings > 0) && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{t("needs_attention")}</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {attention.unpaidCount > 0 && (
              <Link href="/bills" className="card flex items-center gap-3 !p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/15 text-clay-500">
                  <Icon path={paths.receipt} className="h-4 w-4" />
                </div>
                <p className="text-sm text-ink-900">
                  <span className="font-semibold">{attention.unpaidCount}</span> {t("unpaid_flats_notice")}
                </p>
              </Link>
            )}
            {attention.missingReadings > 0 && (
              <Link href="/meters" className="card flex items-center gap-3 !p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass-400/20 text-brass-600">
                  <Icon path={paths.gauge} className="h-4 w-4" />
                </div>
                <p className="text-sm text-ink-900">
                  <span className="font-semibold">{attention.missingReadings}</span> {t("missing_readings_notice")}
                </p>
              </Link>
            )}
            {attention.vacantCount > 0 && (
              <Link href="/properties" className="card flex items-center gap-3 !p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900/8 text-ink-700">
                  <Icon path={paths.building} className="h-4 w-4" />
                </div>
                <p className="text-sm text-ink-900">
                  <span className="font-semibold">{attention.vacantCount}</span> {t("vacant_flats_notice")}
                </p>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-ink-800">{t("quick_actions")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="card flex items-center gap-3 !p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brass-400/20 text-brass-600">
                <Icon path={a.icon} className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-ink-900">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-800">{t("bills_title")}</h2>
            <Link href="/bills" className="text-xs font-medium text-brass-600 hover:underline">
              {t("view")}
            </Link>
          </div>
          {adjustments.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-600">{t("nothing_yet")}</p>
          ) : (
            <div className="space-y-2">
              {adjustments.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink-900/[0.03]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {a.propertyName} · {a.flatName}
                    </p>
                    <p className="text-xs text-ink-600">{a.floor}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular text-sm text-ink-800">{money(a.totalDue, org.currency)}</span>
                    <StatusPill
                      status={a.status}
                      labels={{ unpaid: t("unpaid"), partial: t("partial"), paid: t("fully_paid") }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{t("recent_activity")}</h2>
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-600">{t("nothing_yet")}</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink-900/[0.03]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {p.tenantName ?? p.flatName} — {p.propertyName}
                    </p>
                    <p className="text-xs text-ink-600">{p.paidOn}</p>
                  </div>
                  <span className="tabular shrink-0 text-sm font-medium text-okay">
                    +{money(p.amount, org.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

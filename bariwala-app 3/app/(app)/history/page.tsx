import { getOrgContext, getHouseSummaryForMonth, getYearSummary } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, StatusPill } from "@/components/ui";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { YearToggle } from "@/components/YearToggle";
import { money, firstOfMonth, monthLabel } from "@/lib/format";
import Link from "next/link";

export default async function HistoryPage({ searchParams }: { searchParams: { month?: string; view?: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const month = searchParams.month || firstOfMonth();
  const showYear = searchParams.view === "year";
  const year = month.slice(0, 4);

  const summary = await getHouseSummaryForMonth(org.id, month);
  const yearRows = showYear ? await getYearSummary(org.id, year) : [];

  return (
    <div>
      <PageHeader
        title={t("monthly_history_title")}
        sub={t("monthly_history_sub")}
        action={
          <div className="flex items-center gap-2">
            <YearToggle showYear={showYear} thisYearLabel={t("this_year")} monthLabel={t("month")} />
            {!showYear && <MonthSwitcher month={month} locale={org.language} />}
          </div>
        }
      />

      {showYear ? (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-900/10 text-left text-xs text-ink-600">
                  <th className="px-4 py-3 font-medium">{t("month")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("expected")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("collected")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("outstanding")}</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-600">
                      {t("nothing_yet")}
                    </td>
                  </tr>
                ) : (
                  yearRows.map((r) => (
                    <tr key={r.month} className="border-b border-ink-900/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink-900">{monthLabel(r.month, dLocale)}</td>
                      <td className="tabular px-4 py-3 text-right text-ink-800">{money(r.expected, org.currency)}</td>
                      <td className="tabular px-4 py-3 text-right text-okay">{money(r.collected, org.currency)}</td>
                      <td className={`tabular px-4 py-3 text-right ${r.outstanding > 0 ? "text-clay-500" : "text-ink-600"}`}>
                        {money(r.outstanding, org.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="!p-4">
              <p className="tabular font-display text-xl font-semibold text-ink-950">{money(summary.expected, org.currency)}</p>
              <p className="text-xs text-ink-600">{t("expected")}</p>
            </Card>
            <Card className="!p-4">
              <p className="tabular font-display text-xl font-semibold text-okay">{money(summary.collected, org.currency)}</p>
              <p className="text-xs text-ink-600">{t("collected")}</p>
            </Card>
            <Card className="!p-4">
              <p className="tabular font-display text-xl font-semibold text-clay-500">{money(summary.outstanding, org.currency)}</p>
              <p className="text-xs text-ink-600">{t("outstanding")}</p>
            </Card>
            <Card className="!p-4">
              <p className="tabular font-display text-xl font-semibold text-ink-700">{money(summary.expenses, org.currency)}</p>
              <p className="text-xs text-ink-600">{t("stat_expenses")}</p>
            </Card>
          </div>

          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/10 text-left text-xs text-ink-600">
                    <th className="px-4 py-3 font-medium">{t("flat_name")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("rent")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("bills")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("total_due")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("paid")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("balance")}</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {summary.adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-600">
                        {t("no_flats")}
                      </td>
                    </tr>
                  ) : (
                    summary.adjustments.map((a) => {
                      const remaining = Math.max(0, parseFloat(a.totalDue) - parseFloat(a.totalPaid));
                      return (
                        <tr key={a.id} className="border-b border-ink-900/5 last:border-0 hover:bg-ink-900/[0.02]">
                          <td className="px-4 py-3 font-medium text-ink-900">
                            {a.propertyName} · {a.flatName}
                          </td>
                          <td className="tabular px-4 py-3 text-right text-ink-700">{money(a.rentAmount, org.currency)}</td>
                          <td className="tabular px-4 py-3 text-right text-ink-700">{money(a.billsAmount, org.currency)}</td>
                          <td className="tabular px-4 py-3 text-right font-medium text-ink-900">{money(a.totalDue, org.currency)}</td>
                          <td className="tabular px-4 py-3 text-right text-okay">{money(a.totalPaid, org.currency)}</td>
                          <td className={`tabular px-4 py-3 text-right ${remaining > 0 ? "text-clay-500" : "text-ink-600"}`}>
                            {money(remaining, org.currency)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusPill status={a.status} labels={{ unpaid: t("unpaid"), partial: t("partial"), paid: t("fully_paid") }} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="mt-3 text-center text-xs text-ink-500">
            <Link href="/bills" className="underline hover:text-ink-800">
              Edit this month's bills
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

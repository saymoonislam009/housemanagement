import { getOrgContext, getExpensesForOrg } from "@/lib/queries";
import { db } from "@/db";
import { monthlyAdjustments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card } from "@/components/ui";
import { money, monthLabel } from "@/lib/format";

export default async function ReportsPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";

  const [adjustments, expenses] = await Promise.all([
    db.query.monthlyAdjustments.findMany({ where: eq(monthlyAdjustments.orgId, org.id) }),
    getExpensesForOrg(org.id),
  ]);

  const byMonth = new Map<string, { collected: number; due: number; expenses: number }>();
  for (const a of adjustments) {
    const key = a.month;
    const entry = byMonth.get(key) ?? { collected: 0, due: 0, expenses: 0 };
    entry.collected += parseFloat(a.totalPaid);
    entry.due += parseFloat(a.totalDue);
    byMonth.set(key, entry);
  }
  for (const e of expenses) {
    const key = e.spentOn.slice(0, 8) + "01";
    const entry = byMonth.get(key) ?? { collected: 0, due: 0, expenses: 0 };
    entry.expenses += parseFloat(e.amount);
    byMonth.set(key, entry);
  }

  const months = Array.from(byMonth.keys()).sort().reverse().slice(0, 12);
  const maxVal = Math.max(1, ...months.map((m) => Math.max(byMonth.get(m)!.collected, byMonth.get(m)!.expenses)));

  return (
    <div>
      <PageHeader title={t("reports_title")} sub={t("reports_sub")} />

      {months.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-600">{t("nothing_yet")}</p>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-okay" /> {t("stat_collected")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-clay-500" /> {t("expenses_title")}
            </span>
          </div>
          <div className="space-y-3">
            {months.map((m) => {
              const d = byMonth.get(m)!;
              return (
                <div key={m}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-800">{monthLabel(m, dLocale)}</span>
                    <span className="tabular text-ink-600">
                      {money(d.collected, org.currency)} / -{money(d.expenses, org.currency)}
                    </span>
                  </div>
                  <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-ink-900/5">
                    <div
                      className="h-full rounded-full bg-okay"
                      style={{ width: `${(d.collected / maxVal) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 flex h-2 gap-1 overflow-hidden rounded-full bg-ink-900/5">
                    <div
                      className="h-full rounded-full bg-clay-500"
                      style={{ width: `${(d.expenses / maxVal) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

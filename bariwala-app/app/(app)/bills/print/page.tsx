import { getOrgContext, getAdjustmentsForMonth, getTenantsByFlatIds } from "@/lib/queries";
import { PrintButton } from "@/components/PrintButton";
import { money, monthLabel, firstOfMonth } from "@/lib/format";
import Link from "next/link";

export default async function PrintMonthlyBillsPage({ searchParams }: { searchParams: { month?: string } }) {
  const { org } = await getOrgContext();
  const month = searchParams.month || firstOfMonth();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const adjustments = await getAdjustmentsForMonth(org.id, month);
  const tenants = await getTenantsByFlatIds(adjustments.map((a) => a.flatId));
  const tenantByFlat = new Map(tenants.map((t) => [t.flatId, t]));

  const totals = adjustments.reduce(
    (acc, a) => {
      const breakdown = (a as any).billBreakdown ?? {};
      const overrides = (a as any).categoryOverrides ?? {};
      const electricity = overrides.electricity ?? breakdown.electricity ?? 0;
      const water = overrides.water ?? breakdown.water ?? 0;
      const gas = overrides.gas ?? breakdown.gas ?? 0;
      const other = overrides.other ?? breakdown.other ?? 0;
      const previousDue = parseFloat((a as any).previousOutstanding ?? "0");
      acc.rent += parseFloat(a.rentAmount);
      acc.electricity += electricity;
      acc.water += water;
      acc.gas += gas;
      acc.other += other;
      acc.adjustment += parseFloat(a.adjustmentAmount);
      acc.previousDue += previousDue;
      acc.payable += parseFloat(a.totalDue);
      acc.paid += parseFloat(a.totalPaid);
      acc.outstanding += Math.max(0, parseFloat(a.totalDue) - parseFloat(a.totalPaid));
      return acc;
    },
    { rent: 0, electricity: 0, water: 0, gas: 0, other: 0, adjustment: 0, previousDue: 0, payable: 0, paid: 0, outstanding: 0 }
  );

  return (
    <div className="mx-auto max-w-5xl py-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/bills" className="text-xs font-medium text-ink-600 hover:text-ink-900">
          ← Back to Monthly Bills
        </Link>
        <PrintButton label="Print / Save as PDF" />
      </div>

      <div className="card p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink-500">House Management</p>
        <h1 className="mt-1 text-center font-display text-xl font-semibold text-ink-950">
          {monthLabel(month, dLocale)} — Monthly Bill Report
        </h1>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-ink-900/15 text-left text-ink-600">
                <th className="py-2 pr-2 font-medium">Flat</th>
                <th className="py-2 pr-2 font-medium">Floor</th>
                <th className="py-2 pr-2 font-medium">Tenant</th>
                <th className="py-2 pr-2 text-right font-medium">Rent</th>
                <th className="py-2 pr-2 text-right font-medium">Elec.</th>
                <th className="py-2 pr-2 text-right font-medium">Water</th>
                <th className="py-2 pr-2 text-right font-medium">Gas</th>
                <th className="py-2 pr-2 text-right font-medium">Other</th>
                <th className="py-2 pr-2 text-right font-medium">Adj.</th>
                <th className="py-2 pr-2 text-right font-medium">Prev. Due</th>
                <th className="py-2 pr-2 text-right font-medium">Payable</th>
                <th className="py-2 pr-2 text-right font-medium">Paid</th>
                <th className="py-2 pr-2 text-right font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => {
                const tenant = tenantByFlat.get(a.flatId);
                const breakdown = (a as any).billBreakdown ?? {};
                const overrides = (a as any).categoryOverrides ?? {};
                const electricity = overrides.electricity ?? breakdown.electricity ?? 0;
                const water = overrides.water ?? breakdown.water ?? 0;
                const gas = overrides.gas ?? breakdown.gas ?? 0;
                const other = overrides.other ?? breakdown.other ?? 0;
                const previousDue = parseFloat((a as any).previousOutstanding ?? "0");
                const outstanding = Math.max(0, parseFloat(a.totalDue) - parseFloat(a.totalPaid));
                return (
                  <tr key={a.id} className="border-b border-ink-900/8">
                    <td className="py-1.5 pr-2 font-medium text-ink-900">{a.flatName}</td>
                    <td className="py-1.5 pr-2 text-ink-600">{a.floor}</td>
                    <td className="py-1.5 pr-2 text-ink-700">{tenant?.name ?? "Vacant"}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-ink-800">{money(a.rentAmount, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-ink-800">{money(electricity, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-ink-800">{money(water, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-ink-800">{money(gas, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-ink-800">{money(other, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-ink-800">{money(a.adjustmentAmount, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-clay-500">{money(previousDue, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right font-medium text-ink-900">{money(a.totalDue, org.currency)}</td>
                    <td className="tabular py-1.5 pr-2 text-right text-okay">{money(a.totalPaid, org.currency)}</td>
                    <td className={`tabular py-1.5 pr-2 text-right font-medium ${outstanding > 0 ? "text-clay-500" : "text-ink-600"}`}>
                      {money(outstanding, org.currency)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink-900/20 font-semibold text-ink-950">
                <td className="py-2 pr-2" colSpan={3}>
                  TOTAL
                </td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.rent, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.electricity, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.water, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.gas, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.other, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.adjustment, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right text-clay-500">{money(totals.previousDue, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right">{money(totals.payable, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right text-okay">{money(totals.paid, org.currency)}</td>
                <td className="tabular py-2 pr-2 text-right text-clay-500">{money(totals.outstanding, org.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {adjustments.length === 0 && <p className="py-10 text-center text-sm text-ink-600">No bills for this month yet.</p>}
      </div>
    </div>
  );
}

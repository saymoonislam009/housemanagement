import { getOrgContext, getTenant, getAdjustmentForFlatMonth } from "@/lib/queries";
import { PrintButton } from "@/components/PrintButton";
import { money, monthLabel, firstOfMonth, shortDate } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TenantStatementPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { month?: string };
}) {
  const { org } = await getOrgContext();
  const tenant = await getTenant(org.id, params.id);
  if (!tenant) notFound();
  const month = searchParams.month || firstOfMonth();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const bill = await getAdjustmentForFlatMonth(org.id, tenant.flatId, month);

  if (!bill) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-ink-600">No bill exists for {monthLabel(month, dLocale)} yet.</p>
        <Link href={`/tenants/${tenant.id}`} className="mt-3 inline-block text-sm text-brass-600 underline">
          Back to tenant
        </Link>
      </div>
    );
  }

  const breakdown = (bill as any).billBreakdown ?? {};
  const overrides = (bill as any).categoryOverrides ?? {};
  const line = (key: "electricity" | "water" | "gas" | "other" | "serviceCharge") => overrides[key] ?? breakdown[key] ?? 0;
  const previousDue = parseFloat((bill as any).previousOutstanding ?? "0");
  const currentCharges = parseFloat(bill.totalDue) - previousDue;
  const remaining = Math.max(0, parseFloat(bill.totalDue) - parseFloat(bill.totalPaid));

  const rows: [string, number][] = [
    ["Rent", parseFloat(bill.rentAmount)],
  ];
  if (line("serviceCharge") > 0) rows.push(["Service Charge", line("serviceCharge")]);
  rows.push(
    ["Electricity", line("electricity")],
    ["Water", line("water")],
    ["Gas", line("gas")],
    ["Other", line("other")]
  );
  if (parseFloat(bill.adjustmentAmount) !== 0) rows.push(["Adjustment", parseFloat(bill.adjustmentAmount)]);

  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/tenants/${tenant.id}`} className="text-xs font-medium text-ink-600 hover:text-ink-900">
          ← Back
        </Link>
        <PrintButton />
      </div>

      <div className="card p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink-500">House Management</p>
        <h1 className="mt-1 text-center font-display text-xl font-semibold text-ink-950">
          {monthLabel(month, dLocale)} Monthly Statement
        </h1>

        <div className="mt-6 flex justify-between text-sm">
          <div>
            <p className="text-ink-500">Flat</p>
            <p className="font-medium text-ink-900">
              {bill.propertyName} · {bill.flatName} ({bill.floor})
            </p>
          </div>
          <div className="text-right">
            <p className="text-ink-500">Tenant</p>
            <p className="font-medium text-ink-900">{tenant.name}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2 border-t border-ink-900/10 pt-4 text-sm">
          {rows.map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-ink-600">{label}</span>
              <span className="tabular text-ink-900">{money(val, org.currency)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-ink-900/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-600">Current Charges</span>
            <span className="tabular text-ink-900">{money(currentCharges, org.currency)}</span>
          </div>
          {previousDue > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-600">Previous Due</span>
              <span className="tabular text-clay-500">{money(previousDue, org.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span className="text-ink-900">Total Payable</span>
            <span className="tabular text-ink-950">{money(bill.totalDue, org.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Payment</span>
            <span className="tabular text-okay">-{money(bill.totalPaid, org.currency)}</span>
          </div>
        </div>

        <div className="mt-4 flex justify-between border-t border-ink-900/10 pt-4">
          <span className="font-display text-base font-semibold text-ink-950">Remaining Due</span>
          <span className="tabular font-display text-lg font-semibold text-clay-500">{money(remaining, org.currency)}</span>
        </div>

        <p className="mt-8 text-center text-[11px] text-ink-500">Generated {shortDate(new Date(), dLocale)}</p>
      </div>
    </div>
  );
}

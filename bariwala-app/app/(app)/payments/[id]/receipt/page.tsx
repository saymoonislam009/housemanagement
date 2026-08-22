import { getOrgContext } from "@/lib/queries";
import { assertOrgOwnsPayment } from "@/lib/actions/helpers";
import { db } from "@/db";
import { flats, properties, tenants, payments as paymentsTable } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import { PrintButton } from "@/components/PrintButton";
import { money, shortDate, monthLabel } from "@/lib/format";
import Link from "next/link";

const methodLabel: Record<string, string> = {
  cash: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  bank: "Bank transfer",
  other: "Other",
};

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const { org } = await getOrgContext();
  const payment = await assertOrgOwnsPayment(org.id, params.id);
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";

  const [flat, tenant] = await Promise.all([
    db.query.flats.findFirst({ where: eq(flats.id, payment.flatId) }),
    payment.tenantId ? db.query.tenants.findFirst({ where: eq(tenants.id, payment.tenantId) }) : Promise.resolve(null),
  ]);
  const property = flat ? await db.query.properties.findFirst({ where: eq(properties.id, flat.propertyId) }) : null;

  let previousDue = 0;
  let remaining = 0;
  const adj = payment.adjustmentId
    ? await db.query.monthlyAdjustments.findFirst({ where: (a, { eq }) => eq(a.id, payment.adjustmentId!) })
    : null;
  if (adj) {
    previousDue = parseFloat(adj.previousOutstanding);

    // "Remaining due" on a receipt must reflect the balance right after THIS payment,
    // not whatever the bill's live total-paid happens to be today (which includes
    // every payment ever made against it, including ones made later). Order payments
    // chronologically and sum everything up to and including this one.
    const allPaymentsForBill = await db.query.payments.findMany({
      where: eq(paymentsTable.adjustmentId, adj.id),
      orderBy: [asc(paymentsTable.paidOn), asc(paymentsTable.createdAt)],
    });
    let cumulativePaid = 0;
    for (const p of allPaymentsForBill) {
      cumulativePaid += parseFloat(p.amount);
      if (p.id === payment.id) break;
    }
    remaining = Math.max(0, parseFloat(adj.totalDue) - cumulativePaid);
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/payments" className="text-xs font-medium text-ink-600 hover:text-ink-900">
          ← Back
        </Link>
        <PrintButton label="Print receipt" />
      </div>

      <div className="card p-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-ink-500">House Management</p>
        <h1 className="mt-1 text-center font-display text-xl font-semibold text-ink-950">Payment Receipt</h1>

        <div className="mt-6 space-y-2 border-t border-ink-900/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-600">House</span>
            <span className="font-medium text-ink-900">{property?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Flat</span>
            <span className="font-medium text-ink-900">
              {flat?.name} ({flat?.floor})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Tenant</span>
            <span className="font-medium text-ink-900">{tenant?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Date</span>
            <span className="font-medium text-ink-900">{shortDate(payment.paidOn, dLocale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Method</span>
            <span className="font-medium text-ink-900">{methodLabel[payment.method] ?? payment.method}</span>
          </div>
          {payment.note && (
            <div className="flex justify-between">
              <span className="text-ink-600">Note</span>
              <span className="font-medium text-ink-900">{payment.note}</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 border-t border-ink-900/10 pt-4 text-sm">
          {previousDue > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-600">Previous Due</span>
              <span className="tabular text-clay-500">{money(previousDue, org.currency)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span className="text-ink-900">Amount Paid</span>
            <span className="tabular font-display text-lg text-okay">{money(payment.amount, org.currency)}</span>
          </div>
          {adj && (
            <div className="flex justify-between">
              <span className="text-ink-600">Remaining Due</span>
              <span className={`tabular font-medium ${remaining > 0 ? "text-clay-500" : "text-okay"}`}>
                {money(remaining, org.currency)}
              </span>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-[11px] text-ink-500">Generated {shortDate(new Date(), dLocale)}</p>
      </div>
    </div>
  );
}

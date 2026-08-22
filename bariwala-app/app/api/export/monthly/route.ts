import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAdjustmentsForMonth, getTenantsByFlatIds } from "@/lib/queries";
import { firstOfMonth, tenantAppliesToMonth } from "@/lib/format";

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month") || firstOfMonth();
  const adjustments = await getAdjustmentsForMonth(session.orgId, month);
  const tenants = await getTenantsByFlatIds(adjustments.map((a) => a.flatId));
  const tenantByFlat = new Map(tenants.map((t) => [t.flatId, t]));

  const header = [
    "Flat",
    "Floor",
    "Tenant",
    "Rent",
    "Service Charge",
    "Electricity",
    "Water",
    "Gas",
    "Other",
    "Adjustment",
    "Current Charges",
    "Previous Due",
    "Total Payable",
    "Paid",
    "Outstanding",
  ];

  const rows: (string | number)[][] = [];
  const totals = { rent: 0, serviceCharge: 0, electricity: 0, water: 0, gas: 0, other: 0, adjustment: 0, current: 0, previousDue: 0, payable: 0, paid: 0, outstanding: 0 };

  for (const a of adjustments) {
    const rawTenant = tenantByFlat.get(a.flatId);
    const tenant = rawTenant && tenantAppliesToMonth(rawTenant.moveInDate, month) ? rawTenant : undefined;
    const breakdown = (a as any).billBreakdown ?? {};
    const overrides = (a as any).categoryOverrides ?? {};
    const electricity = overrides.electricity ?? breakdown.electricity ?? 0;
    const water = overrides.water ?? breakdown.water ?? 0;
    const gas = overrides.gas ?? breakdown.gas ?? 0;
    const other = overrides.other ?? breakdown.other ?? 0;
    const serviceCharge = overrides.serviceCharge ?? breakdown.serviceCharge ?? 0;
    const rent = parseFloat(a.rentAmount);
    const adjustment = parseFloat(a.adjustmentAmount);
    const previousDue = parseFloat((a as any).previousOutstanding ?? "0");
    const payable = parseFloat(a.totalDue);
    const paid = parseFloat(a.totalPaid);
    const current = payable - previousDue;
    const outstanding = Math.max(0, payable - paid);

    rows.push([
      a.flatName,
      a.floor,
      tenant?.name ?? "Vacant",
      rent.toFixed(2),
      serviceCharge.toFixed?.(2) ?? serviceCharge,
      electricity.toFixed?.(2) ?? electricity,
      water.toFixed?.(2) ?? water,
      gas.toFixed?.(2) ?? gas,
      other.toFixed?.(2) ?? other,
      adjustment.toFixed(2),
      current.toFixed(2),
      previousDue.toFixed(2),
      payable.toFixed(2),
      paid.toFixed(2),
      outstanding.toFixed(2),
    ]);

    totals.rent += rent;
    totals.serviceCharge += serviceCharge;
    totals.electricity += electricity;
    totals.water += water;
    totals.gas += gas;
    totals.other += other;
    totals.adjustment += adjustment;
    totals.current += current;
    totals.previousDue += previousDue;
    totals.payable += payable;
    totals.paid += paid;
    totals.outstanding += outstanding;
  }

  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
    [
      "TOTAL",
      "",
      "",
      totals.rent.toFixed(2),
      totals.serviceCharge.toFixed(2),
      totals.electricity.toFixed(2),
      totals.water.toFixed(2),
      totals.gas.toFixed(2),
      totals.other.toFixed(2),
      totals.adjustment.toFixed(2),
      totals.current.toFixed(2),
      totals.previousDue.toFixed(2),
      totals.payable.toFixed(2),
      totals.paid.toFixed(2),
      totals.outstanding.toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  ];

  const csv = "\uFEFF" + lines.join("\r\n"); // BOM so Excel opens UTF-8 correctly (Bengali names etc.)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bills-${month}.csv"`,
    },
  });
}

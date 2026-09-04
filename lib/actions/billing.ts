"use server";

import { db } from "@/db";
import { flats, properties, meters, meterReadings, monthlyAdjustments, payments, notifications, tenants } from "@/db/schema";
import { and, eq, gt, lt, desc, asc } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, round2, assertOrgOwnsFlat, assertOrgOwnsAdjustment, assertOrgOwnsPayment } from "./helpers";
import { monthOffset, firstOfMonth, occupiedMonth } from "@/lib/format";
import { revalidatePath } from "next/cache";

type CategoryKey = "electricity" | "water" | "gas" | "other" | "serviceCharge";

function bucketFor(meterType: string): "electricity" | "water" | "gas" | "other" {
  // Pump and any other custom meter types roll into "other" for billing display
  // purposes (spec keeps the tenant-facing categories to electricity/water/gas/other).
  if (meterType === "electricity" || meterType === "water" || meterType === "gas") return meterType;
  return "other";
}

function computeStatus(totalDue: number, totalPaid: number): "unpaid" | "partial" | "paid" {
  if (totalPaid <= 0) return "unpaid";
  if (totalPaid >= totalDue) return "paid";
  return "partial";
}

// A month that hasn't started yet shouldn't get a real, persisted bill just because
// someone clicked the month-switcher's forward arrow to peek ahead — that produced
// confusing "phantom" bills for months that "hadn't arrived yet".
function isFutureMonth(month: string): boolean {
  return month > firstOfMonth();
}

// Which tenant (if any) actually lived in this flat during this specific month —
// this is what makes a flat's bill correctly show "Tenant A" for the months before
// they moved out and "Tenant B" for the months after B moved in, instead of always
// showing whoever the flat's tenant happens to be today.
async function getOccupyingTenant(flatId: string, month: string) {
  const allTenants = await db.query.tenants.findMany({ where: eq(tenants.flatId, flatId) });
  const candidates = allTenants.filter((t) => occupiedMonth(t.moveInDate, t.moveOutDate, month));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // More than one tenant's dates overlap this month (shouldn't normally happen) —
  // prefer whoever moved in most recently as the best guess.
  candidates.sort((a, b) => (b.moveInDate ?? "").localeCompare(a.moveInDate ?? ""));
  return candidates[0];
}

async function getSharedSplitShareForFlat(propertyId: string, flatId: string, month: string) {
  const sharedMeters = await db.query.meters.findMany({
    where: and(eq(meters.propertyId, propertyId), eq(meters.scope, "shared"), eq(meters.allocationMethod, "equal_split")),
  });
  if (sharedMeters.length === 0) return 0;

  const activeFlats = await db.query.flats.findMany({
    where: and(eq(flats.propertyId, propertyId), eq(flats.active, true)),
  });
  if (activeFlats.length === 0) return 0;
  if (!activeFlats.some((f) => f.id === flatId)) return 0;

  let total = 0;
  for (const m of sharedMeters) {
    const reading = await db.query.meterReadings.findFirst({
      where: and(eq(meterReadings.meterId, m.id), eq(meterReadings.month, month)),
    });
    if (reading) total += parseFloat(reading.amount);
  }
  return round2(total / activeFlats.length);
}

export async function recalcAllFlatsForSharedMeter(propertyId: string, month: string) {
  const activeFlats = await db.query.flats.findMany({
    where: and(eq(flats.propertyId, propertyId), eq(flats.active, true)),
  });
  await Promise.all(activeFlats.map((f) => recalcAdjustmentForFlatMonth(f.id, month)));
}

// Recalculates a flat's monthly bill. This is the single source of truth for
// monthly totals (spec #45) — every page reads from this, nothing recalculates
// the formula independently. Three things it gets right that are easy to get wrong:
//
// 1. TENANT PER MONTH — resolves who actually lived here *this* month (not just
//    the flat's current tenant), so a flat's history correctly shows "A" for Jan
//    and "B" for Feb when A moved out and B moved in between.
// 2. VACANT MONTHS ARE ZERO — no tenant that month means no rent, no bill, nothing
//    owed. A flat sitting empty doesn't generate a phantom debt.
// 3. DEBT FOLLOWS THE TENANT, NOT THE FLAT — a new tenant never inherits the
//    previous tenant's unpaid balance. Previous-outstanding only carries forward
//    when the same person occupied both this month and the most recent prior
//    month that has a bill (which may not be the literal previous month, if some
//    months were never visited/generated — we look back until we find one).
export async function recalcAdjustmentForFlatMonth(flatId: string, month: string) {
  const flat = await db.query.flats.findFirst({ where: eq(flats.id, flatId) });
  if (!flat) return null;

  const existing = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), eq(monthlyAdjustments.month, month)),
  });

  if (!existing && isFutureMonth(month)) return null;

  const occupyingTenant = await getOccupyingTenant(flatId, month);

  // Vacant this month: zero everything out, nothing owed, nothing carried forward.
  if (!occupyingTenant) {
    let resultId: string;
    if (existing) {
      await db
        .update(monthlyAdjustments)
        .set({
          tenantId: null,
          rentAmount: "0",
          billsAmount: "0",
          billBreakdown: {},
          previousOutstanding: "0",
          totalDue: "0",
          status: "paid",
          updatedAt: new Date(),
        })
        .where(eq(monthlyAdjustments.id, existing.id));
      resultId = existing.id;
    } else {
      const newId = id("adj");
      const propertyForOrg = await db.query.properties.findFirst({ where: eq(properties.id, flat.propertyId) });
      await db.insert(monthlyAdjustments).values({
        id: newId,
        orgId: propertyForOrg?.orgId ?? "",
        flatId,
        tenantId: null,
        month,
        rentAmount: "0",
        billsAmount: "0",
        billBreakdown: {},
        categoryOverrides: {},
        previousOutstanding: "0",
        adjustmentAmount: "0",
        totalDue: "0",
        totalPaid: "0",
        status: "paid",
      });
      resultId = newId;
    }
    await cascadeForward(flatId, month);
    return resultId;
  }

  const rows = await db
    .select({ amount: meterReadings.amount, type: meters.type })
    .from(meterReadings)
    .innerJoin(meters, eq(meterReadings.meterId, meters.id))
    .where(and(eq(meters.flatId, flatId), eq(meterReadings.month, month)));

  const computed: Record<"electricity" | "water" | "gas" | "other", number> = {
    electricity: 0,
    water: 0,
    gas: 0,
    other: 0,
  };
  for (const r of rows) {
    const bucket = bucketFor(r.type);
    computed[bucket] = round2(computed[bucket] + parseFloat(r.amount));
  }

  const sharedSplitAmount = await getSharedSplitShareForFlat(flat.propertyId, flatId, month);
  computed.other = round2(computed.other + sharedSplitAmount);

  const overrides = (existing?.categoryOverrides as Partial<Record<CategoryKey, number>>) ?? {};
  const final: Record<CategoryKey, number> = {
    electricity: overrides.electricity ?? computed.electricity,
    water: overrides.water ?? computed.water,
    gas: overrides.gas ?? computed.gas,
    other: overrides.other ?? computed.other,
    serviceCharge: overrides.serviceCharge ?? parseFloat(flat.serviceCharge),
  };
  const billsAmount = round2(final.electricity + final.water + final.gas + final.other + final.serviceCharge);
  const rentAmount = parseFloat(flat.rentAmount);
  const adjustmentAmount = existing ? parseFloat(existing.adjustmentAmount) : 0;
  const totalPaid = existing ? parseFloat(existing.totalPaid) : 0;

  // Look back for the most recent PRIOR bill for this flat, regardless of exact
  // adjacency (handles gaps where a month was never generated), then only carry
  // its balance forward if the same tenant occupied both.
  const prevAdjustment = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), lt(monthlyAdjustments.month, month)),
    orderBy: desc(monthlyAdjustments.month),
  });
  const sameTenantAsBefore = !!prevAdjustment && prevAdjustment.tenantId === occupyingTenant.id;
  const previousOutstanding = sameTenantAsBefore
    ? round2(Math.max(0, parseFloat(prevAdjustment!.totalDue) - parseFloat(prevAdjustment!.totalPaid)))
    : 0;

  const totalDue = round2(rentAmount + billsAmount + adjustmentAmount + previousOutstanding);
  const status = computeStatus(totalDue, totalPaid);

  let resultId: string;
  if (existing) {
    await db
      .update(monthlyAdjustments)
      .set({
        tenantId: occupyingTenant.id,
        rentAmount: String(rentAmount),
        billsAmount: String(billsAmount),
        billBreakdown: final,
        previousOutstanding: String(previousOutstanding),
        totalDue: String(totalDue),
        status,
        updatedAt: new Date(),
      })
      .where(eq(monthlyAdjustments.id, existing.id));
    resultId = existing.id;
  } else {
    const newId = id("adj");
    const propertyForOrg = await db.query.properties.findFirst({ where: eq(properties.id, flat.propertyId) });
    await db.insert(monthlyAdjustments).values({
      id: newId,
      orgId: propertyForOrg?.orgId ?? "",
      flatId,
      tenantId: occupyingTenant.id,
      month,
      rentAmount: String(rentAmount),
      billsAmount: String(billsAmount),
      billBreakdown: final,
      categoryOverrides: {},
      previousOutstanding: String(previousOutstanding),
      adjustmentAmount: "0",
      totalDue: String(totalDue),
      totalPaid: "0",
      status,
    });
    resultId = newId;
  }

  await cascadeForward(flatId, month);
  return resultId;
}

// Finds the nearest EXISTING later month for this flat (not necessarily exactly
// +1 — handles gaps) and recalculates it, which cascades further via its own
// call at the end. One call here refreshes the whole remaining chain.
async function cascadeForward(flatId: string, month: string) {
  const next = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), gt(monthlyAdjustments.month, month)),
    orderBy: asc(monthlyAdjustments.month),
  });
  if (next) {
    await recalcAdjustmentForFlatMonth(flatId, next.month);
  }
}

// Makes sure every active flat has a bill row for the given month.
export async function ensureAdjustmentsForMonth(orgId: string, month: string) {
  if (isFutureMonth(month)) return;

  const rows = await db
    .select({ id: flats.id, active: flats.active })
    .from(flats)
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(and(eq(properties.orgId, orgId), eq(flats.active, true)));

  await Promise.all(rows.map((flat) => recalcAdjustmentForFlatMonth(flat.id, month)));
}

// One-time (or run-whenever-needed) repair tool: refreshes every flat's entire
// bill history using today's calculation logic. Needed because past fixes to the
// billing formula only take effect on rows that get recalculated — a month you
// never revisited after a fix keeps its old, possibly-wrong numbers forever
// otherwise. Only the EARLIEST existing month per flat needs to be recalculated
// directly; recalcAdjustmentForFlatMonth cascades forward through every later
// month on its own.
export async function recalculateAllHistory() {
  const session = await requireOrg();
  const orgId = session.orgId;

  const flatRows = await db
    .select({ id: flats.id })
    .from(flats)
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(eq(properties.orgId, orgId));

  for (const flat of flatRows) {
    const earliest = await db.query.monthlyAdjustments.findFirst({
      where: eq(monthlyAdjustments.flatId, flat.id),
      orderBy: asc(monthlyAdjustments.month),
    });
    if (earliest) {
      await recalcAdjustmentForFlatMonth(flat.id, earliest.month);
    }
  }

  revalidatePath("/bills");
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");
}

export async function setCategoryOverride(adjustmentId: string, formData: FormData) {
  const session = await requireOrg();
  const adj = await assertOrgOwnsAdjustment(session.orgId, adjustmentId);
  const category = str(formData, "category") as CategoryKey;
  const rawValue = str(formData, "value");
  const overrides = { ...((adj.categoryOverrides as Record<string, number>) ?? {}) };

  if (rawValue === "") {
    delete overrides[category];
  } else {
    overrides[category] = round2(parseFloat(rawValue) || 0);
  }

  await db.update(monthlyAdjustments).set({ categoryOverrides: overrides }).where(eq(monthlyAdjustments.id, adjustmentId));
  await recalcAdjustmentForFlatMonth(adj.flatId, adj.month);
  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

export async function setManualAdjustment(adjustmentId: string, formData: FormData) {
  const session = await requireOrg();
  const existing = await assertOrgOwnsAdjustment(session.orgId, adjustmentId);
  const amount = num(formData, "adjustmentAmount", 0);
  const note = str(formData, "adjustmentNote");
  const totalDue = round2(
    parseFloat(existing.rentAmount) + parseFloat(existing.billsAmount) + amount + parseFloat(existing.previousOutstanding)
  );
  const status = computeStatus(totalDue, parseFloat(existing.totalPaid));
  await db
    .update(monthlyAdjustments)
    .set({ adjustmentAmount: String(amount), adjustmentNote: note || null, totalDue: String(totalDue), status, updatedAt: new Date() })
    .where(eq(monthlyAdjustments.id, adjustmentId));
  await cascadeForward(existing.flatId, existing.month);
  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

export async function recordPayment(formData: FormData) {
  const session = await requireOrg();
  const flatId = str(formData, "flatId");
  await assertOrgOwnsFlat(session.orgId, flatId);
  const tenantId = str(formData, "tenantId");
  const adjustmentId = str(formData, "adjustmentId");
  if (adjustmentId) await assertOrgOwnsAdjustment(session.orgId, adjustmentId);
  const amount = round2(num(formData, "amount", 0));
  const method = (str(formData, "method") || "cash") as any;
  const paidOn = str(formData, "paidOn");
  const note = str(formData, "note");
  if (!flatId || amount <= 0 || !paidOn) return;

  await db.insert(payments).values({
    id: id("pay"),
    orgId: session.orgId,
    flatId,
    tenantId: tenantId || null,
    adjustmentId: adjustmentId || null,
    amount: String(amount),
    method,
    paidOn,
    note: note || null,
  });

  if (adjustmentId) {
    const adj = await db.query.monthlyAdjustments.findFirst({ where: eq(monthlyAdjustments.id, adjustmentId) });
    if (adj) {
      const totalPaid = round2(parseFloat(adj.totalPaid) + amount);
      const status = computeStatus(parseFloat(adj.totalDue), totalPaid);
      await db
        .update(monthlyAdjustments)
        .set({ totalPaid: String(totalPaid), status, updatedAt: new Date() })
        .where(eq(monthlyAdjustments.id, adjustmentId));
      await cascadeForward(adj.flatId, adj.month);
    }
  }

  await db.insert(notifications).values({
    id: id("ntf"),
    orgId: session.orgId,
    title: "Payment recorded",
    body: `A payment of ${amount} was recorded.`,
    kind: "payment",
  });

  revalidatePath("/bills");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");
}

export async function updatePayment(paymentId: string, formData: FormData) {
  const session = await requireOrg();
  const payment = await assertOrgOwnsPayment(session.orgId, paymentId);
  const newAmount = round2(num(formData, "amount", 0));
  const method = (str(formData, "method") || "cash") as any;
  const paidOn = str(formData, "paidOn");
  const note = str(formData, "note");
  if (newAmount <= 0 || !paidOn) return;

  const oldAmount = parseFloat(payment.amount);

  await db
    .update(payments)
    .set({ amount: String(newAmount), method, paidOn, note: note || null })
    .where(eq(payments.id, paymentId));

  if (payment.adjustmentId) {
    const adj = await db.query.monthlyAdjustments.findFirst({ where: eq(monthlyAdjustments.id, payment.adjustmentId) });
    if (adj) {
      const totalPaid = round2(Math.max(0, parseFloat(adj.totalPaid) - oldAmount + newAmount));
      const status = computeStatus(parseFloat(adj.totalDue), totalPaid);
      await db
        .update(monthlyAdjustments)
        .set({ totalPaid: String(totalPaid), status, updatedAt: new Date() })
        .where(eq(monthlyAdjustments.id, adj.id));
      await cascadeForward(adj.flatId, adj.month);
    }
  }

  revalidatePath("/bills");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");
}

export async function deletePayment(paymentId: string) {
  const session = await requireOrg();
  const payment = await assertOrgOwnsPayment(session.orgId, paymentId);
  await db.delete(payments).where(eq(payments.id, paymentId));

  if (payment.adjustmentId) {
    const adj = await db.query.monthlyAdjustments.findFirst({ where: eq(monthlyAdjustments.id, payment.adjustmentId) });
    if (adj) {
      const totalPaid = round2(Math.max(0, parseFloat(adj.totalPaid) - parseFloat(payment.amount)));
      const status = computeStatus(parseFloat(adj.totalDue), totalPaid);
      await db
        .update(monthlyAdjustments)
        .set({ totalPaid: String(totalPaid), status, updatedAt: new Date() })
        .where(eq(monthlyAdjustments.id, adj.id));
      await cascadeForward(adj.flatId, adj.month);
    }
  }
  revalidatePath("/bills");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");
}

"use server";

import { db } from "@/db";
import { flats, properties, meters, meterReadings, monthlyAdjustments, payments, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, round2, assertOrgOwnsFlat, assertOrgOwnsAdjustment, assertOrgOwnsPayment } from "./helpers";
import { monthOffset, firstOfMonth } from "@/lib/format";
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

async function getSharedSplitShareForFlat(propertyId: string, flatId: string, month: string) {
  const sharedMeters = await db.query.meters.findMany({
    where: and(eq(meters.propertyId, propertyId), eq(meters.scope, "shared"), eq(meters.allocationMethod, "equal_split")),
  });
  if (sharedMeters.length === 0) return 0;

  const activeFlats = await db.query.flats.findMany({
    where: and(eq(flats.propertyId, propertyId), eq(flats.active, true)),
  });
  if (activeFlats.length === 0) return 0;
  // If the flat we're computing for isn't itself active, it gets no share.
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

// When a shared meter's reading changes, every active flat's share changes too —
// recalc them all, not just the one flat that happened to trigger the update.
export async function recalcAllFlatsForSharedMeter(propertyId: string, month: string) {
  const activeFlats = await db.query.flats.findMany({
    where: and(eq(flats.propertyId, propertyId), eq(flats.active, true)),
  });
  await Promise.all(activeFlats.map((f) => recalcAdjustmentForFlatMonth(f.id, month)));
}

// Recalculates a flat's monthly bill: pulls meter-computed totals per utility category,
// applies any manual category overrides the owner typed in directly, adds rent and
// the flat's recurring service charge, and keeps existing payments/manual adjustment
// untouched. This is the single source of truth for monthly totals (spec #45) —
// every page reads from this, nothing recalculates the formula independently.
//
// After saving, it also cascades forward: if a bill for the *next* month already
// exists, that month's "previous outstanding" depends on what we just recalculated
// here, so we recalc it too (which in turn cascades to the month after that, and so
// on) — otherwise editing an old month leaves every later month quietly stale.
export async function recalcAdjustmentForFlatMonth(flatId: string, month: string) {
  const flat = await db.query.flats.findFirst({ where: eq(flats.id, flatId) });
  if (!flat) return null;

  const existing = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), eq(monthlyAdjustments.month, month)),
  });

  // Don't manufacture a brand-new bill for a month that hasn't started — but if one
  // already exists (e.g. from before this guard existed), keep it in sync rather
  // than abandoning it.
  if (!existing && isFutureMonth(month)) return null;

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

  // Spec #17: shared meters (e.g. a water pump) set to "equal split" get divided across
  // every active flat in the same property and folded into that flat's "other" charge.
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

  // Spec #7: whatever the tenant still owed last month rolls into this month's total,
  // rather than quietly disappearing. This reads whatever the previous month's row
  // currently holds — which is exactly why cascading forward (below) matters: if the
  // previous month itself just changed, it must be recalculated *before* this read
  // happens, or this figure goes stale.
  const prevMonth = monthOffset(month, -1);
  const prevAdjustment = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), eq(monthlyAdjustments.month, prevMonth)),
  });
  const previousOutstanding = prevAdjustment
    ? round2(Math.max(0, parseFloat(prevAdjustment.totalDue) - parseFloat(prevAdjustment.totalPaid)))
    : 0;

  const totalDue = round2(rentAmount + billsAmount + adjustmentAmount + previousOutstanding);
  const status = computeStatus(totalDue, totalPaid);

  let resultId: string;
  if (existing) {
    await db
      .update(monthlyAdjustments)
      .set({
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
    const propertyForOrg = await db.query.properties.findFirst({
      where: eq(properties.id, flat.propertyId),
    });
    await db.insert(monthlyAdjustments).values({
      id: newId,
      orgId: propertyForOrg?.orgId ?? "",
      flatId,
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

  await cascadeToNextMonth(flatId, month);
  return resultId;
}

// If next month's bill already exists, its previousOutstanding depends on what we
// just computed here — recalculating it will in turn cascade to the month after
// that, and so on, so calling this once refreshes the whole remaining chain.
async function cascadeToNextMonth(flatId: string, month: string) {
  const nextMonth = monthOffset(month, 1);
  const nextExisting = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), eq(monthlyAdjustments.month, nextMonth)),
  });
  if (nextExisting) {
    await recalcAdjustmentForFlatMonth(flatId, nextMonth);
  }
}

// Makes sure every active flat has a bill row for the given month. Runs on every
// visit to Bills/Dashboard/History, so recalculating flats one-by-one added real,
// felt latency for houses with several flats — these are independent per-flat
// writes, so there's no race risk in running them concurrently.
export async function ensureAdjustmentsForMonth(orgId: string, month: string) {
  if (isFutureMonth(month)) return; // nothing to generate for a month that hasn't arrived yet

  const rows = await db
    .select({ id: flats.id, active: flats.active })
    .from(flats)
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(and(eq(properties.orgId, orgId), eq(flats.active, true)));

  await Promise.all(rows.map((flat) => recalcAdjustmentForFlatMonth(flat.id, month)));
}

// Owner types in (or overrides) one utility category directly — e.g. no gas meter
// exists, but the owner knows the gas bill was ৳300 this month (spec #11, #13, #41).
export async function setCategoryOverride(adjustmentId: string, formData: FormData) {
  const session = await requireOrg();
  const adj = await assertOrgOwnsAdjustment(session.orgId, adjustmentId);
  const category = str(formData, "category") as CategoryKey;
  const rawValue = str(formData, "value");
  const overrides = { ...((adj.categoryOverrides as Record<string, number>) ?? {}) };

  if (rawValue === "") {
    delete overrides[category]; // clearing the override falls back to meter-computed value
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
  await cascadeToNextMonth(existing.flatId, existing.month);
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
      await cascadeToNextMonth(adj.flatId, adj.month);
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

// Editing or deleting a payment must ripple through to the adjustment's paid/remaining/
// status, the tenant's history, and the dashboard — never leave stale totals (spec #22).
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
      await cascadeToNextMonth(adj.flatId, adj.month);
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
      await cascadeToNextMonth(adj.flatId, adj.month);
    }
  }
  revalidatePath("/bills");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/tenants");
}

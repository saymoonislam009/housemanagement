"use server";

import { db } from "@/db";
import { flats, properties, meters, meterReadings, monthlyAdjustments, payments, notifications } from "@/db/schema";
import { and, eq, sql as dsql } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num } from "./helpers";
import { revalidatePath } from "next/cache";

function computeStatus(totalDue: number, totalPaid: number): "unpaid" | "partial" | "paid" {
  if (totalPaid <= 0) return "unpaid";
  if (totalPaid >= totalDue) return "paid";
  return "partial";
}

// Recalculates bills total (from flat-scoped meter readings) + rent for a flat/month,
// creating the adjustment row if it doesn't exist yet, without disturbing recorded payments.
export async function recalcAdjustmentForFlatMonth(flatId: string, month: string) {
  const flat = await db.query.flats.findFirst({ where: eq(flats.id, flatId) });
  if (!flat) return null;

  const rows = await db
    .select({ amount: meterReadings.amount })
    .from(meterReadings)
    .innerJoin(meters, eq(meterReadings.meterId, meters.id))
    .where(and(eq(meters.flatId, flatId), eq(meterReadings.month, month)));

  const billsAmount = rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const rentAmount = parseFloat(flat.rentAmount);

  const existing = await db.query.monthlyAdjustments.findFirst({
    where: and(eq(monthlyAdjustments.flatId, flatId), eq(monthlyAdjustments.month, month)),
  });

  const adjustmentAmount = existing ? parseFloat(existing.adjustmentAmount) : 0;
  const totalPaid = existing ? parseFloat(existing.totalPaid) : 0;
  const totalDue = rentAmount + billsAmount + adjustmentAmount;
  const status = computeStatus(totalDue, totalPaid);

  if (existing) {
    await db
      .update(monthlyAdjustments)
      .set({
        rentAmount: String(rentAmount),
        billsAmount: String(billsAmount),
        totalDue: String(totalDue),
        status,
        updatedAt: new Date(),
      })
      .where(eq(monthlyAdjustments.id, existing.id));
    return existing.id;
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
      adjustmentAmount: "0",
      totalDue: String(totalDue),
      totalPaid: "0",
      status,
    });
    return newId;
  }
}

// Makes sure every active flat has an adjustment row for the given month (rent-only if no bills yet).
export async function ensureAdjustmentsForMonth(orgId: string, month: string) {
  const rows = await db
    .select({ id: flats.id, active: flats.active })
    .from(flats)
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(and(eq(properties.orgId, orgId), eq(flats.active, true)));

  for (const flat of rows) {
    await recalcAdjustmentForFlatMonth(flat.id, month);
  }
}

export async function setManualAdjustment(adjustmentId: string, formData: FormData) {
  await requireOrg();
  const amount = num(formData, "adjustmentAmount", 0);
  const note = str(formData, "adjustmentNote");
  const existing = await db.query.monthlyAdjustments.findFirst({ where: eq(monthlyAdjustments.id, adjustmentId) });
  if (!existing) return;
  const totalDue = parseFloat(existing.rentAmount) + parseFloat(existing.billsAmount) + amount;
  const status = computeStatus(totalDue, parseFloat(existing.totalPaid));
  await db
    .update(monthlyAdjustments)
    .set({ adjustmentAmount: String(amount), adjustmentNote: note || null, totalDue: String(totalDue), status, updatedAt: new Date() })
    .where(eq(monthlyAdjustments.id, adjustmentId));
  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

export async function recordPayment(formData: FormData) {
  const session = await requireOrg();
  const flatId = str(formData, "flatId");
  const tenantId = str(formData, "tenantId");
  const adjustmentId = str(formData, "adjustmentId");
  const amount = num(formData, "amount", 0);
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
      const totalPaid = parseFloat(adj.totalPaid) + amount;
      const status = computeStatus(parseFloat(adj.totalDue), totalPaid);
      await db
        .update(monthlyAdjustments)
        .set({ totalPaid: String(totalPaid), status, updatedAt: new Date() })
        .where(eq(monthlyAdjustments.id, adjustmentId));
    }
  }

  await db.insert(notifications).values({
    id: id("ntf"),
    orgId: session.orgId,
    title: "Payment recorded",
    body: `Payment of ${amount} recorded.`,
    kind: "payment",
  });

  revalidatePath("/bills");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

export async function deletePayment(paymentId: string) {
  await requireOrg();
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment) return;
  await db.delete(payments).where(eq(payments.id, paymentId));

  if (payment.adjustmentId) {
    const adj = await db.query.monthlyAdjustments.findFirst({ where: eq(monthlyAdjustments.id, payment.adjustmentId) });
    if (adj) {
      const totalPaid = Math.max(0, parseFloat(adj.totalPaid) - parseFloat(payment.amount));
      const status = computeStatus(parseFloat(adj.totalDue), totalPaid);
      await db
        .update(monthlyAdjustments)
        .set({ totalPaid: String(totalPaid), status, updatedAt: new Date() })
        .where(eq(monthlyAdjustments.id, adj.id));
    }
  }
  revalidatePath("/bills");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

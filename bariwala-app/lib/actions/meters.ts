"use server";

import { db } from "@/db";
import { meters, meterReadings } from "@/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, round2, assertOrgOwnsProperty, assertOrgOwnsMeter } from "./helpers";
import { revalidatePath } from "next/cache";
import { recalcAdjustmentForFlatMonth, recalcAllFlatsForSharedMeter } from "./billing";

export type MeterActionState = { error?: string } | null;

export async function createMeter(_prev: MeterActionState, formData: FormData): Promise<MeterActionState> {
  try {
    const session = await requireOrg();
    const propertyId = str(formData, "propertyId");
    if (!propertyId) return { error: "Please choose a house." };
    await assertOrgOwnsProperty(session.orgId, propertyId);
    const flatId = str(formData, "flatId");
    const scope = flatId ? "flat" : "shared";
    const allocationMethod = (str(formData, "allocationMethod") || "owner_expense") as any;
    const type = (str(formData, "type") || "electricity") as any;
    const label = str(formData, "label");
    if (!label) return { error: "Meter name is required." };
    const unitRate = num(formData, "unitRate", 0);
    if (unitRate < 0) return { error: "Rate per unit can't be negative." };
    const meterCharge = num(formData, "meterCharge", 0);
    if (meterCharge < 0) return { error: "Meter charge can't be negative." };
    const otherCharge = num(formData, "otherCharge", 0);
    if (otherCharge < 0) return { error: "Other charge can't be negative." };
    const startingReading = num(formData, "startingReading", 0);
    if (startingReading < 0) return { error: "Starting reading can't be negative." };

    await db.insert(meters).values({
      id: id("mtr"),
      orgId: session.orgId,
      propertyId,
      flatId: flatId || null,
      scope,
      allocationMethod: scope === "shared" ? allocationMethod : "owner_expense",
      type,
      label,
      unitRate: String(unitRate),
      meterCharge: String(meterCharge),
      otherCharge: String(otherCharge),
      startingReading: String(startingReading),
    });
    revalidatePath("/meters");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving this meter. Please try again." };
  }
}

export async function updateMeter(
  meterId: string,
  _prev: MeterActionState,
  formData: FormData
): Promise<MeterActionState> {
  try {
    const session = await requireOrg();
    const meter = await assertOrgOwnsMeter(session.orgId, meterId);
    const label = str(formData, "label");
    if (!label) return { error: "Meter name is required." };
    const type = (str(formData, "type") || "electricity") as any;
    const unitRate = num(formData, "unitRate", 0);
    if (unitRate < 0) return { error: "Rate per unit can't be negative." };
    const meterCharge = num(formData, "meterCharge", 0);
    if (meterCharge < 0) return { error: "Meter charge can't be negative." };
    const otherCharge = num(formData, "otherCharge", 0);
    if (otherCharge < 0) return { error: "Other charge can't be negative." };
    const allocationMethod = (str(formData, "allocationMethod") || meter.allocationMethod) as any;
    const active = formData.get("active") === "on";

    await db
      .update(meters)
      .set({
        label,
        type,
        unitRate: String(unitRate),
        meterCharge: String(meterCharge),
        otherCharge: String(otherCharge),
        allocationMethod: meter.scope === "shared" ? allocationMethod : meter.allocationMethod,
        active,
      })
      .where(eq(meters.id, meterId));

    // Allocation method controls how much of a shared meter's cost lands on tenant
    // bills — if the owner just changed it, every flat in the property needs a
    // fresh recalc for the months affected. We only have readings to look at, so
    // recalc whichever months this meter actually has data for.
    if (meter.scope === "shared" && allocationMethod !== meter.allocationMethod) {
      const readings = await db.query.meterReadings.findMany({ where: eq(meterReadings.meterId, meterId) });
      const months = Array.from(new Set(readings.map((r) => r.month)));
      for (const month of months) {
        await recalcAllFlatsForSharedMeter(meter.propertyId, month);
      }
    }
    revalidatePath("/meters");
    revalidatePath("/bills");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving these changes. Please try again." };
  }
}

export async function deleteMeter(meterId: string) {
  const session = await requireOrg();
  await assertOrgOwnsMeter(session.orgId, meterId);
  await db.delete(meters).where(eq(meters.id, meterId));
  revalidatePath("/meters");
}

async function getPreviousReading(meterId: string, month: string, startingReading: string) {
  const prior = await db
    .select()
    .from(meterReadings)
    .where(and(eq(meterReadings.meterId, meterId), lt(meterReadings.month, month)))
    .orderBy(desc(meterReadings.month))
    .limit(1);
  if (prior.length) return parseFloat(prior[0].currentReading);
  return parseFloat(startingReading);
}

export async function recordReading(_prev: MeterActionState, formData: FormData): Promise<MeterActionState> {
  try {
    const session = await requireOrg();
    const meterId = str(formData, "meterId");
    const meter = await assertOrgOwnsMeter(session.orgId, meterId);

    const month = str(formData, "month");
    if (!month) return { error: "Please select which month this reading is for." };
    const currentReading = num(formData, "currentReading", NaN);
    if (Number.isNaN(currentReading)) return { error: "Please enter the current reading." };
    if (currentReading < 0) return { error: "Reading can't be negative." };

    const meterChargeOverride = formData.get("meterCharge");
    const otherChargeOverride = formData.get("otherCharge");
    const notes = str(formData, "notes");

    const previousReading = await getPreviousReading(meterId, month, meter.startingReading);

    // A current reading lower than the previous one is almost always a typo or a
    // meter reset — silently clamping this to zero units would hide a real mistake
    // and quietly under-bill the tenant.
    if (currentReading < previousReading) {
      return {
        error: `The current reading (${currentReading}) is lower than the previous reading (${previousReading}). If the meter was reset or replaced, edit the meter and update its starting reading instead.`,
      };
    }

    const unitsUsed = round2(currentReading - previousReading);
    const meterCharge = meterChargeOverride !== null ? num(formData, "meterCharge", 0) : parseFloat(meter.meterCharge);
    if (meterCharge < 0) return { error: "Meter charge can't be negative." };
    const otherCharge = otherChargeOverride !== null ? num(formData, "otherCharge", 0) : parseFloat(meter.otherCharge);
    if (otherCharge < 0) return { error: "Other charge can't be negative." };
    const unitRate = parseFloat(meter.unitRate);
    const amount = round2(unitsUsed * unitRate + meterCharge + otherCharge);

    const existing = await db.query.meterReadings.findFirst({
      where: and(eq(meterReadings.meterId, meterId), eq(meterReadings.month, month)),
    });

    if (existing) {
      await db
        .update(meterReadings)
        .set({
          previousReading: String(previousReading),
          currentReading: String(currentReading),
          unitsUsed: String(unitsUsed),
          meterCharge: String(meterCharge),
          otherCharge: String(otherCharge),
          unitRate: String(unitRate),
          amount: String(amount),
          notes: notes || null,
        })
        .where(eq(meterReadings.id, existing.id));
    } else {
      await db.insert(meterReadings).values({
        id: id("read"),
        meterId,
        month,
        previousReading: String(previousReading),
        currentReading: String(currentReading),
        unitsUsed: String(unitsUsed),
        meterCharge: String(meterCharge),
        otherCharge: String(otherCharge),
        unitRate: String(unitRate),
        amount: String(amount),
        notes: notes || null,
      });
    }

    if (meter.scope === "flat" && meter.flatId) {
      await recalcAdjustmentForFlatMonth(meter.flatId, month);
    } else if (meter.scope === "shared" && meter.allocationMethod === "equal_split") {
      await recalcAllFlatsForSharedMeter(meter.propertyId, month);
    }

    revalidatePath("/meters");
    revalidatePath("/bills");
    revalidatePath("/dashboard");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving this reading. Please try again." };
  }
}

export async function deleteReading(readingId: string, meterId: string, month: string) {
  const session = await requireOrg();
  const meter = await assertOrgOwnsMeter(session.orgId, meterId);
  await db.delete(meterReadings).where(eq(meterReadings.id, readingId));
  if (meter.scope === "flat" && meter.flatId) {
    await recalcAdjustmentForFlatMonth(meter.flatId, month);
  } else if (meter.scope === "shared" && meter.allocationMethod === "equal_split") {
    await recalcAllFlatsForSharedMeter(meter.propertyId, month);
  }
  revalidatePath("/meters");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

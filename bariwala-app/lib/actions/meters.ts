"use server";

import { db } from "@/db";
import { meters, meterReadings } from "@/db/schema";
import { and, desc, eq, lt } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num } from "./helpers";
import { revalidatePath } from "next/cache";
import { recalcAdjustmentForFlatMonth } from "./billing";

export async function createMeter(formData: FormData) {
  const session = await requireOrg();
  const propertyId = str(formData, "propertyId");
  const flatId = str(formData, "flatId");
  const scope = flatId ? "flat" : "shared";
  const type = (str(formData, "type") || "electricity") as any;
  const label = str(formData, "label");
  const unitRate = num(formData, "unitRate", 0);
  const meterCharge = num(formData, "meterCharge", 0);
  const otherCharge = num(formData, "otherCharge", 0);
  const startingReading = num(formData, "startingReading", 0);
  if (!propertyId || !label) return;

  await db.insert(meters).values({
    id: id("mtr"),
    orgId: session.orgId,
    propertyId,
    flatId: flatId || null,
    scope,
    type,
    label,
    unitRate: String(unitRate),
    meterCharge: String(meterCharge),
    otherCharge: String(otherCharge),
    startingReading: String(startingReading),
  });
  revalidatePath("/meters");
}

export async function updateMeter(meterId: string, formData: FormData) {
  await requireOrg();
  const label = str(formData, "label");
  const type = (str(formData, "type") || "electricity") as any;
  const unitRate = num(formData, "unitRate", 0);
  const meterCharge = num(formData, "meterCharge", 0);
  const otherCharge = num(formData, "otherCharge", 0);
  const active = formData.get("active") === "on";
  await db
    .update(meters)
    .set({
      label,
      type,
      unitRate: String(unitRate),
      meterCharge: String(meterCharge),
      otherCharge: String(otherCharge),
      active,
    })
    .where(eq(meters.id, meterId));
  revalidatePath("/meters");
}

export async function deleteMeter(meterId: string) {
  await requireOrg();
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

export async function recordReading(formData: FormData) {
  await requireOrg();
  const meterId = str(formData, "meterId");
  const month = str(formData, "month");
  const currentReading = num(formData, "currentReading", 0);
  const meterChargeOverride = formData.get("meterCharge");
  const otherChargeOverride = formData.get("otherCharge");
  const notes = str(formData, "notes");

  const meter = await db.query.meters.findFirst({ where: eq(meters.id, meterId) });
  if (!meter) return;

  const previousReading = await getPreviousReading(meterId, month, meter.startingReading);
  const unitsUsed = Math.max(0, currentReading - previousReading);
  const meterCharge = meterChargeOverride !== null ? num(formData, "meterCharge", 0) : parseFloat(meter.meterCharge);
  const otherCharge = otherChargeOverride !== null ? num(formData, "otherCharge", 0) : parseFloat(meter.otherCharge);
  const unitRate = parseFloat(meter.unitRate);
  const amount = unitsUsed * unitRate + meterCharge + otherCharge;

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
  }

  revalidatePath("/meters");
  revalidatePath("/bills");
  revalidatePath("/dashboard");
}

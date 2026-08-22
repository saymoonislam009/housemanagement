"use server";

import { db } from "@/db";
import { properties, flats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, assertOrgOwnsProperty, assertOrgOwnsFlat } from "./helpers";
import { recalcAdjustmentForFlatMonth } from "./billing";
import { firstOfMonth } from "@/lib/format";
import { revalidatePath } from "next/cache";

export async function createProperty(formData: FormData) {
  const session = await requireOrg();
  const name = str(formData, "name");
  const address = str(formData, "address");
  if (!name) return;
  await db.insert(properties).values({ id: id("prop"), orgId: session.orgId, name, address });
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const session = await requireOrg();
  await assertOrgOwnsProperty(session.orgId, propertyId);
  const name = str(formData, "name");
  const address = str(formData, "address");
  await db.update(properties).set({ name, address }).where(eq(properties.id, propertyId));
  revalidatePath("/properties");
}

export async function deleteProperty(propertyId: string) {
  const session = await requireOrg();
  await assertOrgOwnsProperty(session.orgId, propertyId);
  await db.delete(properties).where(eq(properties.id, propertyId));
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export async function createFlat(propertyId: string, formData: FormData) {
  const session = await requireOrg();
  await assertOrgOwnsProperty(session.orgId, propertyId);
  const name = str(formData, "name");
  const floor = str(formData, "floor");
  const rentAmount = num(formData, "rentAmount", 0);
  const serviceCharge = num(formData, "serviceCharge", 0);
  if (!name) return;
  await db.insert(flats).values({
    id: id("flat"),
    propertyId,
    name,
    floor,
    rentAmount: String(rentAmount),
    serviceCharge: String(serviceCharge),
  });
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export async function updateFlat(flatId: string, propertyId: string, formData: FormData) {
  const session = await requireOrg();
  await assertOrgOwnsFlat(session.orgId, flatId);
  const name = str(formData, "name");
  const floor = str(formData, "floor");
  const rentAmount = num(formData, "rentAmount", 0);
  const serviceCharge = num(formData, "serviceCharge", 0);
  const active = formData.get("active") === "on";
  await db
    .update(flats)
    .set({ name, floor, rentAmount: String(rentAmount), serviceCharge: String(serviceCharge), active })
    .where(eq(flats.id, flatId));
  // Rent/service charge feed directly into the current month's bill total — keep it
  // in sync immediately rather than waiting for the next unrelated recalc.
  await recalcAdjustmentForFlatMonth(flatId, firstOfMonth());
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/bills");
}

export async function deleteFlat(flatId: string, propertyId: string) {
  const session = await requireOrg();
  await assertOrgOwnsFlat(session.orgId, flatId);
  await db.delete(flats).where(eq(flats.id, flatId));
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

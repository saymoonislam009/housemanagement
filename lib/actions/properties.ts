"use server";

import { db } from "@/db";
import { properties, flats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, assertOrgOwnsProperty, assertOrgOwnsFlat } from "./helpers";
import { recalcAdjustmentForFlatMonth } from "./billing";
import { firstOfMonth } from "@/lib/format";
import { revalidatePath } from "next/cache";

export type PropertyActionState = { error?: string } | null;

export async function createProperty(_prev: PropertyActionState, formData: FormData): Promise<PropertyActionState> {
  try {
    const session = await requireOrg();
    const name = str(formData, "name");
    if (!name) return { error: "House name is required." };
    const address = str(formData, "address");
    await db.insert(properties).values({ id: id("prop"), orgId: session.orgId, name, address });
    revalidatePath("/properties");
    revalidatePath("/dashboard");
    return null;
  } catch {
    return { error: "Something went wrong saving this house. Please try again." };
  }
}

export async function updateProperty(
  propertyId: string,
  _prev: PropertyActionState,
  formData: FormData
): Promise<PropertyActionState> {
  try {
    const session = await requireOrg();
    await assertOrgOwnsProperty(session.orgId, propertyId);
    const name = str(formData, "name");
    if (!name) return { error: "House name is required." };
    const address = str(formData, "address");
    await db.update(properties).set({ name, address }).where(eq(properties.id, propertyId));
    revalidatePath("/properties");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving these changes. Please try again." };
  }
}

export async function deleteProperty(propertyId: string) {
  const session = await requireOrg();
  await assertOrgOwnsProperty(session.orgId, propertyId);
  await db.delete(properties).where(eq(properties.id, propertyId));
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export type FlatActionState = { error?: string } | null;

export async function createFlat(
  propertyId: string,
  _prev: FlatActionState,
  formData: FormData
): Promise<FlatActionState> {
  try {
    const session = await requireOrg();
    await assertOrgOwnsProperty(session.orgId, propertyId);
    const name = str(formData, "name");
    if (!name) return { error: "Flat name is required." };
    const floor = str(formData, "floor");
    if (!floor) return { error: "Floor is required." };
    const rentAmount = num(formData, "rentAmount", 0);
    if (rentAmount < 0) return { error: "Rent can't be negative." };
    const serviceCharge = num(formData, "serviceCharge", 0);
    if (serviceCharge < 0) return { error: "Service charge can't be negative." };

    // Duplicate flat names in the same house are almost always a mistake (owner
    // meant to edit the existing one, not create a second "3A").
    const existing = await db.query.flats.findFirst({
      where: (f, { and, eq }) => and(eq(f.propertyId, propertyId), eq(f.name, name)),
    });
    if (existing) return { error: `A flat named "${name}" already exists in this house.` };

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
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving this flat. Please try again." };
  }
}

export async function updateFlat(
  flatId: string,
  propertyId: string,
  _prev: FlatActionState,
  formData: FormData
): Promise<FlatActionState> {
  try {
    const session = await requireOrg();
    await assertOrgOwnsFlat(session.orgId, flatId);
    const name = str(formData, "name");
    if (!name) return { error: "Flat name is required." };
    const floor = str(formData, "floor");
    if (!floor) return { error: "Floor is required." };
    const rentAmount = num(formData, "rentAmount", 0);
    if (rentAmount < 0) return { error: "Rent can't be negative." };
    const serviceCharge = num(formData, "serviceCharge", 0);
    if (serviceCharge < 0) return { error: "Service charge can't be negative." };
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
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving these changes. Please try again." };
  }
}

export async function deleteFlat(flatId: string, propertyId: string) {
  const session = await requireOrg();
  await assertOrgOwnsFlat(session.orgId, flatId);
  await db.delete(flats).where(eq(flats.id, flatId));
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

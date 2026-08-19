"use server";

import { db } from "@/db";
import { properties, flats, tenants, meters } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num } from "./helpers";
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
  const name = str(formData, "name");
  const address = str(formData, "address");
  await db
    .update(properties)
    .set({ name, address })
    .where(and(eq(properties.id, propertyId), eq(properties.orgId, session.orgId)));
  revalidatePath("/properties");
}

export async function deleteProperty(propertyId: string) {
  const session = await requireOrg();
  await db
    .delete(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.orgId, session.orgId)));
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export async function createFlat(propertyId: string, formData: FormData) {
  await requireOrg();
  const name = str(formData, "name");
  const floor = str(formData, "floor");
  const rentAmount = num(formData, "rentAmount", 0);
  if (!name) return;
  await db.insert(flats).values({
    id: id("flat"),
    propertyId,
    name,
    floor,
    rentAmount: String(rentAmount),
  });
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

export async function updateFlat(flatId: string, propertyId: string, formData: FormData) {
  await requireOrg();
  const name = str(formData, "name");
  const floor = str(formData, "floor");
  const rentAmount = num(formData, "rentAmount", 0);
  const active = formData.get("active") === "on";
  await db
    .update(flats)
    .set({ name, floor, rentAmount: String(rentAmount), active })
    .where(eq(flats.id, flatId));
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
}

export async function deleteFlat(flatId: string, propertyId: string) {
  await requireOrg();
  await db.delete(flats).where(eq(flats.id, flatId));
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
}

"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str } from "./helpers";
import { revalidatePath } from "next/cache";

export async function createTenant(formData: FormData) {
  await requireOrg();
  const flatId = str(formData, "flatId");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const nid = str(formData, "nid");
  const moveInDate = str(formData, "moveInDate");
  if (!flatId || !name) return;
  await db.insert(tenants).values({
    id: id("ten"),
    flatId,
    name,
    phone: phone || null,
    email: email || null,
    nid: nid || null,
    moveInDate: moveInDate || null,
  });
  revalidatePath("/tenants");
  revalidatePath("/dashboard");
}

export async function updateTenant(tenantId: string, formData: FormData) {
  await requireOrg();
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const nid = str(formData, "nid");
  const moveInDate = str(formData, "moveInDate");
  const notes = str(formData, "notes");
  const active = formData.get("active") === "on";
  await db
    .update(tenants)
    .set({
      name,
      phone: phone || null,
      email: email || null,
      nid: nid || null,
      moveInDate: moveInDate || null,
      notes: notes || null,
      active,
    })
    .where(eq(tenants.id, tenantId));
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${tenantId}`);
}

export async function deleteTenant(tenantId: string) {
  await requireOrg();
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  revalidatePath("/tenants");
  revalidatePath("/dashboard");
}

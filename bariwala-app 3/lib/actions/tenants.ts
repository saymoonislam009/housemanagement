"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, assertOrgOwnsFlat, assertOrgOwnsTenant } from "./helpers";
import { revalidatePath } from "next/cache";

export async function createTenant(formData: FormData) {
  const session = await requireOrg();
  const flatId = str(formData, "flatId");
  await assertOrgOwnsFlat(session.orgId, flatId);
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
  const session = await requireOrg();
  await assertOrgOwnsTenant(session.orgId, tenantId);
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
  revalidatePath("/dashboard");
}

// Spec #8: prefer "mark as moved out" over destroying a tenant that has billing
// history, so past bills/payments still make sense to look back on. This just
// flips the tenant inactive rather than deleting anything.
export async function markTenantMovedOut(tenantId: string) {
  const session = await requireOrg();
  await assertOrgOwnsTenant(session.orgId, tenantId);
  await db.update(tenants).set({ active: false }).where(eq(tenants.id, tenantId));
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/dashboard");
}

// True permanent delete — only for genuine mistakes (spec #35). Cascades to
// this tenant's own row only; flat/bill/payment history is tied to the flat,
// not the tenant record, so it is preserved either way.
export async function deleteTenant(tenantId: string) {
  const session = await requireOrg();
  await assertOrgOwnsTenant(session.orgId, tenantId);
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  revalidatePath("/tenants");
  revalidatePath("/dashboard");
}

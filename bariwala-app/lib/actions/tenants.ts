"use server";

import { db } from "@/db";
import { tenants, flats, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, assertOrgOwnsFlat, assertOrgOwnsTenant } from "./helpers";
import { revalidatePath } from "next/cache";

export type CreateTenantState = { error?: string } | null;

export async function createTenant(_prev: CreateTenantState, formData: FormData): Promise<CreateTenantState> {
  const session = await requireOrg();
  const flatId = str(formData, "flatId");
  if (!flatId) return { error: "Please choose a flat." };
  await assertOrgOwnsFlat(session.orgId, flatId);

  const name = str(formData, "name");
  if (!name) return { error: "Tenant name is required." };

  // A flat can only have one active tenant at a time — silently allowing a second
  // one would make it ambiguous whose bill/payment is whose.
  const existingActive = await db.query.tenants.findFirst({
    where: and(eq(tenants.flatId, flatId), eq(tenants.active, true)),
  });
  if (existingActive) {
    return { error: `This flat already has a tenant (${existingActive.name}). Mark them as moved out first, from the tenant's page.` };
  }

  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const nid = str(formData, "nid");
  const moveInDate = str(formData, "moveInDate");
  await db.insert(tenants).values({
    id: id("ten"),
    flatId,
    name,
    phone: phone || null,
    email: email || null,
    nid: nid || null,
    moveInDate: moveInDate || null,
  });

  const flat = await db.query.flats.findFirst({ where: eq(flats.id, flatId) });
  await db.insert(notifications).values({
    id: id("ntf"),
    orgId: session.orgId,
    title: "New tenant added",
    body: flat ? `${name} added to ${flat.name}` : `${name} added`,
    kind: "info",
  });

  revalidatePath("/tenants");
  revalidatePath("/dashboard");
  revalidatePath("/properties");
  return null;
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
  const tenant = await assertOrgOwnsTenant(session.orgId, tenantId);
  await db.update(tenants).set({ active: false }).where(eq(tenants.id, tenantId));
  await db.insert(notifications).values({
    id: id("ntf"),
    orgId: session.orgId,
    title: "Tenant moved out",
    body: `${tenant.name} marked as moved out — the flat is now vacant`,
    kind: "info",
  });
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

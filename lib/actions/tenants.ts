"use server";

import { db } from "@/db";
import { tenants, flats, monthlyAdjustments, notifications } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, round2, assertOrgOwnsFlat, assertOrgOwnsTenant } from "./helpers";
import { recalcAdjustmentForFlatMonth } from "./billing";
import { firstOfMonth } from "@/lib/format";
import { revalidatePath } from "next/cache";

export type TenantActionState = { error?: string } | null;

export async function createTenant(_prev: TenantActionState, formData: FormData): Promise<TenantActionState> {
  try {
    const session = await requireOrg();
    const flatId = str(formData, "flatId");
    if (!flatId) return { error: "Please choose a flat." };
    await assertOrgOwnsFlat(session.orgId, flatId);

    const name = str(formData, "name");
    if (!name) return { error: "Tenant name is required." };

    const securityDeposit = num(formData, "securityDeposit", 0);
    if (securityDeposit < 0) return { error: "Security deposit can't be negative." };

    const moveInDate = str(formData, "moveInDate");

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
    await db.insert(tenants).values({
      id: id("ten"),
      flatId,
      name,
      phone: phone || null,
      email: email || null,
      nid: nid || null,
      moveInDate: moveInDate || null,
      securityDeposit: String(securityDeposit),
    });

    const flat = await db.query.flats.findFirst({ where: eq(flats.id, flatId) });
    await recalcAdjustmentForFlatMonth(flatId, firstOfMonth());
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
    revalidatePath("/bills");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving this tenant. Please try again." };
  }
}

export async function updateTenant(
  tenantId: string,
  _prev: TenantActionState,
  formData: FormData
): Promise<TenantActionState> {
  try {
    const session = await requireOrg();
    const before = await assertOrgOwnsTenant(session.orgId, tenantId);
    const name = str(formData, "name");
    if (!name) return { error: "Tenant name is required." };

    const phone = str(formData, "phone");
    const email = str(formData, "email");
    const nid = str(formData, "nid");
    const moveInDate = str(formData, "moveInDate");
    const moveOutDate = str(formData, "moveOutDate");
    if (moveInDate && moveOutDate && moveOutDate < moveInDate) {
      return { error: "Move-out date can't be before the move-in date." };
    }
    const securityDeposit = num(formData, "securityDeposit", 0);
    if (securityDeposit < 0) return { error: "Security deposit can't be negative." };
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
        moveOutDate: moveOutDate || null,
        securityDeposit: String(securityDeposit),
        notes: notes || null,
        active,
      })
      .where(eq(tenants.id, tenantId));

    // Move-in/out dates directly change which months this tenant is attributed to —
    // recalc this month so the change is reflected immediately rather than waiting
    // for an unrelated visit to Bills to trigger it.
    if (before.moveInDate !== (moveInDate || null) || before.moveOutDate !== (moveOutDate || null)) {
      await recalcAdjustmentForFlatMonth(before.flatId, firstOfMonth());
    }

    revalidatePath("/tenants");
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath("/dashboard");
    revalidatePath("/bills");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving these changes. Please try again." };
  }
}

// Spec #8: prefer "mark as moved out" over destroying a tenant that has billing
// history, so past bills/payments still make sense to look back on. This just
// flips the tenant inactive rather than deleting anything.
export async function markTenantMovedOut(tenantId: string) {
  const session = await requireOrg();
  const tenant = await assertOrgOwnsTenant(session.orgId, tenantId);
  const today = new Date().toISOString().slice(0, 10);
  await db.update(tenants).set({ active: false, moveOutDate: today }).where(eq(tenants.id, tenantId));
  await recalcAdjustmentForFlatMonth(tenant.flatId, firstOfMonth());
  await db.insert(notifications).values({
    id: id("ntf"),
    orgId: session.orgId,
    title: "Tenant moved out",
    body: tenant.securityDeposit && parseFloat(tenant.securityDeposit) > 0 && !tenant.depositReturned
      ? `${tenant.name} marked as moved out — don't forget their ${tenant.securityDeposit} deposit`
      : `${tenant.name} marked as moved out — the flat is now vacant`,
    kind: "info",
  });
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/dashboard");
  revalidatePath("/bills");
}

// Records the security deposit being handed back to a departed tenant — kept
// separate from monthly payments since it's not rent, it's the owner returning
// money they were holding.
export async function returnDeposit(tenantId: string, formData: FormData) {
  const session = await requireOrg();
  const tenant = await assertOrgOwnsTenant(session.orgId, tenantId);
  const amount = round2(num(formData, "amount", parseFloat(tenant.securityDeposit)));
  const returnedOn = str(formData, "returnedOn") || new Date().toISOString().slice(0, 10);
  await db
    .update(tenants)
    .set({ depositReturned: true, depositReturnedAmount: String(amount), depositReturnedOn: returnedOn })
    .where(eq(tenants.id, tenantId));
  await db.insert(notifications).values({
    id: id("ntf"),
    orgId: session.orgId,
    title: "Deposit returned",
    body: `Returned ${amount} deposit to ${tenant.name}`,
    kind: "info",
  });
  revalidatePath(`/tenants/${tenantId}`);
  revalidatePath("/tenants");
}

// True permanent delete — only for genuine mistakes (spec #35). Cascades to
// this tenant's own row only; flat/bill/payment history is tied to the flat,
// not the tenant record, so it is preserved either way.
export async function deleteTenant(tenantId: string) {
  const session = await requireOrg();
  const tenant = await assertOrgOwnsTenant(session.orgId, tenantId);

  // Deleting a tenant nulls out tenant_id on their historical bills automatically
  // (FK "on delete set null"), but that alone leaves the old rent/bills/total
  // numbers stale — they need an actual recalculation, which will correctly zero
  // out any month this tenant's deletion leaves vacant.
  const affectedMonth = await db.query.monthlyAdjustments.findFirst({
    where: eq(monthlyAdjustments.tenantId, tenantId),
    orderBy: asc(monthlyAdjustments.month),
  });

  await db.delete(tenants).where(eq(tenants.id, tenantId));

  if (affectedMonth) {
    await recalcAdjustmentForFlatMonth(tenant.flatId, affectedMonth.month);
  }

  revalidatePath("/tenants");
  revalidatePath("/dashboard");
  revalidatePath("/bills");
}

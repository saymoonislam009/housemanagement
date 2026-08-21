"use server";

import { db } from "@/db";
import { organizations, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireOrg, str } from "./helpers";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { THEME_COOKIE } from "@/lib/theme";

export async function setLanguage(lang: "en" | "bn") {
  cookies().set(LOCALE_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const session = await requireOrg().catch(() => null);
  if (session) {
    await db.update(organizations).set({ language: lang }).where(eq(organizations.id, session.orgId));
  }
  revalidatePath("/", "layout");
}

export async function setTheme(theme: "light" | "dark") {
  cookies().set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const session = await requireOrg().catch(() => null);
  if (session) {
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) });
    const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
    await db
      .update(organizations)
      .set({ settings: { ...currentSettings, theme } })
      .where(eq(organizations.id, session.orgId));
  }
  revalidatePath("/", "layout");
}

export async function updateOrgSettings(formData: FormData) {
  const session = await requireOrg();
  const name = str(formData, "name");
  const currency = str(formData, "currency") || "BDT";
  if (!name) return;
  await db.update(organizations).set({ name, currency }).where(eq(organizations.id, session.orgId));
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

// Spec #38: billing defaults so a new meter form doesn't start from zero every time.
// Stored on organizations.settings (jsonb) rather than a new table, since these are
// just pre-fill values, not something referenced elsewhere.
export async function updateBillingDefaults(formData: FormData) {
  const session = await requireOrg();
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) });
  const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
  const defaultUnitRate = parseFloat(String(formData.get("defaultUnitRate") ?? "0")) || 0;
  const defaultMeterCharge = parseFloat(String(formData.get("defaultMeterCharge") ?? "0")) || 0;
  const defaultOtherCharge = parseFloat(String(formData.get("defaultOtherCharge") ?? "0")) || 0;
  await db
    .update(organizations)
    .set({ settings: { ...currentSettings, defaultUnitRate, defaultMeterCharge, defaultOtherCharge } })
    .where(eq(organizations.id, session.orgId));
  revalidatePath("/settings");
  revalidatePath("/meters");
}

export async function markAllNotificationsRead() {
  const session = await requireOrg();
  await db.update(notifications).set({ read: true }).where(eq(notifications.orgId, session.orgId));
  revalidatePath("/", "layout");
}

export async function markNotificationRead(notificationId: string) {
  const session = await requireOrg();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.orgId, session.orgId)));
  revalidatePath("/", "layout");
}

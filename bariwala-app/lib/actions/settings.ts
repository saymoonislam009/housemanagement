"use server";

import { db } from "@/db";
import { organizations, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOrg, str } from "./helpers";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";

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

export async function updateOrgSettings(formData: FormData) {
  const session = await requireOrg();
  const name = str(formData, "name");
  const currency = str(formData, "currency") || "BDT";
  if (!name) return;
  await db.update(organizations).set({ name, currency }).where(eq(organizations.id, session.orgId));
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const session = await requireOrg();
  await db.update(notifications).set({ read: true }).where(eq(notifications.orgId, session.orgId));
  revalidatePath("/", "layout");
}

export async function markNotificationRead(notificationId: string) {
  await requireOrg();
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, notificationId));
  revalidatePath("/", "layout");
}

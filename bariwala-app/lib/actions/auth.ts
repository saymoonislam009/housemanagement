"use server";

import { db } from "@/db";
import { organizations, users, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { hashPassword, verifyPassword, createSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";

export type ActionState = { error?: string } | null;

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = getDict();
  const orgName = String(formData.get("orgName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!orgName || !name || !email || !password) {
    return { error: t("required_field") };
  }
  if (password !== confirm) {
    return { error: t("error_passwords_mismatch") };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { error: t("error_email_taken") };
  }

  const orgId = id("org");
  const userId = id("usr");
  const passwordHash = await hashPassword(password);

  await db.insert(organizations).values({ id: orgId, name: orgName });
  await db.insert(users).values({
    id: userId,
    orgId,
    name,
    email,
    passwordHash,
    role: "owner",
  });
  await db.insert(notifications).values({
    id: id("ntf"),
    orgId,
    title: "Welcome to Bariwala",
    body: "Start by adding your first property, then its flats.",
    kind: "system",
  });

  await createSession({ userId, orgId, role: "owner", name, email });
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const t = getDict();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: t("required_field") };
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user) {
    return { error: t("error_invalid_credentials") };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: t("error_invalid_credentials") };
  }

  await createSession({
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    name: user.name,
    email: user.email,
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

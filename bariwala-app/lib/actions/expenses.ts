"use server";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num } from "./helpers";
import { revalidatePath } from "next/cache";

export async function createExpense(formData: FormData) {
  const session = await requireOrg();
  const propertyId = str(formData, "propertyId");
  const category = str(formData, "category");
  const amount = num(formData, "amount", 0);
  const spentOn = str(formData, "spentOn");
  const note = str(formData, "note");
  if (!category || amount <= 0 || !spentOn) return;
  await db.insert(expenses).values({
    id: id("exp"),
    orgId: session.orgId,
    propertyId: propertyId || null,
    category,
    amount: String(amount),
    spentOn,
    note: note || null,
  });
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function deleteExpense(expenseId: string) {
  await requireOrg();
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

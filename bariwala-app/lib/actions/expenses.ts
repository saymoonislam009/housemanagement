"use server";

import { db } from "@/db";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str, num, round2, assertOrgOwnsExpense } from "./helpers";
import { revalidatePath } from "next/cache";

export type ExpenseActionState = { error?: string } | null;

export async function createExpense(_prev: ExpenseActionState, formData: FormData): Promise<ExpenseActionState> {
  try {
    const session = await requireOrg();
    const propertyId = str(formData, "propertyId");
    const category = str(formData, "category");
    if (!category) return { error: "Category is required." };
    const amount = round2(num(formData, "amount", 0));
    if (amount <= 0) return { error: "Amount must be greater than zero." };
    const spentOn = str(formData, "spentOn");
    if (!spentOn) return { error: "Date is required." };
    const note = str(formData, "note");
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
    return null;
  } catch {
    return { error: "Something went wrong saving this expense. Please try again." };
  }
}

export async function updateExpense(
  expenseId: string,
  _prev: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const session = await requireOrg();
    await assertOrgOwnsExpense(session.orgId, expenseId);
    const category = str(formData, "category");
    if (!category) return { error: "Category is required." };
    const amount = round2(num(formData, "amount", 0));
    if (amount <= 0) return { error: "Amount must be greater than zero." };
    const spentOn = str(formData, "spentOn");
    if (!spentOn) return { error: "Date is required." };
    const note = str(formData, "note");
    await db
      .update(expenses)
      .set({ category, amount: String(amount), spentOn, note: note || null })
      .where(eq(expenses.id, expenseId));
    revalidatePath("/expenses");
    revalidatePath("/dashboard");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving these changes. Please try again." };
  }
}

export async function deleteExpense(expenseId: string) {
  const session = await requireOrg();
  await assertOrgOwnsExpense(session.orgId, expenseId);
  await db.delete(expenses).where(eq(expenses.id, expenseId));
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

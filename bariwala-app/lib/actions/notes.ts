"use server";

import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str } from "./helpers";
import { revalidatePath } from "next/cache";

export async function createNote(formData: FormData) {
  const session = await requireOrg();
  const noteDate = str(formData, "noteDate");
  const content = str(formData, "content");
  if (!noteDate || !content) return;
  await db.insert(notes).values({ id: id("note"), orgId: session.orgId, noteDate, content });
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

async function assertOrgOwnsNote(orgId: string, noteId: string) {
  const note = await db.query.notes.findFirst({ where: eq(notes.id, noteId) });
  if (!note || note.orgId !== orgId) throw new Error("NOT_FOUND_OR_FORBIDDEN");
  return note;
}

export async function updateNote(noteId: string, formData: FormData) {
  const session = await requireOrg();
  await assertOrgOwnsNote(session.orgId, noteId);
  const noteDate = str(formData, "noteDate");
  const content = str(formData, "content");
  if (!noteDate || !content) return;
  await db.update(notes).set({ noteDate, content, updatedAt: new Date() }).where(eq(notes.id, noteId));
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function deleteNote(noteId: string) {
  const session = await requireOrg();
  await assertOrgOwnsNote(session.orgId, noteId);
  await db.delete(notes).where(eq(notes.id, noteId));
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

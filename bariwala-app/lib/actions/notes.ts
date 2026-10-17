"use server";

import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { id } from "@/lib/id";
import { requireOrg, str } from "./helpers";
import { revalidatePath } from "next/cache";

export type NoteActionState = { error?: string } | null;

export async function createNote(_prev: NoteActionState, formData: FormData): Promise<NoteActionState> {
  try {
    const session = await requireOrg();
    const noteDate = str(formData, "noteDate");
    if (!noteDate) return { error: "Please pick a date." };
    const content = str(formData, "content");
    if (!content) return { error: "Note can't be empty." };
    await db.insert(notes).values({ id: id("note"), orgId: session.orgId, noteDate, content });
    revalidatePath("/notes");
    revalidatePath("/dashboard");
    return null;
  } catch {
    return { error: "Something went wrong saving this note. Please try again." };
  }
}

async function assertOrgOwnsNote(orgId: string, noteId: string) {
  const note = await db.query.notes.findFirst({ where: eq(notes.id, noteId) });
  if (!note || note.orgId !== orgId) throw new Error("NOT_FOUND_OR_FORBIDDEN");
  return note;
}

export async function updateNote(
  noteId: string,
  _prev: NoteActionState,
  formData: FormData
): Promise<NoteActionState> {
  try {
    const session = await requireOrg();
    await assertOrgOwnsNote(session.orgId, noteId);
    const noteDate = str(formData, "noteDate");
    if (!noteDate) return { error: "Please pick a date." };
    const content = str(formData, "content");
    if (!content) return { error: "Note can't be empty." };
    await db.update(notes).set({ noteDate, content, updatedAt: new Date() }).where(eq(notes.id, noteId));
    revalidatePath("/notes");
    revalidatePath("/dashboard");
    return null;
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_FORBIDDEN") throw err;
    return { error: "Something went wrong saving these changes. Please try again." };
  }
}

export async function deleteNote(noteId: string) {
  const session = await requireOrg();
  await assertOrgOwnsNote(session.orgId, noteId);
  await db.delete(notes).where(eq(notes.id, noteId));
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

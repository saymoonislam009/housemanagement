"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createNote, updateNote } from "@/lib/actions/notes";
import { Field, Input, Textarea, Button } from "./ui";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : "Save"}
    </Button>
  );
}

export function NoteForm({
  noteId,
  defaultDate,
  defaultContent,
}: {
  noteId?: string;
  defaultDate?: string;
  defaultContent?: string;
}) {
  const action = noteId ? updateNote.bind(null, noteId) : createNote;
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Date">
        <Input name="noteDate" type="date" required defaultValue={defaultDate} />
      </Field>
      <Field label="Note">
        <Textarea
          name="content"
          rows={4}
          required
          autoFocus={!noteId}
          defaultValue={defaultContent}
          placeholder="e.g. Rahim called about a leaking tap in 3A"
        />
      </Field>
      {state?.error && <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>}
      <SubmitButton />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

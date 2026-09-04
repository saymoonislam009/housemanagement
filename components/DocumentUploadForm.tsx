"use client";

import { useFormState, useFormStatus } from "react-dom";
import { uploadTenantDocument } from "@/lib/actions/documents";
import { Field, Select, Button } from "./ui";
import { CloseOnSuccess } from "./CloseOnSuccess";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}

export function DocumentUploadForm({ tenantId }: { tenantId: string }) {
  const action = uploadTenantDocument.bind(null, tenantId);
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Document type">
        <Select name="type" defaultValue="other">
          <option value="photo">Tenant photo</option>
          <option value="nid_front">NID — front</option>
          <option value="nid_back">NID — back</option>
          <option value="agreement">Rental agreement</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="File" hint="Image or PDF, up to 3MB">
        <input
          name="file"
          type="file"
          accept="image/*,application/pdf"
          required
          className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-paper-50"
        />
      </Field>
      {state?.error && <p className="text-sm text-clay-500">{state.error}</p>}
      <SubmitButton />
      <CloseOnSuccess skip={!!state?.error} />
    </form>
  );
}

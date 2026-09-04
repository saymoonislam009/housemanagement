"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateTenant } from "@/lib/actions/tenants";
import { Field, Input, Textarea, Button } from "./ui";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function EditTenantForm({
  tenant,
  onDelete,
  labels,
}: {
  tenant: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    nid: string | null;
    moveInDate: string | null;
    moveOutDate: string | null;
    securityDeposit: string;
    active: boolean;
    notes: string | null;
  };
  onDelete: () => Promise<void>;
  labels: {
    basicInfo: string;
    tenantName: string;
    phone: string;
    email: string;
    nid: string;
    moveInDate: string;
    active: string;
    note: string;
    save: string;
    permanentlyDelete: string;
    confirmDelete: string;
  };
}) {
  const action = updateTenant.bind(null, tenant.id);
  const [state, formAction] = useFormState(action, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label={labels.tenantName}>
        <Input name="name" defaultValue={tenant.name} required />
      </Field>
      <Field label={labels.phone}>
        <Input name="phone" defaultValue={tenant.phone ?? ""} type="tel" />
      </Field>
      <Field label={labels.email}>
        <Input name="email" defaultValue={tenant.email ?? ""} type="email" />
      </Field>
      <Field label={labels.nid}>
        <Input name="nid" defaultValue={tenant.nid ?? ""} />
      </Field>
      <Field label={labels.moveInDate}>
        <Input name="moveInDate" type="date" defaultValue={tenant.moveInDate ?? ""} />
      </Field>
      <Field label="Move-out date" hint="Only set if they've actually left">
        <Input name="moveOutDate" type="date" defaultValue={tenant.moveOutDate ?? ""} />
      </Field>
      <Field label="Security deposit" hint="Advance/deposit held by you">
        <Input name="securityDeposit" type="number" step="0.01" min="0" defaultValue={tenant.securityDeposit} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-800">
        <input type="checkbox" name="active" defaultChecked={tenant.active} className="h-4 w-4 rounded border-ink-900/20" />
        {labels.active}
      </label>
      <div className="sm:col-span-2">
        <Field label={labels.note}>
          <Textarea name="notes" defaultValue={tenant.notes ?? ""} rows={3} />
        </Field>
      </div>

      {state?.error && (
        <div className="sm:col-span-2">
          <p className="rounded-lg bg-clay-500/10 px-3 py-2 text-sm text-clay-500">{state.error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton label={labels.save} />
        <details className="ml-auto">
          <summary className="cursor-pointer list-none text-xs text-clay-500/70 hover:text-clay-500">
            {labels.permanentlyDelete}
          </summary>
          <div className="mt-2">
            <ConfirmDeleteButton
              action={onDelete}
              confirmText={labels.confirmDelete}
              className="flex items-center gap-1.5 rounded-lg border border-clay-500/30 px-3 py-1.5 text-xs font-medium text-clay-500 hover:bg-clay-500/10"
            />
          </div>
        </details>
      </div>
    </form>
  );
}

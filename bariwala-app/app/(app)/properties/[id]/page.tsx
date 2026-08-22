import { getOrgContext, getProperty } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { CloseOnSuccess } from "@/components/CloseOnSuccess";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createFlat, updateFlat, deleteFlat } from "@/lib/actions/properties";
import { createTenant } from "@/lib/actions/tenants";
import { Icon, paths } from "@/components/icons";
import { money } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const property = await getProperty(org.id, params.id);
  if (!property) notFound();

  return (
    <div>
      <Link href="/properties" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900">
        <Icon path={paths.arrowRight} className="h-3.5 w-3.5 rotate-180" />
        {t("back")}
      </Link>
      <PageHeader
        title={property.name}
        sub={property.address ?? undefined}
        action={
          <Modal title={t("add_flat")} trigger={<Button variant="primary">{t("add_flat")}</Button>}>
            <form action={createFlat.bind(null, property.id)} className="space-y-4">
              <Field label={t("flat_name")}>
                <Input name="name" required autoFocus placeholder="3B" />
              </Field>
              <Field label={t("floor")}>
                <Input name="floor" required placeholder="3rd Floor" />
              </Field>
              <Field label={t("rent_amount")}>
                <Input name="rentAmount" type="number" step="0.01" min="0" required />
              </Field>
              <Field label="Service charge" hint="Optional recurring monthly charge, separate from rent">
                <Input name="serviceCharge" type="number" step="0.01" min="0" defaultValue="0" />
              </Field>
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
              <CloseOnSuccess />
            </form>
          </Modal>
        }
      />

      {property.flats.length === 0 ? (
        <EmptyState title={t("no_flats")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {property.flats.map((flat) => (
            <Card key={flat.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-950">{flat.name}</h3>
                  <p className="text-xs text-ink-600">{flat.floor}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    flat.tenants.some((tn) => tn.active) ? "bg-okay/15 text-okay" : "bg-ink-900/8 text-ink-600"
                  }`}
                >
                  {flat.tenants.some((tn) => tn.active) ? t("occupied") : t("vacant")}
                </span>
              </div>
              <p className="tabular mt-3 text-lg font-semibold text-ink-900">{money(flat.rentAmount, org.currency)}</p>
              <p className="text-xs text-ink-600">{t("rent_amount")}</p>

              {flat.tenants.find((tn) => tn.active) ? (
                <Link
                  href={`/tenants/${flat.tenants.find((tn) => tn.active)!.id}`}
                  className="mt-2 block truncate text-sm text-ink-700 hover:text-brass-600"
                >
                  👤 {flat.tenants.find((tn) => tn.active)!.name}
                </Link>
              ) : (
                <Modal
                  title={`Assign tenant — ${flat.name}`}
                  trigger={
                    <Button variant="subtle" className="mt-2 w-full !py-1.5 text-xs">
                      + Assign tenant
                    </Button>
                  }
                >
                  <form action={createTenant} className="space-y-4">
                    <input type="hidden" name="flatId" value={flat.id} />
                    <p className="text-sm text-ink-600">
                      {property.name} · {flat.name} ({flat.floor})
                    </p>
                    <Field label={t("tenant_name")}>
                      <Input name="name" required autoFocus />
                    </Field>
                    <Field label={t("phone")}>
                      <Input name="phone" type="tel" />
                    </Field>
                    <Button type="submit" className="w-full">
                      {t("save")}
                    </Button>
                    <CloseOnSuccess />
                  </form>
                </Modal>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Modal
                  title={t("edit")}
                  trigger={
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs">
                      <Icon path={paths.edit} className="h-3.5 w-3.5" /> {t("edit")}
                    </Button>
                  }
                >
                  <form action={updateFlat.bind(null, flat.id, property.id)} className="space-y-4">
                    <Field label={t("flat_name")}>
                      <Input name="name" defaultValue={flat.name} required />
                    </Field>
                    <Field label={t("floor")}>
                      <Input name="floor" defaultValue={flat.floor} required />
                    </Field>
                    <Field label={t("rent_amount")}>
                      <Input name="rentAmount" type="number" step="0.01" min="0" defaultValue={flat.rentAmount} required />
                    </Field>
                    <Field label="Service charge">
                      <Input name="serviceCharge" type="number" step="0.01" min="0" defaultValue={flat.serviceCharge} />
                    </Field>
                    <label className="flex items-center gap-2 text-sm text-ink-800">
                      <input type="checkbox" name="active" defaultChecked={flat.active} className="h-4 w-4 rounded border-ink-900/20" />
                      {t("status_active")}
                    </label>
                    <Button type="submit" className="w-full">
                      {t("save")}
                    </Button>
                    <CloseOnSuccess />
                  </form>
                </Modal>
                <ConfirmDeleteButton
                  action={deleteFlat.bind(null, flat.id, property.id)}
                  confirmText={t("confirm_delete_flat")}
                  className="ml-auto rounded-lg p-2 text-ink-600/50 hover:bg-clay-500/10 hover:text-clay-500"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

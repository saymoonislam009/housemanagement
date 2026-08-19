import { getOrgContext, getPropertiesWithFlats } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createProperty, deleteProperty } from "@/lib/actions/properties";
import { Icon, paths } from "@/components/icons";
import Link from "next/link";

export default async function PropertiesPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const properties = await getPropertiesWithFlats(org.id);

  return (
    <div>
      <PageHeader
        title={t("properties_title")}
        sub={t("properties_sub")}
        action={
          <Modal title={t("add_property")} trigger={<Button variant="primary">{t("add_property_cta")}</Button>}>
            <form action={createProperty} className="space-y-4">
              <Field label={t("property_name")}>
                <Input name="name" required autoFocus />
              </Field>
              <Field label={t("address")}>
                <Input name="address" />
              </Field>
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
            </form>
          </Modal>
        }
      />

      {properties.length === 0 ? (
        <EmptyState title={t("no_properties")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const occupied = p.flats.filter((f) => f.active).length;
            return (
              <Card key={p.id} className="relative h-full transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass-400/20 text-brass-600">
                    <Icon path={paths.building} className="h-5 w-5" />
                  </div>
                  <div className="relative z-10">
                    <ConfirmDeleteButton action={deleteProperty.bind(null, p.id)} confirmText={t("confirm_delete")} />
                  </div>
                </div>
                <Link href={`/properties/${p.id}`} className="absolute inset-0 z-0" aria-label={p.name} />
                <h3 className="mt-3 font-display text-lg font-semibold text-ink-950">{p.name}</h3>
                {p.address && <p className="mt-0.5 truncate text-sm text-ink-600">{p.address}</p>}
                <p className="mt-3 text-xs font-medium text-ink-700">
                  {p.flats.length} {t("flats")} · {occupied} {t("occupied").toLowerCase()}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

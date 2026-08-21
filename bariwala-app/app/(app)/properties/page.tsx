import { getOrgContext, getPropertiesWithFlats } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { CloseOnSuccess } from "@/components/CloseOnSuccess";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createProperty, deleteProperty } from "@/lib/actions/properties";
import { Icon, paths } from "@/components/icons";
import Link from "next/link";

export default async function PropertiesPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const properties = await getPropertiesWithFlats(org.id);

  // House-first onboarding (spec #4): a brand new owner should never see a generic
  // empty state — they should be walked straight into naming their first house.
  if (properties.length === 0) {
    return (
      <div className="mx-auto max-w-md py-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brass-400/20 text-brass-600">
          <Icon path={paths.building} className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">{t("setup_house_title")}</h1>
        <p className="mt-2 text-sm text-ink-600">{t("setup_house_sub")}</p>
        <form action={createProperty} className="mt-6 space-y-4 text-left">
          <Field label={t("property_name")} hint={t("property_name_hint")}>
            <Input name="name" required autoFocus placeholder="Rahman House" />
          </Field>
          <Field label={t("address")}>
            <Input name="address" />
          </Field>
          <Button type="submit" className="w-full">
            {t("get_started")}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("properties_title")}
        sub={t("properties_sub")}
        action={
          <Modal title={t("add_property")} trigger={<Button variant="primary">{t("add_property_cta")}</Button>}>
            <form action={createProperty} className="space-y-4">
              <Field label={t("property_name")} hint={t("property_name_hint")}>
                <Input name="name" required autoFocus />
              </Field>
              <Field label={t("address")}>
                <Input name="address" />
              </Field>
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
              <CloseOnSuccess />
            </form>
          </Modal>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => {
          const totalFlats = p.flats.length;
          const occupied = p.flats.filter((f) => f.tenants.some((tn) => tn.active)).length;
          return (
            <Card key={p.id} className="relative h-full transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass-400/20 text-brass-600">
                  <Icon path={paths.building} className="h-5 w-5" />
                </div>
                <div className="relative z-10">
                  <ConfirmDeleteButton action={deleteProperty.bind(null, p.id)} confirmText={t("confirm_delete_property")} />
                </div>
              </div>
              <Link href={`/properties/${p.id}`} className="absolute inset-0 z-0" aria-label={p.name} />
              <h3 className="mt-3 font-display text-lg font-semibold text-ink-950">{p.name}</h3>
              {p.address && <p className="mt-0.5 truncate text-sm text-ink-600">{p.address}</p>}
              <p className="mt-3 text-xs font-medium text-ink-700">
                {totalFlats} {t("flats")} · {occupied} {t("occupied_of")}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { getOrgContext, getProperty } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteFlat } from "@/lib/actions/properties";
import { FlatForm } from "@/components/FlatForm";
import { CreateTenantForm } from "@/components/CreateTenantForm";
import { Icon, paths } from "@/components/icons";
import { money } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PropertyDetailPage({ params }: { params: { id: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const property = await getProperty(org.id, params.id);
  if (!property) notFound();

  const flatLabels = {
    flatName: t("flat_name"),
    flatNameHint: t("flat_name_hint"),
    floor: t("floor"),
    floorHint: t("floor_hint"),
    rent: t("rent_amount"),
    serviceCharge: "Service charge",
    active: t("status_active"),
    save: t("save"),
  };

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
            <FlatForm propertyId={property.id} labels={flatLabels} />
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
                  <CreateTenantForm
                    fixedFlatId={flat.id}
                    fixedFlatLabel={`${property.name} · ${flat.name} (${flat.floor})`}
                    labels={{
                      selectFlat: t("select_flat"),
                      tenantName: t("tenant_name"),
                      phone: t("phone"),
                      email: t("email"),
                      nid: t("nid"),
                      moveInDate: t("move_in_date"),
                      additional: t("additional_information"),
                      save: t("save"),
                    }}
                  />
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
                  <FlatForm
                    propertyId={property.id}
                    flatId={flat.id}
                    defaultName={flat.name}
                    defaultFloor={flat.floor}
                    defaultRent={flat.rentAmount}
                    defaultServiceCharge={flat.serviceCharge}
                    defaultActive={flat.active}
                    labels={flatLabels}
                  />
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

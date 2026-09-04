import { getOrgContext, getTenantsForOrg, getFlatsForOrg } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TenantSearchList } from "@/components/TenantSearchList";
import { CreateTenantForm } from "@/components/CreateTenantForm";

export default async function TenantsPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const [tenantsList, flatsList] = await Promise.all([getTenantsForOrg(org.id), getFlatsForOrg(org.id)]);

  // Only offer flats that don't already have someone living there — a flat can only
  // have one active tenant at a time (also enforced server-side, this just keeps the
  // owner from picking a wrong option in the first place).
  const occupiedFlatIds = new Set(tenantsList.filter((tn) => tn.active).map((tn) => tn.flatId));
  const vacantFlats = flatsList.filter((f) => !occupiedFlatIds.has(f.id));

  return (
    <div>
      <PageHeader
        title={t("tenants_title")}
        sub={t("tenants_sub")}
        action={
          <Modal title={t("add_tenant")} trigger={<Button variant="primary">{t("add_tenant_cta")}</Button>}>
            <CreateTenantForm
              flats={vacantFlats}
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
        }
      />

      {tenantsList.length === 0 ? (
        <EmptyState title={t("no_tenants")} />
      ) : (
        <TenantSearchList
          tenants={tenantsList}
          currency={org.currency}
          labels={{ search: t("search"), active: t("status_active"), inactive: t("status_inactive") }}
        />
      )}
    </div>
  );
}

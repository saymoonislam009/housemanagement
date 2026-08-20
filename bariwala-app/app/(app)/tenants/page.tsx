import { getOrgContext, getTenantsForOrg, getFlatsForOrg } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Field, Input, Select, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { TenantSearchList } from "@/components/TenantSearchList";
import { createTenant } from "@/lib/actions/tenants";

export default async function TenantsPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const [tenantsList, flatsList] = await Promise.all([getTenantsForOrg(org.id), getFlatsForOrg(org.id)]);

  return (
    <div>
      <PageHeader
        title={t("tenants_title")}
        sub={t("tenants_sub")}
        action={
          <Modal title={t("add_tenant")} trigger={<Button variant="primary">{t("add_tenant_cta")}</Button>}>
            <form action={createTenant} className="space-y-4">
              <Field label={t("select_flat")}>
                <Select name="flatId" required defaultValue="">
                  <option value="" disabled>
                    {t("select_flat")}
                  </option>
                  {flatsList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.propertyName} · {f.name} ({f.floor})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("tenant_name")}>
                <Input name="name" required autoFocus />
              </Field>
              <details className="rounded-lg border border-ink-900/10 p-3">
                <summary className="cursor-pointer text-xs font-medium text-ink-700">
                  {t("additional_information")}
                </summary>
                <div className="mt-3 space-y-4">
                  <Field label={t("phone")}>
                    <Input name="phone" type="tel" />
                  </Field>
                  <Field label={t("email")}>
                    <Input name="email" type="email" />
                  </Field>
                  <Field label={t("nid")}>
                    <Input name="nid" />
                  </Field>
                  <Field label={t("move_in_date")}>
                    <Input name="moveInDate" type="date" />
                  </Field>
                </div>
              </details>
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
            </form>
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

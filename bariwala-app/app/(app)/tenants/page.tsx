import { getOrgContext, getTenantsForOrg, getFlatsForOrg } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Select, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { createTenant } from "@/lib/actions/tenants";
import { Icon, paths } from "@/components/icons";
import { money } from "@/lib/format";
import Link from "next/link";

export default async function TenantsPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const [tenantsList, flatsList] = await Promise.all([getTenantsForOrg(org.id), getFlatsForOrg(org.id)]);
  const vacantFlats = flatsList; // allow assigning any flat (owner may re-let / co-tenant)

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
                  {vacantFlats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.propertyName} · {f.name} ({f.floor})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("tenant_name")}>
                <Input name="name" required />
              </Field>
              <Field label={t("phone")}>
                <Input name="phone" type="tel" />
              </Field>
              <Field label={`${t("email")} (${t("optional")})`}>
                <Input name="email" type="email" />
              </Field>
              <Field label={t("nid")}>
                <Input name="nid" />
              </Field>
              <Field label={t("move_in_date")}>
                <Input name="moveInDate" type="date" />
              </Field>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenantsList.map((tn) => (
            <Card key={tn.id} className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/8 font-display text-sm font-semibold text-ink-800">
                  {tn.name.slice(0, 1).toUpperCase()}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    tn.active ? "bg-okay/15 text-okay" : "bg-ink-900/8 text-ink-600"
                  }`}
                >
                  {tn.active ? t("status_active") : t("status_inactive")}
                </span>
              </div>
              <Link href={`/tenants/${tn.id}`} className="absolute inset-0 z-0" aria-label={tn.name} />
              <h3 className="mt-3 font-display text-base font-semibold text-ink-950">{tn.name}</h3>
              <p className="text-xs text-ink-600">
                {tn.propertyName} · {tn.flatName} ({tn.floor})
              </p>
              {tn.phone && <p className="mt-2 text-sm text-ink-700">📞 {tn.phone}</p>}
              <p className="tabular mt-2 text-sm font-medium text-ink-900">{money(tn.rentAmount, org.currency)}/mo</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

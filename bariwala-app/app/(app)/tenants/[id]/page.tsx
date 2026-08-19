import { getOrgContext, getTenant, getPaymentsForOrg } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Textarea, Button } from "@/components/ui";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { updateTenant, deleteTenant } from "@/lib/actions/tenants";
import { Icon, paths } from "@/components/icons";
import { money, shortDate } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const tenant = await getTenant(org.id, params.id);
  if (!tenant) notFound();
  const payments = (await getPaymentsForOrg(org.id, tenant.flatId)).filter((p) => p.tenantId === tenant.id);

  return (
    <div>
      <Link href="/tenants" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900">
        <Icon path={paths.arrowRight} className="h-3.5 w-3.5 rotate-180" />
        {t("back")}
      </Link>
      <PageHeader
        title={tenant.name}
        sub={`${tenant.propertyName} · ${tenant.flatName} (${tenant.floor})`}
        action={
          <ConfirmDeleteButton
            action={deleteTenant.bind(null, tenant.id)}
            confirmText={t("confirm_delete")}
            className="flex items-center gap-1.5 rounded-lg border border-clay-500/30 px-3 py-2 text-sm font-medium text-clay-500 hover:bg-clay-500/10"
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">{t("edit")}</h2>
          <form action={updateTenant.bind(null, tenant.id)} className="grid gap-4 sm:grid-cols-2">
            <Field label={t("tenant_name")}>
              <Input name="name" defaultValue={tenant.name} required />
            </Field>
            <Field label={t("phone")}>
              <Input name="phone" defaultValue={tenant.phone ?? ""} type="tel" />
            </Field>
            <Field label={t("email")}>
              <Input name="email" defaultValue={tenant.email ?? ""} type="email" />
            </Field>
            <Field label={t("nid")}>
              <Input name="nid" defaultValue={tenant.nid ?? ""} />
            </Field>
            <Field label={t("move_in_date")}>
              <Input name="moveInDate" type="date" defaultValue={tenant.moveInDate ?? ""} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-800">
              <input type="checkbox" name="active" defaultChecked={tenant.active} className="h-4 w-4 rounded border-ink-900/20" />
              {t("status_active")}
            </label>
            <div className="sm:col-span-2">
              <Field label={t("note")}>
                <Textarea name="notes" defaultValue={tenant.notes ?? ""} rows={3} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">{t("save_changes")}</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{t("rent_amount")}</h2>
          <p className="tabular font-display text-2xl font-semibold text-ink-950">{money(tenant.rentAmount, org.currency)}</p>
          <div className="mt-6 border-t border-ink-900/8 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-800">{t("payments_title")}</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-ink-600">{t("nothing_yet")}</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">{shortDate(p.paidOn)}</span>
                    <span className="tabular font-medium text-okay">+{money(p.amount, org.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

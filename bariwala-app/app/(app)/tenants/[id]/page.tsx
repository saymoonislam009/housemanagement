import { getOrgContext, getTenant, getPaymentsForOrg, getTenantMonthlyHistory, getTenantDocuments } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Button, StatusPill } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { CloseOnSuccess } from "@/components/CloseOnSuccess";
import { EditTenantForm } from "@/components/EditTenantForm";
import { MarkMovedOutButton } from "@/components/MarkMovedOutButton";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { deleteTenantDocument } from "@/lib/actions/documents";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteTenant, markTenantMovedOut, returnDeposit } from "@/lib/actions/tenants";
import { Icon, paths } from "@/components/icons";
import { money, shortDate, monthLabel, whatsAppLink } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const tenant = await getTenant(org.id, params.id);
  if (!tenant) notFound();
  const [payments, history, documents] = await Promise.all([
    getPaymentsForOrg(org.id, tenant.flatId).then((rows) => rows.filter((p) => p.tenantId === tenant.id)),
    getTenantMonthlyHistory(tenant.id, 24),
    getTenantDocuments(tenant.id),
  ]);

  const deposit = parseFloat(tenant.securityDeposit ?? "0");
  const latestUnpaid = history.find((h) => h.status !== "paid");
  const reminderMessage = latestUnpaid
    ? `Hi ${tenant.name}, this is a reminder that ${money(
        Math.max(0, parseFloat(latestUnpaid.totalDue) - parseFloat(latestUnpaid.totalPaid)),
        org.currency
      )} is still due for ${monthLabel(latestUnpaid.month, dLocale)} (${tenant.propertyName} · ${tenant.flatName}). Thank you!`
    : `Hi ${tenant.name}, just checking in about your rent at ${tenant.propertyName} · ${tenant.flatName}. Thank you!`;
  const waLink = whatsAppLink(tenant.phone, reminderMessage);

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
          <div className="flex flex-wrap items-center gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-okay/30 px-3 py-2 text-sm font-medium text-okay hover:bg-okay/10"
              >
                <Icon path={paths.wallet} className="h-4 w-4" />
                WhatsApp
              </a>
            )}
            {tenant.active && (
              <MarkMovedOutButton
                action={markTenantMovedOut.bind(null, tenant.id)}
                confirmText={t("confirm_moved_out")}
                label={t("mark_moved_out")}
              />
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink-800">{t("basic_information")}</h2>
          <EditTenantForm
            tenant={tenant}
            onDelete={deleteTenant.bind(null, tenant.id)}
            labels={{
              basicInfo: t("basic_information"),
              tenantName: t("tenant_name"),
              phone: t("phone"),
              email: t("email"),
              nid: t("nid"),
              moveInDate: t("move_in_date"),
              active: t("status_active"),
              note: t("note"),
              save: t("save_changes"),
              permanentlyDelete: t("permanently_delete"),
              confirmDelete: t("confirm_delete"),
            }}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-ink-800">{t("rent_amount")}</h2>
            <p className="tabular font-display text-2xl font-semibold text-ink-950">{money(tenant.rentAmount, org.currency)}</p>
            <Link
              href={`/tenants/${tenant.id}/statement`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brass-600 hover:underline"
            >
              <Icon path={paths.receipt} className="h-3.5 w-3.5" />
              View this month's statement
            </Link>
            <div className="mt-6 border-t border-ink-900/8 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-ink-800">{t("payments_title")}</h3>
              {payments.length === 0 ? (
                <p className="text-sm text-ink-600">{t("nothing_yet")}</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 8).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-600">{shortDate(p.paidOn, dLocale)}</span>
                      <span className="tabular font-medium text-okay">+{money(p.amount, org.currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {deposit > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-ink-800">Security Deposit</h2>
              <p className="tabular font-display text-xl font-semibold text-ink-950">{money(deposit, org.currency)}</p>
              {tenant.depositReturned ? (
                <p className="mt-2 text-xs text-okay">
                  Returned {money(tenant.depositReturnedAmount ?? "0", org.currency)} on{" "}
                  {tenant.depositReturnedOn ? shortDate(tenant.depositReturnedOn, dLocale) : "—"}
                </p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-ink-600">Held by you, not yet returned</p>
                  <Modal
                    title="Return deposit"
                    trigger={
                      <Button variant="ghost" className="mt-3 w-full !py-1.5 text-xs">
                        Mark deposit as returned
                      </Button>
                    }
                  >
                    <form action={returnDeposit.bind(null, tenant.id)} className="space-y-4">
                      <Field label="Amount returned">
                        <Input name="amount" type="number" step="0.01" min="0" defaultValue={deposit} required />
                      </Field>
                      <Field label="Date">
                        <Input name="returnedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                      </Field>
                      <Button type="submit" className="w-full">
                        {t("save")}
                      </Button>
                      <CloseOnSuccess />
                    </form>
                  </Modal>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-800">Documents</h2>
          <Modal title="Upload document" trigger={<Button variant="ghost" className="!px-3 !py-1.5 text-xs">+ Upload</Button>}>
            <DocumentUploadForm tenantId={tenant.id} />
          </Modal>
        </div>
        {documents.length === 0 ? (
          <Card>
            <p className="py-4 text-center text-sm text-ink-600">
              No documents yet. Add a photo, NID, or rental agreement whenever you're ready — it's optional.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {documents.map((d) => (
              <Card key={d.id} className="!p-3">
                <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="block">
                  {d.mimeType.startsWith("image/") ? (
                    <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-ink-900/5">
                      <img src={`/api/documents/${d.id}`} alt={d.filename} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg bg-ink-900/5 text-ink-600">
                      <Icon path={paths.receipt} className="h-6 w-6" />
                    </div>
                  )}
                </a>
                <p className="mt-2 truncate text-xs font-medium text-ink-800">{d.filename}</p>
                <p className="text-[10px] text-ink-500">{(d.sizeBytes / 1024).toFixed(0)} KB</p>
                <div className="mt-1">
                  <ConfirmDeleteButton
                    action={deleteTenantDocument.bind(null, d.id, tenant.id)}
                    confirmText="Delete this document?"
                    className="text-[11px] text-clay-500/70 hover:text-clay-500"
                    iconClassName="h-3 w-3"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-800">{t("monthly_history_title")}</h2>
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/10 text-left text-xs text-ink-600">
                    <th className="px-4 py-3 font-medium">{t("month")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("total_due")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("paid")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("balance")}</th>
                    <th className="px-4 py-3 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => {
                    const remaining = Math.max(0, parseFloat(h.totalDue) - parseFloat(h.totalPaid));
                    return (
                      <tr key={h.id} className="border-b border-ink-900/5 last:border-0">
                        <td className="px-4 py-3 font-medium text-ink-900">{monthLabel(h.month, dLocale)}</td>
                        <td className="tabular px-4 py-3 text-right text-ink-800">{money(h.totalDue, org.currency)}</td>
                        <td className="tabular px-4 py-3 text-right text-okay">{money(h.totalPaid, org.currency)}</td>
                        <td className={`tabular px-4 py-3 text-right ${remaining > 0 ? "text-clay-500" : "text-ink-600"}`}>
                          {money(remaining, org.currency)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusPill status={h.status} labels={{ unpaid: t("unpaid"), partial: t("partial"), paid: t("fully_paid") }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

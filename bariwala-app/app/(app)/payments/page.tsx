import { getOrgContext, getPaymentsForOrg, getFlatsForOrg } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, EmptyState, Button } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { FlatFilter } from "@/components/FlatFilter";
import { EditPaymentForm } from "@/components/EditPaymentForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deletePayment } from "@/lib/actions/billing";
import { money, shortDate } from "@/lib/format";
import { Icon, paths } from "@/components/icons";
import Link from "next/link";

const methodKey: Record<string, string> = {
  cash: "cash",
  bkash: "bkash",
  nagad: "nagad",
  bank: "bank",
  other: "other",
};

export default async function PaymentsPage({ searchParams }: { searchParams: { flat?: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const [flats, payments] = await Promise.all([getFlatsForOrg(org.id), getPaymentsForOrg(org.id, searchParams.flat)]);

  const total = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const editLabels = {
    amount: t("amount"),
    method: t("method"),
    date: t("date"),
    note: t("note"),
    cash: t("cash"),
    bkash: t("bkash"),
    nagad: t("nagad"),
    bank: t("bank"),
    other: t("other"),
    save: t("save"),
  };

  return (
    <div>
      <PageHeader title={t("payments_title")} sub={t("payments_sub")} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <FlatFilter flats={flats} value={searchParams.flat ?? ""} allLabel={t("all_flats")} />
        <div className="ml-auto card !p-3 !px-4">
          <span className="text-xs text-ink-600">{t("total")}: </span>
          <span className="tabular font-semibold text-ink-950">{money(total, org.currency)}</span>
        </div>
      </div>

      {payments.length === 0 ? (
        <EmptyState title={t("nothing_yet")} />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden !p-0 sm:block">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-900/10 text-left text-xs text-ink-600">
                    <th className="px-4 py-3 font-medium">{t("date")}</th>
                    <th className="px-4 py-3 font-medium">{t("tenants_title")}</th>
                    <th className="px-4 py-3 font-medium">{t("flat_name")}</th>
                    <th className="px-4 py-3 font-medium">{t("method")}</th>
                    <th className="px-4 py-3 text-right font-medium">{t("amount")}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-ink-900/5 last:border-0 hover:bg-ink-900/[0.02]">
                      <td className="px-4 py-3 text-ink-700">{shortDate(p.paidOn, dLocale)}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{p.tenantName ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-700">
                        {p.propertyName} · {p.flatName}
                      </td>
                      <td className="px-4 py-3 text-ink-700">{t(methodKey[p.method] as any)}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold text-okay">+{money(p.amount, org.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/payments/${p.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg p-1.5 text-ink-600/50 hover:bg-ink-900/5"
                            title="View receipt"
                          >
                            <Icon path={paths.wallet} className="h-4 w-4" />
                          </Link>
                          <Modal
                            title={t("edit_payment")}
                            trigger={
                              <button className="rounded-lg p-1.5 text-ink-600/50 hover:bg-ink-900/5">
                                <Icon path={paths.edit} className="h-4 w-4" />
                              </button>
                            }
                          >
                            <EditPaymentForm
                              paymentId={p.id}
                              amount={p.amount}
                              method={p.method}
                              paidOn={p.paidOn}
                              note={p.note}
                              labels={editLabels}
                            />
                          </Modal>
                          <ConfirmDeleteButton action={deletePayment.bind(null, p.id)} confirmText={t("confirm_delete")} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {payments.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{p.tenantName ?? p.flatName}</p>
                    <p className="text-xs text-ink-600">
                      {p.propertyName} · {p.flatName} · {shortDate(p.paidOn, dLocale)}
                    </p>
                  </div>
                  <span className="tabular shrink-0 font-semibold text-okay">+{money(p.amount, org.currency)}</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-ink-600">{t(methodKey[p.method] as any)}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Link href={`/payments/${p.id}/receipt`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" className="!px-2.5 !py-1 text-xs">
                        Receipt
                      </Button>
                    </Link>
                    <Modal
                      title={t("edit_payment")}
                      trigger={
                        <Button variant="ghost" className="!px-2.5 !py-1 text-xs">
                          {t("edit")}
                        </Button>
                      }
                    >
                      <EditPaymentForm
                        paymentId={p.id}
                        amount={p.amount}
                        method={p.method}
                        paidOn={p.paidOn}
                        note={p.note}
                        labels={editLabels}
                      />
                    </Modal>
                    <ConfirmDeleteButton action={deletePayment.bind(null, p.id)} confirmText={t("confirm_delete")} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

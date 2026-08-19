import { getOrgContext, getPaymentsForOrg, getFlatsForOrg } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { FlatFilter } from "@/components/FlatFilter";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deletePayment } from "@/lib/actions/billing";
import { money, shortDate } from "@/lib/format";

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
        <Card className="!p-0 overflow-hidden">
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
                    <td className="px-4 py-3 text-right">
                      <ConfirmDeleteButton action={deletePayment.bind(null, p.id)} confirmText={t("confirm_delete")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

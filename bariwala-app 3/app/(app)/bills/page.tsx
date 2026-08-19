import { getOrgContext, getAdjustmentsForMonth, getTenantsByFlatIds } from "@/lib/queries";
import { ensureAdjustmentsForMonth, setManualAdjustment } from "@/lib/actions/billing";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Button, StatusPill, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { PaymentForm } from "@/components/PaymentForm";
import { CategoryRow } from "@/components/CategoryRow";
import { money, firstOfMonth } from "@/lib/format";
import { Icon, paths } from "@/components/icons";

export default async function BillsPage({ searchParams }: { searchParams: { month?: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const month = searchParams.month || firstOfMonth();

  await ensureAdjustmentsForMonth(org.id, month);
  const adjustments = await getAdjustmentsForMonth(org.id, month);
  const tenants = await getTenantsByFlatIds(adjustments.map((a) => a.flatId));
  const tenantByFlat = new Map(tenants.map((tn) => [tn.flatId, tn]));

  const totals = adjustments.reduce(
    (acc, a) => {
      acc.due += parseFloat(a.totalDue);
      acc.paid += parseFloat(a.totalPaid);
      return acc;
    },
    { due: 0, paid: 0 }
  );

  const categoryLabels: Record<string, string> = {
    electricity: t("electricity"),
    water: t("water"),
    gas: t("gas"),
    other: t("other"),
  };

  return (
    <div>
      <PageHeader
        title={t("bills_title")}
        sub={t("bills_sub")}
        action={<MonthSwitcher month={month} locale={org.language} />}
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Card className="!p-4">
          <p className="tabular font-display text-xl font-semibold text-ink-950">{money(totals.due, org.currency)}</p>
          <p className="text-xs text-ink-600">{t("total_due")}</p>
        </Card>
        <Card className="!p-4">
          <p className="tabular font-display text-xl font-semibold text-okay">{money(totals.paid, org.currency)}</p>
          <p className="text-xs text-ink-600">{t("paid")}</p>
        </Card>
        <Card className="!p-4">
          <p className="tabular font-display text-xl font-semibold text-clay-500">
            {money(Math.max(0, totals.due - totals.paid), org.currency)}
          </p>
          <p className="text-xs text-ink-600">{t("balance")}</p>
        </Card>
      </div>

      {adjustments.length === 0 ? (
        <EmptyState title={t("no_flats")} />
      ) : (
        <div className="space-y-3">
          {adjustments.map((a) => {
            const balance = Math.max(0, parseFloat(a.totalDue) - parseFloat(a.totalPaid));
            const tenant = tenantByFlat.get(a.flatId);
            const breakdown = (a as any).billBreakdown ?? {};
            const overrides = (a as any).categoryOverrides ?? {};

            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-ink-950">
                      {a.propertyName} · {a.flatName}
                    </p>
                    <p className="text-xs text-ink-600">
                      {a.floor}
                      {tenant ? ` · ${tenant.name}` : ` · ${t("vacant")}`}
                    </p>
                  </div>
                  <StatusPill status={a.status} labels={{ unpaid: t("unpaid"), partial: t("partial"), paid: t("fully_paid") }} />
                </div>

                <div className="mt-4 divide-y divide-ink-900/5 rounded-lg border border-ink-900/8">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-xs text-ink-600">{t("rent")}</span>
                    <span className="tabular text-sm font-medium text-ink-900">{money(a.rentAmount, org.currency)}</span>
                  </div>
                  {(["electricity", "water", "gas", "other"] as const).map((cat) => (
                    <CategoryRow
                      key={cat}
                      adjustmentId={a.id}
                      category={cat}
                      label={categoryLabels[cat]}
                      computedValue={breakdown[cat] ?? 0}
                      overrideValue={overrides[cat]}
                      currency={org.currency}
                      useMeterLabel={t("use_meter_value")}
                    />
                  ))}
                  {parseFloat(a.adjustmentAmount) !== 0 && (
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-xs text-ink-600">{t("adjustment")}</span>
                      <span className={`tabular text-sm font-medium ${parseFloat(a.adjustmentAmount) < 0 ? "text-clay-500" : "text-ink-900"}`}>
                        {money(a.adjustmentAmount, org.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between bg-ink-900/[0.03] px-2 py-2">
                    <span className="text-xs font-semibold text-ink-800">{t("total_due")}</span>
                    <span className="tabular text-base font-semibold text-ink-950">{money(a.totalDue, org.currency)}</span>
                  </div>
                </div>

                {a.adjustmentNote && <p className="mt-2 text-xs italic text-ink-600">"{a.adjustmentNote}"</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="mr-auto">
                    <p className="text-[11px] text-ink-600">{t("paid")}: <span className="tabular font-medium text-okay">{money(a.totalPaid, org.currency)}</span></p>
                    <p className="text-xs">
                      <span className="text-ink-600">{t("balance")}: </span>
                      <span className={`tabular font-semibold ${balance > 0 ? "text-clay-500" : "text-okay"}`}>
                        {money(balance, org.currency)}
                      </span>
                    </p>
                  </div>
                  <Modal
                    title={t("discount_or_extra")}
                    trigger={
                      <Button variant="ghost" className="!px-3 !py-1.5 text-xs">
                        <Icon path={paths.edit} className="h-3.5 w-3.5" />
                        {t("adjustment")}
                      </Button>
                    }
                  >
                    <form action={setManualAdjustment.bind(null, a.id)} className="space-y-4">
                      <Field label={t("discount_or_extra")} hint="e.g. -500 for a discount, 1000 for arrears">
                        <Input name="adjustmentAmount" type="number" step="0.01" defaultValue={a.adjustmentAmount} />
                      </Field>
                      <Field label={t("note")}>
                        <Input name="adjustmentNote" defaultValue={a.adjustmentNote ?? ""} />
                      </Field>
                      <Button type="submit" className="w-full">
                        {t("save")}
                      </Button>
                    </form>
                  </Modal>
                  <Modal
                    title={t("add_payment")}
                    trigger={
                      <Button variant="primary" className="!px-3 !py-1.5 text-xs">
                        <Icon path={paths.wallet} className="h-3.5 w-3.5" />
                        {t("add_payment")}
                      </Button>
                    }
                  >
                    <PaymentForm
                      flatId={a.flatId}
                      tenantId={tenant?.id}
                      adjustmentId={a.id}
                      balance={balance}
                      labels={{
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
                      }}
                    />
                  </Modal>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

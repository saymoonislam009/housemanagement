import { getOrgContext, getExpensesForOrg, getPropertiesWithFlats } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Select, Textarea, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { CloseOnSuccess } from "@/components/CloseOnSuccess";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createExpense, deleteExpense } from "@/lib/actions/expenses";
import { money, shortDate } from "@/lib/format";

export default async function ExpensesPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const [expenses, properties] = await Promise.all([getExpensesForOrg(org.id), getPropertiesWithFlats(org.id)]);

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div>
      <PageHeader
        title={t("expenses_title")}
        sub={t("expenses_sub")}
        action={
          <Modal title={t("add_expense")} trigger={<Button variant="primary">{t("add_expense")}</Button>}>
            <form action={createExpense} className="space-y-4">
              <Field label={t("category")}>
                <Input name="category" required placeholder="Maintenance, Repairs, Staff…" />
              </Field>
              <Field label={`${t("properties_title")} (${t("optional")})`}>
                <Select name="propertyId" defaultValue="">
                  <option value="">—</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("amount")}>
                <Input name="amount" type="number" step="0.01" min="0.01" required />
              </Field>
              <Field label={t("spent_on")}>
                <Input name="spentOn" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label={t("note")}>
                <Textarea name="note" rows={2} />
              </Field>
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
              <CloseOnSuccess />
            </form>
          </Modal>
        }
      />

      <Card className="mb-4 !p-4 inline-flex items-center gap-2">
        <span className="text-xs text-ink-600">{t("total")}: </span>
        <span className="tabular font-display text-lg font-semibold text-ink-950">{money(total, org.currency)}</span>
      </Card>

      {expenses.length === 0 ? (
        <EmptyState title={t("no_expenses")} />
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <Card key={e.id} className="flex items-center justify-between !p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{e.category}</p>
                <p className="text-xs text-ink-600">
                  {shortDate(e.spentOn, dLocale)}
                  {e.propertyName ? ` · ${e.propertyName}` : ""}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tabular font-semibold text-clay-500">-{money(e.amount, org.currency)}</span>
                <ConfirmDeleteButton action={deleteExpense.bind(null, e.id)} confirmText={t("confirm_delete")} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

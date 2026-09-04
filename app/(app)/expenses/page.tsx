import { getOrgContext, getExpensesForOrg, getPropertiesWithFlats } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { ExpenseForm } from "@/components/ExpenseForm";
import { deleteExpense } from "@/lib/actions/expenses";
import { money, shortDate } from "@/lib/format";
import { Icon, paths } from "@/components/icons";

export default async function ExpensesPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const [expenses, properties] = await Promise.all([getExpensesForOrg(org.id), getPropertiesWithFlats(org.id)]);

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const formLabels = {
    category: t("category"),
    properties: t("properties_title"),
    optional: t("optional"),
    amount: t("amount"),
    spentOn: t("spent_on"),
    note: t("note"),
    save: t("save"),
  };

  return (
    <div>
      <PageHeader
        title={t("expenses_title")}
        sub={t("expenses_sub")}
        action={
          <Modal title={t("add_expense")} trigger={<Button variant="primary">{t("add_expense")}</Button>}>
            <ExpenseForm properties={properties} labels={formLabels} />
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
              <div className="flex shrink-0 items-center gap-2">
                <span className="tabular font-semibold text-clay-500">-{money(e.amount, org.currency)}</span>
                <Modal
                  title={t("edit")}
                  trigger={
                    <button className="rounded-lg p-1.5 text-ink-600/50 hover:bg-ink-900/5">
                      <Icon path={paths.edit} className="h-4 w-4" />
                    </button>
                  }
                >
                  <ExpenseForm
                    expenseId={e.id}
                    properties={properties}
                    defaultCategory={e.category}
                    defaultPropertyId={e.propertyId}
                    defaultAmount={e.amount}
                    defaultSpentOn={e.spentOn}
                    defaultNote={e.note}
                    labels={formLabels}
                  />
                </Modal>
                <ConfirmDeleteButton action={deleteExpense.bind(null, e.id)} confirmText={t("confirm_delete")} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { getOrgContext, getMetersForOrg, getPropertiesWithFlats, getPreviousReadingValue, getReadingForMonth, getReadingHistory } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Select, Button, EmptyState, StatusPill } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { CloseOnSuccess } from "@/components/CloseOnSuccess";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { createMeter, updateMeter, deleteMeter, deleteReading } from "@/lib/actions/meters";
import { ReadingForm } from "@/components/ReadingForm";
import { AllocationAdvanced } from "@/components/AllocationAdvanced";
import { Icon, paths } from "@/components/icons";
import { money, firstOfMonth, monthLabel, shortDate } from "@/lib/format";

const typeIcon: Record<string, string> = {
  electricity: paths.zap,
  water: paths.droplet,
  gas: paths.flame,
  pump: paths.droplet,
  other: paths.gauge,
};

export default async function MetersPage() {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const month = firstOfMonth();

  const [meters, properties] = await Promise.all([getMetersForOrg(org.id), getPropertiesWithFlats(org.id)]);
  const flatOptions = properties.flatMap((p) => p.flats.map((f) => ({ ...f, propertyName: p.name, propertyId: p.id })));

  const meterCards = await Promise.all(
    meters.map(async (m) => {
      const [prevReading, thisMonth, history] = await Promise.all([
        getPreviousReadingValue(m.id, month, m.startingReading),
        getReadingForMonth(m.id, month),
        getReadingHistory(m.id, 4),
      ]);
      return { meter: m, prevReading, thisMonth, history };
    })
  );

  return (
    <div>
      <PageHeader
        title={t("meters_title")}
        sub={t("meters_sub")}
        action={
          <Modal title={t("add_meter")} trigger={<Button variant="primary">{t("add_meter")}</Button>}>
            <form action={createMeter} className="space-y-4">
              <Field label={t("properties_title")}>
                <Select name="propertyId" required defaultValue="">
                  <option value="" disabled>
                    {t("properties_title")}
                  </option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`${t("select_flat")} (${t("optional")} — ${t("shared_meter")})`}>
                <Select name="flatId" defaultValue="">
                  <option value="">{t("shared_meter")} (e.g. pump)</option>
                  {flatOptions.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.propertyName} · {f.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("meter_type")}>
                <Select name="type" defaultValue="electricity">
                  <option value="electricity">{t("electricity")}</option>
                  <option value="water">{t("water")}</option>
                  <option value="gas">{t("gas")}</option>
                  <option value="pump">{t("pump")}</option>
                  <option value="other">{t("other")}</option>
                </Select>
              </Field>
              <Field label={t("meter_label")}>
                <Input name="label" required placeholder="Electricity - 3B" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("unit_rate")}>
                  <Input name="unitRate" type="number" step="0.0001" min="0" defaultValue={(org.settings as any)?.defaultUnitRate ?? 0} />
                </Field>
                <Field label={t("meter_charge")}>
                  <Input name="meterCharge" type="number" step="0.01" min="0" defaultValue={(org.settings as any)?.defaultMeterCharge ?? 0} />
                </Field>
                <Field label={t("other_charge")}>
                  <Input name="otherCharge" type="number" step="0.01" min="0" defaultValue={(org.settings as any)?.defaultOtherCharge ?? 0} />
                </Field>
              </div>
              <Field label={t("starting_reading")}>
                <Input name="startingReading" type="number" step="0.01" min="0" defaultValue="0" />
              </Field>
              <AllocationAdvanced
                labels={{
                  advanced: t("more_settings"),
                  allocation: "Shared cost handling",
                  ownerExpense: "Owner expense (don't bill tenants)",
                  equalSplit: "Split equally across flats",
                  hint: "Only applies to shared meters like a water pump",
                }}
              />
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
              <CloseOnSuccess />
            </form>
          </Modal>
        }
      />

      {meterCards.length === 0 ? (
        <EmptyState title={t("no_meters_yet")} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {meterCards.map(({ meter: m, prevReading, thisMonth, history }) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brass-400/20 text-brass-600">
                    <Icon path={typeIcon[m.type] ?? paths.gauge} className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink-950">{m.label}</h3>
                    <p className="text-xs text-ink-600">
                      {m.property?.name}
                      {m.flat ? ` · ${m.flat.name}` : ` · ${t("shared_meter")}`}
                      {!m.flat && (
                        <span className="ml-1.5 rounded-full bg-ink-900/8 px-1.5 py-0.5 text-[10px] font-medium text-ink-700">
                          {m.allocationMethod === "equal_split" ? "Split across flats" : "Owner expense"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Modal
                    title={t("edit")}
                    trigger={
                      <button className="rounded-lg p-1.5 text-ink-600/50 hover:bg-ink-900/5">
                        <Icon path={paths.edit} className="h-4 w-4" />
                      </button>
                    }
                  >
                    <form action={updateMeter.bind(null, m.id)} className="space-y-4">
                      <Field label={t("meter_label")}>
                        <Input name="label" defaultValue={m.label} required />
                      </Field>
                      <Field label={t("meter_type")}>
                        <Select name="type" defaultValue={m.type}>
                          <option value="electricity">{t("electricity")}</option>
                          <option value="water">{t("water")}</option>
                          <option value="gas">{t("gas")}</option>
                          <option value="pump">{t("pump")}</option>
                          <option value="other">{t("other")}</option>
                        </Select>
                      </Field>
                      <div className="grid grid-cols-3 gap-3">
                        <Field label={t("unit_rate")}>
                          <Input name="unitRate" type="number" step="0.0001" min="0" defaultValue={m.unitRate} />
                        </Field>
                        <Field label={t("meter_charge")}>
                          <Input name="meterCharge" type="number" step="0.01" min="0" defaultValue={m.meterCharge} />
                        </Field>
                        <Field label={t("other_charge")}>
                          <Input name="otherCharge" type="number" step="0.01" min="0" defaultValue={m.otherCharge} />
                        </Field>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-ink-800">
                        <input type="checkbox" name="active" defaultChecked={m.active} className="h-4 w-4 rounded border-ink-900/20" />
                        {t("status_active")}
                      </label>
                      {!m.flat && (
                        <Field label="Shared cost handling" hint="How this shared meter's cost affects tenant bills">
                          <Select name="allocationMethod" defaultValue={m.allocationMethod}>
                            <option value="owner_expense">Owner expense (don't bill tenants)</option>
                            <option value="equal_split">Split equally across flats</option>
                          </Select>
                        </Field>
                      )}
                      <Button type="submit" className="w-full">
                        {t("save")}
                      </Button>
                      <CloseOnSuccess />
                    </form>
                  </Modal>
                  <ConfirmDeleteButton action={deleteMeter.bind(null, m.id)} confirmText={t("confirm_delete")} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-ink-900/[0.03] p-3 text-center">
                <div>
                  <p className="tabular text-sm font-semibold text-ink-900">{prevReading}</p>
                  <p className="text-[11px] text-ink-600">{t("previous_reading")}</p>
                </div>
                <div>
                  <p className="tabular text-sm font-semibold text-ink-900">{money(m.unitRate, org.currency)}</p>
                  <p className="text-[11px] text-ink-600">{t("unit_rate")}</p>
                </div>
                <div>
                  <p className="tabular text-sm font-semibold text-ink-900">
                    {thisMonth ? money(thisMonth.amount, org.currency) : "—"}
                  </p>
                  <p className="text-[11px] text-ink-600">{t("this_month")}</p>
                </div>
              </div>

              <div className="mt-4">
                <Modal
                  title={`${t("record_reading")} — ${monthLabel(month, dLocale)}`}
                  trigger={
                    <Button variant="subtle" className="w-full">
                      <Icon path={paths.gauge} className="h-4 w-4" />
                      {thisMonth ? t("edit") : t("record")} · {monthLabel(month, dLocale)}
                    </Button>
                  }
                >
                  <ReadingForm
                    meterId={m.id}
                    month={month}
                    previousReading={prevReading}
                    unitRate={parseFloat(m.unitRate)}
                    meterCharge={thisMonth ? parseFloat(thisMonth.meterCharge) : parseFloat(m.meterCharge)}
                    otherCharge={thisMonth ? parseFloat(thisMonth.otherCharge) : parseFloat(m.otherCharge)}
                    existingCurrent={thisMonth ? parseFloat(thisMonth.currentReading) : undefined}
                    currency={org.currency}
                    labels={{
                      previous_reading: t("previous_reading"),
                      current_reading: t("current_reading"),
                      meter_charge: t("meter_charge"),
                      other_charge: t("other_charge"),
                      note: t("note"),
                      units_used: t("units_used"),
                      amount: t("amount"),
                      save: t("save"),
                    }}
                  />
                </Modal>
              </div>

              {history.length > 0 && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-xs font-medium text-ink-600 hover:text-ink-900">
                    {t("history")} ({history.length})
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink-600">{monthLabel(h.month, dLocale)}</span>
                        <span className="tabular text-ink-700">
                          {h.previousReading} → {h.currentReading} ({h.unitsUsed} u)
                        </span>
                        <span className="tabular font-medium text-ink-900">{money(h.amount, org.currency)}</span>
                        <ConfirmDeleteButton
                          action={deleteReading.bind(null, h.id, m.id, h.month)}
                          confirmText={t("confirm_delete")}
                          className="rounded p-1 text-ink-600/40 hover:bg-clay-500/10 hover:text-clay-500"
                          iconClassName="h-3 w-3"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

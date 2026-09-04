import { getOrgContext, getMetersForOrg, getPropertiesWithFlats, getPreviousReadingValue, getReadingForMonth, getReadingHistory } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Button, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteMeter, deleteReading } from "@/lib/actions/meters";
import { MeterForm } from "@/components/MeterForm";
import { ReadingForm } from "@/components/ReadingForm";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { Icon, paths } from "@/components/icons";
import { money, firstOfMonth, monthLabel } from "@/lib/format";

const typeIcon: Record<string, string> = {
  electricity: paths.zap,
  water: paths.droplet,
  gas: paths.flame,
  pump: paths.droplet,
  other: paths.gauge,
};

export default async function MetersPage({ searchParams }: { searchParams: { month?: string } }) {
  const { org } = await getOrgContext();
  const t = getDict();
  const dLocale = org.language === "bn" ? "bn-BD" : "en-US";
  const month = searchParams.month || firstOfMonth();

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

  const meterFormLabels = {
    property: t("properties_title"),
    selectFlat: t("select_flat"),
    optional: t("optional"),
    sharedMeter: t("shared_meter"),
    type: t("meter_type"),
    electricity: t("electricity"),
    water: t("water"),
    gas: t("gas"),
    pump: t("pump"),
    other: t("other"),
    label: t("meter_label"),
    unitRate: t("unit_rate"),
    meterCharge: t("meter_charge"),
    otherCharge: t("other_charge"),
    startingReading: t("starting_reading"),
    active: t("status_active"),
    save: t("save"),
  };

  return (
    <div>
      <PageHeader
        title={t("meters_title")}
        sub={t("meters_sub")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MonthSwitcher month={month} locale={org.language} />
            <Modal title={t("add_meter")} trigger={<Button variant="primary">{t("add_meter")}</Button>}>
              <MeterForm
                properties={properties}
                flatOptions={flatOptions}
                defaultValues={{
                  defaultUnitRate: (org.settings as any)?.defaultUnitRate ?? 0,
                  defaultMeterCharge: (org.settings as any)?.defaultMeterCharge ?? 0,
                  defaultOtherCharge: (org.settings as any)?.defaultOtherCharge ?? 0,
                }}
                labels={meterFormLabels}
              />
            </Modal>
          </div>
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
                    <MeterForm
                      meterId={m.id}
                      defaultValues={{
                        flatId: m.flatId,
                        type: m.type,
                        label: m.label,
                        unitRate: m.unitRate,
                        meterCharge: m.meterCharge,
                        otherCharge: m.otherCharge,
                        allocationMethod: m.allocationMethod,
                        active: m.active,
                      }}
                      labels={meterFormLabels}
                    />
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

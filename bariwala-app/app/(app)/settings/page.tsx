import { getOrgContext } from "@/lib/queries";
import { getDict } from "@/lib/i18n";
import { PageHeader, Card, Field, Input, Select, Button } from "@/components/ui";
import { updateOrgSettings, updateBillingDefaults, setLanguage } from "@/lib/actions/settings";

export default async function SettingsPage() {
  const { org, session } = await getOrgContext();
  const t = getDict();

  return (
    <div>
      <PageHeader title={t("settings_title")} sub={t("settings_sub")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink-800">{t("profile")}</h2>
          <form action={updateOrgSettings} className="space-y-4">
            <Field label={t("business_name")}>
              <Input name="name" defaultValue={org.name} required />
            </Field>
            <Field label={t("your_name")}>
              <Input value={session.name} disabled className="bg-ink-900/5" />
            </Field>
            <Field label={t("email")}>
              <Input value={session.email} disabled className="bg-ink-900/5" />
            </Field>
            <Field label="Currency">
              <Select name="currency" defaultValue={org.currency}>
                <option value="BDT">BDT (৳)</option>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </Select>
            </Field>
            <Button type="submit">{t("save_changes")}</Button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink-800">{t("language")}</h2>
          <p className="mb-4 text-sm text-ink-600">
            {org.language === "en" ? "Currently: English" : "বর্তমানে: বাংলা"}
          </p>
          <div className="flex gap-2">
            <form action={async () => { "use server"; await setLanguage("en"); }}>
              <Button variant={org.language === "en" ? "primary" : "ghost"} type="submit">
                English
              </Button>
            </form>
            <form action={async () => { "use server"; await setLanguage("bn"); }}>
              <Button variant={org.language === "bn" ? "primary" : "ghost"} type="submit">
                বাংলা
              </Button>
            </form>
          </div>

          <div className="mt-8 border-t border-ink-900/8 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-ink-800">{t("default_rates")}</h3>
            <p className="mb-4 text-sm text-ink-600">
              Pre-fills new meters so you're not typing the same rate every time. Each meter can still be
              adjusted individually under <span className="font-medium text-ink-800">{t("nav_meters")}</span>.
            </p>
            <form action={updateBillingDefaults} className="grid grid-cols-3 gap-3">
              <Field label={t("unit_rate")}>
                <Input name="defaultUnitRate" type="number" step="0.0001" min="0" defaultValue={(org.settings as any)?.defaultUnitRate ?? 0} />
              </Field>
              <Field label={t("meter_charge")}>
                <Input name="defaultMeterCharge" type="number" step="0.01" min="0" defaultValue={(org.settings as any)?.defaultMeterCharge ?? 0} />
              </Field>
              <Field label={t("other_charge")}>
                <Input name="defaultOtherCharge" type="number" step="0.01" min="0" defaultValue={(org.settings as any)?.defaultOtherCharge ?? 0} />
              </Field>
              <div className="col-span-3">
                <Button type="submit">{t("save_changes")}</Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

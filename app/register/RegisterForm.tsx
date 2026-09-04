"use client";

import { useFormState, useFormStatus } from "react-dom";
import { registerAction } from "@/lib/actions/auth";
import { Field, Input, Button } from "@/components/ui";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/dictionaries";
import { dictionaries } from "@/lib/i18n/dictionaries";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const t = (k: keyof typeof dictionaries.en) => dictionaries[locale][k];
  const [state, formAction] = useFormState(registerAction, null);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink-950">{t("register_title")}</h1>
      <p className="mt-1 text-sm text-ink-600">{t("register_sub")}</p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label={t("org_name")}>
          <Input name="orgName" required />
        </Field>
        <Field label={t("your_name")}>
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label={t("email")}>
          <Input type="email" name="email" required autoComplete="email" />
        </Field>
        <Field label={t("password")}>
          <Input type="password" name="password" required autoComplete="new-password" minLength={6} />
        </Field>
        <Field label={t("confirm_password")}>
          <Input type="password" name="confirm" required autoComplete="new-password" minLength={6} />
        </Field>
        {state?.error && <p className="text-sm text-clay-500">{state.error}</p>}
        <SubmitButton label={t("create_account")} />
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        {t("have_account")}{" "}
        <Link href="/login" className="font-medium text-brass-600 hover:underline">
          {t("login_link")}
        </Link>
      </p>
    </>
  );
}

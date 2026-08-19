"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/lib/actions/auth";
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

export function LoginForm({ locale }: { locale: Locale }) {
  const t = (k: keyof typeof dictionaries.en) => dictionaries[locale][k];
  const [state, formAction] = useFormState(loginAction, null);

  return (
    <>
      <h1 className="font-display text-2xl font-semibold text-ink-950">{t("login_title")}</h1>
      <p className="mt-1 text-sm text-ink-600">{t("login_sub")}</p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label={t("email")}>
          <Input type="email" name="email" required autoComplete="email" />
        </Field>
        <Field label={t("password")}>
          <Input type="password" name="password" required autoComplete="current-password" />
        </Field>
        {state?.error && <p className="text-sm text-clay-500">{state.error}</p>}
        <SubmitButton label={t("log_in")} />
      </form>

      <p className="mt-5 text-center text-sm text-ink-600">
        {t("no_account")}{" "}
        <Link href="/register" className="font-medium text-brass-600 hover:underline">
          {t("register_link")}
        </Link>
      </p>
    </>
  );
}

import { AuthShell } from "@/components/AuthShell";
import { RegisterForm } from "./RegisterForm";
import { getLocale } from "@/lib/i18n";

export default function RegisterPage() {
  const locale = getLocale();
  return (
    <AuthShell>
      <RegisterForm locale={locale} />
    </AuthShell>
  );
}

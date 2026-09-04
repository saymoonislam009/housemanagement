import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";
import { getLocale } from "@/lib/i18n";

export default function LoginPage() {
  const locale = getLocale();
  return (
    <AuthShell>
      <LoginForm locale={locale} />
    </AuthShell>
  );
}

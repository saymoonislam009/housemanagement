import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireOrg() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function num(formData: FormData, key: string, fallback = 0): number {
  const v = formData.get(key);
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

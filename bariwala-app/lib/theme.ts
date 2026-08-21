import { cookies } from "next/headers";

export const THEME_COOKIE = "bariwala_theme";
export type Theme = "light" | "dark";

export function getTheme(): Theme {
  const c = cookies().get(THEME_COOKIE)?.value;
  return c === "dark" ? "dark" : "light";
}

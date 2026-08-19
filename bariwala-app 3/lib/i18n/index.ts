import { cookies } from "next/headers";
import { dictionaries, type Locale, type DictKey } from "./dictionaries";

export const LOCALE_COOKIE = "bariwala_lang";

export function getLocale(): Locale {
  const c = cookies().get(LOCALE_COOKIE)?.value;
  return c === "bn" ? "bn" : "en";
}

export function getDict(locale?: Locale) {
  const l = locale ?? getLocale();
  const dict = dictionaries[l];
  return (key: DictKey) => dict[key] ?? dictionaries.en[key] ?? key;
}

export { dictionaries };
export type { Locale, DictKey };

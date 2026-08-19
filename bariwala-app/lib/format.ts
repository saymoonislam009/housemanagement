export function money(amount: number | string, currency = "BDT") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = currency === "BDT" ? "৳" : currency;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(n || 0));
  return `${n < 0 ? "-" : ""}${symbol}${formatted}`;
}

export function monthLabel(dateStr: string, locale = "en-US") {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export function shortDate(dateStr: string | Date, locale = "en-US") {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export function firstOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function monthOffset(monthStr: string, offset: number) {
  const d = new Date(monthStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
}

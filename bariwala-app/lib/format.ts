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

// A flat's currently-assigned tenant shouldn't be shown as "the tenant" for months
// before they actually moved in (this was previously causing a newly-added tenant
// to appear as if they occupied the flat retroactively, in every past month).
export function tenantAppliesToMonth(moveInDate: string | null, month: string): boolean {
  if (!moveInDate) return true; // no move-in date on file — can't judge, so don't hide them
  const startOfNextMonth = monthOffset(month, 1);
  return moveInDate < startOfNextMonth;
}

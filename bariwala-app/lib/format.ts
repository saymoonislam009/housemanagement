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

export function timeAgo(date: Date | string, locale = "en-US") {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return locale.startsWith("bn") ? "এইমাত্র" : "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return locale.startsWith("bn") ? `${minutes} মিনিট আগে` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return locale.startsWith("bn") ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return locale.startsWith("bn") ? `${days} দিন আগে` : `${days}d ago`;
  return shortDate(d, locale);
}

// Builds a wa.me deep link with a pre-filled message. Normalizes common BD phone
// formats (leading 0, or already-international) into the +880 form WhatsApp needs.
export function whatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  let intl = digits;
  if (digits.startsWith("880")) intl = digits;
  else if (digits.startsWith("0")) intl = "880" + digits.slice(1);
  else if (digits.length === 10) intl = "880" + digits; // e.g. 1712345678
  else return null; // not recognizable enough to risk sending to the wrong number
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function firstOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function monthOffset(monthStr: string, offset: number) {
  const d = new Date(monthStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
}

// Did this tenant's stay actually overlap this calendar month at all? Used to
// resolve which tenant (if any) a flat's bill for a given month belongs to —
// a flat can have several tenants over its lifetime, and each month's bill
// should show whoever was actually living there that month, not just whoever
// the flat's "current" tenant happens to be today.
export function occupiedMonth(
  moveInDate: string | null,
  moveOutDate: string | null,
  month: string
): boolean {
  const startOfNextMonth = monthOffset(month, 1);
  const movedInBeforeMonthEnded = !moveInDate || moveInDate < startOfNextMonth;
  const stillTherePartOfMonth = !moveOutDate || moveOutDate >= month;
  return movedInBeforeMonthEnded && stillTherePartOfMonth;
}

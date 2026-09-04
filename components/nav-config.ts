import { paths } from "./icons";
import type { DictKey } from "@/lib/i18n/dictionaries";

// Grouped per spec #30: Home / House (flats+tenants) / Accounts (bills+payments) /
// Meters / Expenses / More (reports, settings).
export const NAV_ITEMS: { href: string; key: DictKey; icon: string }[] = [
  { href: "/dashboard", key: "nav_dashboard", icon: paths.home },
  { href: "/properties", key: "nav_properties", icon: paths.building },
  { href: "/tenants", key: "nav_tenants", icon: paths.users },
  { href: "/bills", key: "nav_bills", icon: paths.receipt },
  { href: "/history", key: "nav_history", icon: paths.calendar },
  { href: "/payments", key: "nav_payments", icon: paths.wallet },
  { href: "/meters", key: "nav_meters", icon: paths.gauge },
  { href: "/expenses", key: "nav_expenses", icon: paths.chart },
  { href: "/notes", key: "nav_notes", icon: paths.receipt },
  { href: "/reports", key: "nav_reports", icon: paths.chart },
  { href: "/settings", key: "nav_settings", icon: paths.settings },
];

// Bottom tab bar on mobile: Home | House | Bills | Payments | More (spec #30 example).
export const MOBILE_PRIMARY = ["/dashboard", "/properties", "/bills", "/payments"];

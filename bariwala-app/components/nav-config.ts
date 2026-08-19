import { paths } from "./icons";
import type { DictKey } from "@/lib/i18n/dictionaries";

export const NAV_ITEMS: { href: string; key: DictKey; icon: string }[] = [
  { href: "/dashboard", key: "nav_dashboard", icon: paths.home },
  { href: "/properties", key: "nav_properties", icon: paths.building },
  { href: "/tenants", key: "nav_tenants", icon: paths.users },
  { href: "/meters", key: "nav_meters", icon: paths.gauge },
  { href: "/bills", key: "nav_bills", icon: paths.receipt },
  { href: "/payments", key: "nav_payments", icon: paths.wallet },
  { href: "/expenses", key: "nav_expenses", icon: paths.chart },
  { href: "/reports", key: "nav_reports", icon: paths.chart },
  { href: "/settings", key: "nav_settings", icon: paths.settings },
];

export const MOBILE_PRIMARY = ["/dashboard", "/properties", "/tenants", "/bills"];

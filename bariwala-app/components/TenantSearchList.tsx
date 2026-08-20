"use client";

import { useMemo, useState } from "react";
import { Icon, paths } from "./icons";
import { Card } from "./ui";
import { money } from "@/lib/format";
import Link from "next/link";

type Tenant = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  flatName: string;
  floor: string;
  propertyName: string;
  rentAmount: string;
};

export function TenantSearchList({
  tenants,
  currency,
  labels,
}: {
  tenants: Tenant[];
  currency: string;
  labels: { search: string; active: string; inactive: string };
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.flatName.toLowerCase().includes(q) ||
        (t.phone ?? "").includes(q) ||
        t.propertyName.toLowerCase().includes(q)
    );
  }, [tenants, query]);

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Icon path={paths.search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.search}
          className="w-full rounded-lg border border-ink-900/15 bg-paper-50 py-2 pl-9 pr-3 text-sm focus:border-brass-600 focus:outline-none focus:ring-2 focus:ring-brass-400/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-600">No matches.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tn) => (
            <Card key={tn.id} className="relative">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/8 font-display text-sm font-semibold text-ink-800">
                  {tn.name.slice(0, 1).toUpperCase()}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    tn.active ? "bg-okay/15 text-okay" : "bg-ink-900/8 text-ink-600"
                  }`}
                >
                  {tn.active ? labels.active : labels.inactive}
                </span>
              </div>
              <Link href={`/tenants/${tn.id}`} className="absolute inset-0 z-0" aria-label={tn.name} />
              <h3 className="mt-3 font-display text-base font-semibold text-ink-950">{tn.name}</h3>
              <p className="text-xs text-ink-600">
                {tn.propertyName} · {tn.flatName} ({tn.floor})
              </p>
              {tn.phone && <p className="mt-2 text-sm text-ink-700">📞 {tn.phone}</p>}
              <p className="tabular mt-2 text-sm font-medium text-ink-900">{money(tn.rentAmount, currency)}/mo</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

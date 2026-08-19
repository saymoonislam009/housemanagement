"use client";

import { useRouter } from "next/navigation";
import { Select } from "./ui";

export function FlatFilter({
  flats,
  value,
  allLabel,
}: {
  flats: { id: string; name: string; propertyName: string }[];
  value: string;
  allLabel: string;
}) {
  const router = useRouter();
  return (
    <Select
      defaultValue={value}
      className="max-w-xs"
      onChange={(e) => {
        const v = e.target.value;
        router.push(v ? `?flat=${v}` : "?");
      }}
    >
      <option value="">{allLabel}</option>
      {flats.map((f) => (
        <option key={f.id} value={f.id}>
          {f.propertyName} · {f.name}
        </option>
      ))}
    </Select>
  );
}

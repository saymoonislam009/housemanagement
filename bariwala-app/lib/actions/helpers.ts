import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { flats, properties, tenants, meters, monthlyAdjustments, payments, expenses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requireOrg() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export function num(formData: FormData, key: string, fallback = 0): number {
  const v = formData.get(key);
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? round2(n) : fallback;
}

export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Round to 2 decimal places to avoid floating-point drift in money math (spec #46).
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------- Ownership guards (spec #47) ----------
// Every mutating action must confirm the record belongs to the caller's organization
// before touching it — never trust an ID from the request alone.

export class OwnershipError extends Error {
  constructor() {
    super("NOT_FOUND_OR_FORBIDDEN");
  }
}

export async function assertOrgOwnsProperty(orgId: string, propertyId: string) {
  const row = await db.query.properties.findFirst({ where: eq(properties.id, propertyId) });
  if (!row || row.orgId !== orgId) throw new OwnershipError();
  return row;
}

export async function assertOrgOwnsFlat(orgId: string, flatId: string) {
  const flat = await db.query.flats.findFirst({ where: eq(flats.id, flatId) });
  if (!flat) throw new OwnershipError();
  const property = await db.query.properties.findFirst({ where: eq(properties.id, flat.propertyId) });
  if (!property || property.orgId !== orgId) throw new OwnershipError();
  return flat;
}

export async function assertOrgOwnsTenant(orgId: string, tenantId: string) {
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new OwnershipError();
  await assertOrgOwnsFlat(orgId, tenant.flatId);
  return tenant;
}

export async function assertOrgOwnsMeter(orgId: string, meterId: string) {
  const meter = await db.query.meters.findFirst({ where: eq(meters.id, meterId) });
  if (!meter || meter.orgId !== orgId) throw new OwnershipError();
  return meter;
}

export async function assertOrgOwnsAdjustment(orgId: string, adjustmentId: string) {
  const adj = await db.query.monthlyAdjustments.findFirst({ where: eq(monthlyAdjustments.id, adjustmentId) });
  if (!adj || adj.orgId !== orgId) throw new OwnershipError();
  return adj;
}

export async function assertOrgOwnsPayment(orgId: string, paymentId: string) {
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, paymentId) });
  if (!payment || payment.orgId !== orgId) throw new OwnershipError();
  return payment;
}

export async function assertOrgOwnsExpense(orgId: string, expenseId: string) {
  const expense = await db.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
  if (!expense || expense.orgId !== orgId) throw new OwnershipError();
  return expense;
}

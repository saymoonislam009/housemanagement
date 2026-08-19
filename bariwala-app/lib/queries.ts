import { db } from "@/db";
import { organizations, notifications } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getOrgContext() {
  const session = await getSession();
  if (!session) redirect("/login");
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, session.orgId) });
  if (!org) redirect("/login");
  return { session, org };
}

export async function getNotifications(orgId: string, limit = 15) {
  return db.query.notifications.findMany({
    where: eq(notifications.orgId, orgId),
    orderBy: desc(notifications.createdAt),
    limit,
  });
}

export async function getUnreadCount(orgId: string) {
  const rows = await db.query.notifications.findMany({
    where: and(eq(notifications.orgId, orgId), eq(notifications.read, false)),
  });
  return rows.length;
}

// ---------- Domain queries ----------
import { properties, flats, tenants, meters, meterReadings, monthlyAdjustments, payments, expenses } from "@/db/schema";

export async function getPropertiesWithFlats(orgId: string) {
  const props = await db.query.properties.findMany({
    where: eq(properties.orgId, orgId),
    orderBy: desc(properties.createdAt),
    with: { flats: { orderBy: (f, { asc }) => asc(f.name) } },
  });
  return props;
}

export async function getProperty(orgId: string, propertyId: string) {
  const prop = await db.query.properties.findFirst({
    where: and(eq(properties.id, propertyId), eq(properties.orgId, orgId)),
    with: { flats: { orderBy: (f, { asc }) => asc(f.name), with: { tenants: true } } },
  });
  return prop;
}

export async function getFlatsForOrg(orgId: string) {
  return db
    .select({
      id: flats.id,
      name: flats.name,
      floor: flats.floor,
      rentAmount: flats.rentAmount,
      active: flats.active,
      propertyId: flats.propertyId,
      propertyName: properties.name,
    })
    .from(flats)
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(eq(properties.orgId, orgId))
    .orderBy(properties.name, flats.name);
}

export async function getTenantsForOrg(orgId: string) {
  return db
    .select({
      id: tenants.id,
      name: tenants.name,
      phone: tenants.phone,
      email: tenants.email,
      nid: tenants.nid,
      moveInDate: tenants.moveInDate,
      active: tenants.active,
      flatId: tenants.flatId,
      flatName: flats.name,
      floor: flats.floor,
      propertyName: properties.name,
      rentAmount: flats.rentAmount,
    })
    .from(tenants)
    .innerJoin(flats, eq(flats.id, tenants.flatId))
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(eq(properties.orgId, orgId))
    .orderBy(desc(tenants.createdAt));
}

export async function getTenant(orgId: string, tenantId: string) {
  const rows = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      phone: tenants.phone,
      email: tenants.email,
      nid: tenants.nid,
      moveInDate: tenants.moveInDate,
      active: tenants.active,
      notes: tenants.notes,
      flatId: tenants.flatId,
      flatName: flats.name,
      floor: flats.floor,
      propertyName: properties.name,
      rentAmount: flats.rentAmount,
    })
    .from(tenants)
    .innerJoin(flats, eq(flats.id, tenants.flatId))
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(and(eq(tenants.id, tenantId), eq(properties.orgId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMetersForOrg(orgId: string) {
  const rows = await db.query.meters.findMany({
    where: eq(meters.orgId, orgId),
    with: { flat: true, property: true },
    orderBy: (m, { asc }) => asc(m.label),
  });
  return rows;
}

export async function getReadingForMonth(meterId: string, month: string) {
  return db.query.meterReadings.findFirst({
    where: and(eq(meterReadings.meterId, meterId), eq(meterReadings.month, month)),
  });
}

export async function getReadingHistory(meterId: string, limit = 12) {
  return db.query.meterReadings.findMany({
    where: eq(meterReadings.meterId, meterId),
    orderBy: desc(meterReadings.month),
    limit,
  });
}

export async function getAdjustmentsForMonth(orgId: string, month: string) {
  const rows = await db
    .select({
      id: monthlyAdjustments.id,
      flatId: monthlyAdjustments.flatId,
      month: monthlyAdjustments.month,
      rentAmount: monthlyAdjustments.rentAmount,
      billsAmount: monthlyAdjustments.billsAmount,
      adjustmentAmount: monthlyAdjustments.adjustmentAmount,
      adjustmentNote: monthlyAdjustments.adjustmentNote,
      totalDue: monthlyAdjustments.totalDue,
      totalPaid: monthlyAdjustments.totalPaid,
      status: monthlyAdjustments.status,
      flatName: flats.name,
      floor: flats.floor,
      propertyName: properties.name,
    })
    .from(monthlyAdjustments)
    .innerJoin(flats, eq(flats.id, monthlyAdjustments.flatId))
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .where(and(eq(monthlyAdjustments.orgId, orgId), eq(monthlyAdjustments.month, month)))
    .orderBy(properties.name, flats.name);
  return rows;
}

export async function getTenantsByFlatIds(flatIds: string[]) {
  if (flatIds.length === 0) return [];
  const rows = await db.query.tenants.findMany({ where: (t, { inArray }) => inArray(t.flatId, flatIds) });
  return rows;
}

export async function getPreviousReadingValue(meterId: string, month: string, startingReading: string) {
  const prior = await db.query.meterReadings.findMany({
    where: (r, { and, eq, lt }) => and(eq(r.meterId, meterId), lt(r.month, month)),
    orderBy: (r, { desc }) => desc(r.month),
    limit: 1,
  });
  if (prior.length) return parseFloat(prior[0].currentReading);
  return parseFloat(startingReading);
}
export async function getPaymentsForOrg(orgId: string, flatId?: string) {
  const rows = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      paidOn: payments.paidOn,
      note: payments.note,
      flatId: payments.flatId,
      flatName: flats.name,
      propertyName: properties.name,
      tenantId: payments.tenantId,
      tenantName: tenants.name,
    })
    .from(payments)
    .innerJoin(flats, eq(flats.id, payments.flatId))
    .innerJoin(properties, eq(properties.id, flats.propertyId))
    .leftJoin(tenants, eq(tenants.id, payments.tenantId))
    .where(flatId ? and(eq(payments.orgId, orgId), eq(payments.flatId, flatId)) : eq(payments.orgId, orgId))
    .orderBy(desc(payments.paidOn));
  return rows;
}

export async function getExpensesForOrg(orgId: string) {
  const rows = await db
    .select({
      id: expenses.id,
      category: expenses.category,
      amount: expenses.amount,
      note: expenses.note,
      spentOn: expenses.spentOn,
      propertyId: expenses.propertyId,
      propertyName: properties.name,
    })
    .from(expenses)
    .leftJoin(properties, eq(properties.id, expenses.propertyId))
    .where(eq(expenses.orgId, orgId))
    .orderBy(desc(expenses.spentOn));
  return rows;
}

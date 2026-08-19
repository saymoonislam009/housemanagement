import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  date,
  jsonb,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const roleEnum = pgEnum("role", ["owner", "staff"]);
export const meterTypeEnum = pgEnum("meter_type", [
  "electricity",
  "water",
  "gas",
  "pump",
  "other",
]);
export const meterScopeEnum = pgEnum("meter_scope", ["flat", "shared"]);
export const allocationMethodEnum = pgEnum("allocation_method", ["owner_expense", "equal_split"]);
export const adjustmentStatusEnum = pgEnum("adjustment_status", [
  "unpaid",
  "partial",
  "paid",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bkash",
  "nagad",
  "bank",
  "other",
]);

// ---------- Organizations (tenant/landlord account) ----------
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("BDT"),
  language: text("language").notNull().default("en"),
  settings: jsonb("settings").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("owner"),
    language: text("language").notNull().default("en"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  })
);

export const properties = pgTable("properties", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const flats = pgTable("flats", {
  id: text("id").primaryKey(),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "3B"
  floor: text("floor").notNull(), // e.g. "3rd Floor"
  rentAmount: numeric("rent_amount", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  flatId: text("flat_id")
    .notNull()
    .references(() => flats.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  nid: text("nid"),
  moveInDate: date("move_in_date"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A meter can belong to a flat (submeter) or be shared at the property level (pump, gate light, etc.)
export const meters = pgTable("meters", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: text("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  flatId: text("flat_id").references(() => flats.id, { onDelete: "cascade" }),
  scope: meterScopeEnum("scope").notNull().default("flat"),
  // Only meaningful for scope="shared" (spec #17): owner_expense keeps the cost purely
  // on the owner's side (default — safest, matches how it worked before this field
  // existed), equal_split divides the month's reading amount across the property's
  // active flats and folds each flat's share into that flat's bill.
  allocationMethod: allocationMethodEnum("allocation_method").notNull().default("owner_expense"),
  type: meterTypeEnum("type").notNull().default("electricity"),
  label: text("label").notNull(), // e.g. "Electricity - 3B" or "Water Pump"
  unitRate: numeric("unit_rate", { precision: 10, scale: 4 })
    .notNull()
    .default("0"), // taka per unit
  meterCharge: numeric("meter_charge", { precision: 10, scale: 2 })
    .notNull()
    .default("0"), // fixed demand/meter charge per month
  otherCharge: numeric("other_charge", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  startingReading: numeric("starting_reading", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const meterReadings = pgTable(
  "meter_readings",
  {
    id: text("id").primaryKey(),
    meterId: text("meter_id")
      .notNull()
      .references(() => meters.id, { onDelete: "cascade" }),
    month: date("month").notNull(), // first day of month
    previousReading: numeric("previous_reading", { precision: 12, scale: 2 }).notNull(),
    currentReading: numeric("current_reading", { precision: 12, scale: 2 }).notNull(),
    unitsUsed: numeric("units_used", { precision: 12, scale: 2 }).notNull(),
    meterCharge: numeric("meter_charge", { precision: 10, scale: 2 }).notNull().default("0"),
    otherCharge: numeric("other_charge", { precision: 10, scale: 2 }).notNull().default("0"),
    unitRate: numeric("unit_rate", { precision: 10, scale: 4 }).notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    meterMonthIdx: uniqueIndex("meter_readings_meter_month_idx").on(t.meterId, t.month),
  })
);

// One row per flat per month: aggregates rent + allocated bills, tracks payment status
export const monthlyAdjustments = pgTable(
  "monthly_adjustments",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    flatId: text("flat_id")
      .notNull()
      .references(() => flats.id, { onDelete: "cascade" }),
    month: date("month").notNull(),
    rentAmount: numeric("rent_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    billsAmount: numeric("bills_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    // Computed-from-meters totals per category, e.g. {"electricity": 1550, "water": 500}.
    // Kept separate from manual overrides so we can always show "from meter" vs "entered manually".
    billBreakdown: jsonb("bill_breakdown").notNull().default({}),
    // Owner-entered amounts per category that take precedence over the meter-computed
    // total for that category (spec: owner must be able to type in a bill directly,
    // not only derive it from a meter). e.g. {"gas": 300} when there's no gas meter.
    categoryOverrides: jsonb("category_overrides").notNull().default({}),
    adjustmentAmount: numeric("adjustment_amount", { precision: 12, scale: 2 }).notNull().default("0"), // manual +/- adjustment (discount, arrears etc.)
    adjustmentNote: text("adjustment_note"),
    totalDue: numeric("total_due", { precision: 12, scale: 2 }).notNull().default("0"),
    totalPaid: numeric("total_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    status: adjustmentStatusEnum("status").notNull().default("unpaid"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    flatMonthIdx: uniqueIndex("monthly_adjustments_flat_month_idx").on(t.flatId, t.month),
  })
);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  flatId: text("flat_id")
    .notNull()
    .references(() => flats.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
  adjustmentId: text("adjustment_id").references(() => monthlyAdjustments.id, {
    onDelete: "set null",
  }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull().default("cash"),
  paidOn: date("paid_on").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  propertyId: text("property_id").references(() => properties.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  spentOn: date("spent_on").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  kind: text("kind").notNull().default("info"), // info | due | payment | system
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Relations ----------
export const orgRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  properties: many(properties),
}));

export const propertyRelations = relations(properties, ({ many, one }) => ({
  org: one(organizations, { fields: [properties.orgId], references: [organizations.id] }),
  flats: many(flats),
  meters: many(meters),
}));

export const flatRelations = relations(flats, ({ one, many }) => ({
  property: one(properties, { fields: [flats.propertyId], references: [properties.id] }),
  tenants: many(tenants),
  meters: many(meters),
  adjustments: many(monthlyAdjustments),
}));

export const tenantRelations = relations(tenants, ({ one }) => ({
  flat: one(flats, { fields: [tenants.flatId], references: [flats.id] }),
}));

export const meterRelations = relations(meters, ({ one, many }) => ({
  flat: one(flats, { fields: [meters.flatId], references: [flats.id] }),
  property: one(properties, { fields: [meters.propertyId], references: [properties.id] }),
  readings: many(meterReadings),
}));

export const meterReadingRelations = relations(meterReadings, ({ one }) => ({
  meter: one(meters, { fields: [meterReadings.meterId], references: [meters.id] }),
}));

export const adjustmentRelations = relations(monthlyAdjustments, ({ one, many }) => ({
  flat: one(flats, { fields: [monthlyAdjustments.flatId], references: [flats.id] }),
  payments: many(payments),
}));

export const paymentRelations = relations(payments, ({ one }) => ({
  flat: one(flats, { fields: [payments.flatId], references: [flats.id] }),
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
  adjustment: one(monthlyAdjustments, {
    fields: [payments.adjustmentId],
    references: [monthlyAdjustments.id],
  }),
}));

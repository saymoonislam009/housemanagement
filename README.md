# Bariwala — Property, Tenant & Bill Ledger

A full rebuild of the property management app: multi-tenant (multiple landlord accounts),
real authentication, real Bengali/English language switching, and every module wired end to
end — properties → flats → tenants → meters → monthly adjustment → payments, plus an
owner-only expenses ledger, reports, and settings.

## Stack
- **Next.js 14** (App Router, Server Actions — every button in this app calls a real
  server function, nothing is a dead click)
- **Neon Postgres** via **Drizzle ORM**
- **Tailwind CSS**, mobile-first responsive design (bottom tab bar on phones, sidebar on
  desktop)
- Auth: JWT session cookies + bcrypt (no third-party auth service needed)
- Deploy target: **Netlify** (`@netlify/plugin-nextjs`)

## 1. Set up Neon

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the connection string from your Neon dashboard (starts with `postgresql://...`,
   make sure `sslmode=require` is included).

## 2. Local setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:
```
DATABASE_URL=postgresql://...           # from Neon
SESSION_SECRET=<run: openssl rand -base64 32>
```

Push the schema to your Neon database:
```bash
npm run db:migrate
```

Run locally:
```bash
npm run dev
```

Visit `http://localhost:3000` — you'll land on `/register` to create your first
landlord account (this becomes an "organization" — the multi-tenant boundary; each
landlord who registers gets their own isolated data).

## 3. Deploy to Netlify

1. Push this project to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
3. Netlify will auto-detect Next.js via `netlify.toml` / `@netlify/plugin-nextjs`.
4. Add environment variables in **Site settings → Environment variables**:
   - `DATABASE_URL` — your Neon connection string
   - `SESSION_SECRET` — the same secret you generated locally (or a new one, just
     don't change it after users have logged in, or existing sessions will invalidate)
5. Deploy. First deploy will run `npm run build`.

Before or after the first deploy, run the migration once against your **production**
Neon database (same command, just make sure `DATABASE_URL` in your local `.env.local`
temporarily points at the production database, or run it from Netlify's CLI/build
hook):
```bash
npm run db:migrate
```

## What each module does

- **Properties** → add a house/building, then add flats inside it (name + floor + rent).
- **Tenants** → assign a tenant to a flat; edit, deactivate, or delete anytime.
- **Meter Readings** → add a meter per flat (electricity/water/gas) *or* a shared meter
  at the property level (e.g. a water pump). Each meter has its own rate, meter charge,
  and other charges — fully editable. Recording a reading auto-calculates units used and
  the bill amount from the previous reading, and instantly rolls into that flat's Monthly
  Adjustment.
- **Monthly Adjustment** → the month-by-month source of truth per flat: rent + auto-pulled
  bills + a manual +/- adjustment (discounts, arrears) = total due. Record payments
  against it and the paid/partial/unpaid status updates automatically. Switch months with
  the arrows at the top.
- **Payments** → the full payment history across all flats/tenants, filterable by flat.
- **Expenses** → owner-only ledger, separate from tenant billing.
- **Reports** → income collected vs. expenses, month by month.
- **Settings** → business name, currency, and language (English/Bengali — this actually
  persists now, both to a cookie and to the account).
- **Notifications** → bell icon in the top bar; payments and system events generate
  notifications, mark-as-read works.

## Known follow-ups (being upfront about these)

- **Next.js version**: pinned to the latest patched 14.2.x release. A handful of npm
  audit advisories only apply to Next 15/16-specific features or self-hosted edge cases;
  upgrading to Next 15/16 is a bigger migration (App Router behavior changes) that's
  worth doing deliberately rather than rushed — flagging it so it's a conscious decision,
  not an oversight.
- **Multi-user per organization**: schema already supports a `staff` role per user, but
  there's no "invite a staff member" UI yet — right now each registered account is its
  own organization/owner. Easy to add if you need it.
- **File/receipt uploads**: not included — payments and expenses are numeric records only,
  no attached photos or PDF receipts yet.
- **Email**: no transactional email (e.g. password reset) is wired up yet — there's no
  email provider configured.
- The old deploy export you originally uploaded had no recoverable source code, so this
  is a from-scratch rebuild guided by everything you described — it doesn't share code
  with the old version, but the structure (properties → flats → tenants → meters → bills)
  matches what you asked for.

## Changelog — House Manager overhaul pass

This pass fixed a real security gap and reworked the billing/UX model per a detailed
product spec. See the full report delivered in chat for the itemized breakdown. Summary:

- **Security**: every mutating Server Action now verifies the record actually belongs
  to the logged-in user's organization before touching it (previously several
  edit/delete actions trusted the ID alone).
- **Billing model**: monthly bills now show an editable per-category breakdown
  (electricity/water/gas/other), each either computed from a meter or manually typed in
  by the owner, not just a single lump "bills" number.
- **Payments**: payments can now be edited, not just added/deleted; editing correctly
  recalculates the bill's paid/remaining/status.
- **Tenants**: "Mark as moved out" is now the primary action (keeps billing history
  intact); permanent delete is still available but tucked under a secondary disclosure.
- **Terminology**: "Property" → "House", "Monthly Adjustment" → "Monthly Bills", etc.
  throughout the UI (English and Bengali).
- **Onboarding**: a brand-new account is walked straight into naming their first house
  instead of hitting a generic empty state.
- **Dashboard**: added a "Needs attention" panel (unpaid bills, vacant flats, missing
  meter readings this month).
- **Occupancy bug fix**: "occupied" was checking a flat's own active flag instead of
  whether it has an active tenant — fixed everywhere it appeared.
- **Money math**: added a `round2` helper used at every calculation step to avoid
  floating-point drift in stored amounts.
- Database migration is additive only (`0001_...sql` just adds two nullable-with-default
  JSON columns) — no existing data is touched or reset.

## Changelog — Recheck pass

- **Fixed a bug from the previous pass**: the new ownership guards threw errors that
  weren't caught anywhere, meaning trying to access something you didn't own would
  crash with Next.js's raw technical error page. Added an error boundary at
  `app/(app)/error.tsx` that shows a friendly message instead (spec #49).
- **Shared-meter allocation** (previously flagged as missing): shared meters like a
  water pump can now be set to "split equally across flats," which folds the reading's
  cost into every active flat's bill automatically, or left as "owner expense" (the
  original, tenant-unaffected behavior). Tucked under an Advanced disclosure so it
  doesn't clutter the meter form for the common case.
- **Monthly History page** (previously flagged as missing): `/history` — a house-wide
  view with Expected/Collected/Outstanding/Expenses for a selected month, a flat-by-flat
  table, and a "This Year" toggle showing the same three figures per month.
- **Settings billing defaults**: unit rate / meter charge / other charge can now be set
  once in Settings and pre-fill every new meter you create, instead of always starting
  from zero.
- Migration `0002_hard_talos.sql` adds the `allocation_method` enum + column — additive
  only, verified against existing data.

## Project structure

```
app/
  (app)/              # authenticated pages (sidebar/bottom-nav layout)
    dashboard/ properties/ tenants/ meters/ bills/ payments/ expenses/ reports/ settings/
  login/ register/    # auth pages
db/
  schema.ts           # Drizzle schema (source of truth for the data model)
  migrations/         # generated SQL migrations
lib/
  actions/            # Server Actions — all mutations (create/update/delete) live here
  i18n/                # English + Bengali dictionaries
  auth.ts             # session/cookie handling
  queries.ts          # read queries used by pages
components/           # shared UI (Sidebar, TopBar, Modal, form pieces, icons)
```

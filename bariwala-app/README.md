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

# Construction CRM

## One-liner

A CRM for a construction business to track leads, customers, projects, quotations, workers, and (eventually)
materials and finance — a NestJS + MongoDB API (every Phase 1 module built) with a Next.js dashboard
(Tailwind + shadcn/ui) partially wired to live data — leads are real, everything else is still mock,
visibly labeled. See `.ai/BE/FEATURES.md` and `.ai/FE/FEATURES.md` for exact status per module.

## Repo layout

```
.
├── backend/            NestJS REST API (MongoDB via Mongoose)
│   └── src/
│       ├── main.ts               bootstrap, global prefix, CORS, validation, Swagger
│       ├── app.module.ts         root module wiring
│       ├── common/contracts/     shared enums & DTOs (source of truth for domain vocabulary)
│       ├── database/seed.ts      standalone seed script entry point
│       └── modules/              one folder per domain module (auth, users, leads)
├── frontend/            Next.js 15 App Router dashboard — Tailwind CSS v4 + shadcn/ui
│   └── src/
│       ├── app/          layout.tsx, page.tsx, login/page.tsx, styles.css (Tailwind + design tokens)
│       ├── components/   ui/ (shadcn-generated primitives), theme-provider.tsx, theme-toggle.tsx
│       └── lib/           auth.ts (session), api.ts (backend calls), utils.ts (shadcn's cn())
├── docker-compose.yml    mongodb + api + web, for local multi-container runs
└── .env.example          shared env var reference (root-level; each project also has its own)
```

## Frontend ↔ backend contract

- **Backend base URL:** `http://localhost:4000/api` (global prefix `api` set in `backend/src/main.ts`)
- **Swagger / OpenAPI docs:** `http://localhost:4000/docs`
- **Frontend → backend:** the frontend now reads `NEXT_PUBLIC_API_URL` and calls it — see
  `frontend/src/lib/api.ts` and `.ai/FE/ARCHITECTURE.md`. As of 2026-08-08: login is fully wired, and the
  dashboard's leads section (total count, pipeline chart, create form) is live. Everything else on the
  dashboard is still hardcoded mock data, clearly labeled with a "Demo data" badge rather than silently mixed
  in — see `.ai/FE/features/dashboard-shell.md` for the exact split.
- **Auth mechanism:** `POST /api/auth/register` and `POST /api/auth/login` return a signed JWT
  (`accessToken`) via `@nestjs/jwt`. A global `JwtAuthGuard` (`backend/src/modules/auth/`) now requires this
  token as `Authorization: Bearer <token>` on every route except those marked `@Public()` (currently only
  `register`/`login`). Role-based restriction (`RolesGuard` + `@Roles()`) is implemented but not yet applied
  to any specific route. See `.ai/BE/features/auth.md`.
- **Organization model:** this is a **single-organization** system, not multi-tenant. Every record
  (`User.organizationId`, `Lead.organizationId`) is stamped with the same constant organization id
  (env var `DEFAULT_ORGANIZATION_ID`, default `'default'`). There is no per-tenant isolation logic and none
  is intended.

## Running both projects locally

### Option A — Docker Compose (from repo root)

```bash
cp .env.example .env
docker compose up
```

Starts `mongodb` (port 27017), `api` (port 4000, backend), `web` (port 3000, frontend).

### Option B — manual, two terminals

```bash
# backend
cd backend
cp .env.example .env
npm install
npm run start:dev      # http://localhost:4000/api, docs at /docs

# frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev             # http://localhost:3000
```

MongoDB must be reachable at `MONGODB_URI` (e.g. run it separately via
`docker run -p 27017:27017 mongo:8`, or point at an existing instance).

## Environment variables

### Backend (`backend/.env.example`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongoose connection string |
| `JWT_SECRET` | Secret used to sign/verify auth JWTs |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `15m`) |
| `PORT` | HTTP port the Nest app listens on (default 4000) |
| `DEFAULT_ORGANIZATION_ID` | Constant organization id stamped on seeded users (default `'default'`) |
| `SEED_USERS` | If not `'false'`, seeds the 7 default role accounts on every boot |
| `SEED_DEFAULT_PASSWORD` | Password used for all seeded accounts except superadmin (if not overridden) |
| `SEED_SUPERADMIN_EMAIL` | Email for the seeded superadmin account |
| `SEED_SUPERADMIN_PASSWORD` | Password for the seeded superadmin account |

### Frontend (`frontend/.env.example`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the frontend uses to call the backend API — read by `frontend/src/lib/api.ts` |

## Glossary

| Term | Meaning |
|---|---|
| **Lead** | A prospective customer inquiry, tracked through a sales pipeline (`LeadStatus`). |
| **Lead status** | One of `NEW`, `CONTACTED`, `SITE_VISIT`, `QUOTATION_SENT`, `NEGOTIATION`, `WON`, `LOST` (`backend/src/common/contracts/index.ts`). |
| **Project stage** | One of `PLANNING`, `FOUNDATION`, `STRUCTURE`, `BRICKWORK`, `PLUMBING`, `ELECTRICAL`, `FLOORING`, `PAINTING`, `INTERIOR`, `INSPECTION`, `HANDOVER` — defined in shared contracts but **no Projects module exists yet** to use it. |
| **Role** | One of `SUPERADMIN`, `ADMIN`, `SALES`, `PROJECT_MANAGER`, `SUPERVISOR`, `ACCOUNTANT`, `CUSTOMER`. Stored on `User.role`; not currently enforced by any guard. |
| **Organization** | A single fixed tenant id stamped on all records; this system is single-org, not multi-tenant. |

## Roadmap decisions (confirmed 2026-08-08, updated 2026-08-08)

- **Auth guards / route protection: shipped.** A global `JwtAuthGuard` + `RolesGuard` now enforce
  authentication on every backend route by default (opt-out via `@Public()`), applied ahead of new features
  as planned. See `.ai/BE/features/auth.md` for what's still open (role-restricted routes, `register`'s
  unconditional `ADMIN` grant).
- **`register`'s privilege-escalation gap: resolved 2026-08-08.** Confirmed decision: keep registration
  public (unauthenticated) but default the created role to `CUSTOMER` instead of `ADMIN` — anticipating
  customer self-signup for the future customer portal. Staff accounts remain seeder-only; there is still no
  way to create a `SALES`/`PROJECT_MANAGER`/etc. account via any API.
- The frontend dashboard's hardcoded data (`frontend/src/app/page.tsx`) is a placeholder awaiting real API
  wiring (starting with `GET /api/leads`), not a permanent mockup — see `.ai/FE/features/dashboard-shell.md`.
  Unstarted; now unblocked since `GET /api/leads` requires auth the frontend doesn't yet send.

## Product roadmap

The founder's BRD/PRD (shared 2026-08-08) answers what was previously an open question about the roadmap for
Projects/Customers/Quotations/Workers/Materials/Finance: they are all planned modules with a defined phase
order. See `.ai/PRODUCT_SPEC.md` for the full module table, phase breakdown, and role definitions. Every
planned module now has a status row in `.ai/BE/FEATURES.md` and a stub file under `.ai/BE/features/`.

**Build order so far:** auth guards → `register` locked to `CUSTOMER` default → Customer management core +
lead-to-customer conversion → full Swagger documentation for all endpoints (now a standing convention — see
project memory `feedback_swagger_docs`) → Project management core → Quotation management core (server-computed
line-item/tax/discount totals, verified against hand-calculated values) → Worker management core (roster
only; daily attendance deliberately deferred to Daily Site Reports to avoid double-modeling it). All shipped
with partial scope — see each module's feature file Known gaps for specifics.

**This completes every backend module in `.ai/PRODUCT_SPEC.md` Phase 1** except the standalone marketing
website (which may not even belong in this repo — see Open questions above).

**Frontend wiring started 2026-08-08:** real login (staff accounts only, no signup), auth-gated dashboard,
and the leads section (total/pipeline/create) wired to live data. Everything else on the dashboard is
still mock, visibly labeled. The user manually tested this in their own browser and confirmed it worked,
including catching a real discrepancy (Total leads vs. pipeline "New" count) that turned out to be correct
behavior, not a bug — the pipeline only charts 5 of 7 `LeadStatus` values. Also requested: lead source as a
dropdown (not free text) — done. See `.ai/FE/features/authentication.md` and
`.ai/FE/features/dashboard-shell.md` for exact scope and known gaps.

**Full visual redesign, also 2026-08-08 (user-directed):** Tailwind CSS v4 + shadcn/ui, chosen over plain
Tailwind or continuing hand-rolled CSS. Both pages rebuilt on shadcn components; brand color layered on top
of shadcn's neutral tokens; dark mode added; toast notifications replace inline error text. See
`.ai/FE/ARCHITECTURE.md` for the full architecture, including a real gotcha hit twice (`next build` +
`next dev` sharing `.next` corrupts it) and an important note for anyone expecting classic shadcn/Radix:
**this shadcn CLI version is built on `@base-ui/react`, not Radix** — `asChild` doesn't exist, some prop
shapes differ. Verification: `tsc --noEmit` and `next build` both clean, API contract re-confirmed via a
Node script — but **the redesigned UI itself has not been manually clicked through yet**, only the
pre-redesign version was. No browser automation was available in this session to do it directly.

**Redesign bug, found and fixed 2026-08-08:** the user did click through it, and hit a real crash — the
user-menu dropdown threw `Base UI: MenuGroupContext is missing` (a `DropdownMenuLabel` used without its
required `DropdownMenuGroup` wrapper — see `.ai/FE/ARCHITECTURE.md`), which broke Logout. Combined with a
naturally expired 15-minute JWT, this trapped the user with no way back to `/login`. Both fixed: the
structural bug, and `lib/api.ts` now auto-redirects to `/login` on any authenticated `401`. Confirmed working
by the user. This is the concrete proof that `tsc --noEmit`/`next build` passing doesn't mean the UI works —
neither caught this, since it's a runtime-only error.

**Projects section wired, 2026-08-08:** "Active projects" (metric + table) now live from `GET /api/projects`,
plus a working "＋ New project" dialog. Required a client-side join (`Project.customerId` → `Customer.name`,
fetched separately since it's not a Mongoose `ref`) — the reason this was deferred when Leads was wired
first. Two mock-table columns were dropped rather than faked: "Status" (was fabricated) and "Manager" (no
`GET /api/users` endpoint exists in the backend at all — a real, newly-identified gap, not yet addressed).
Verified via a Node script against the live backend (login → list → join → create → confirm); not yet
manually clicked through by the user. See `.ai/FE/features/dashboard-shell.md`.

**PM tooling, 2026-08-08:** discussed connecting an external PM tool (Jira/ClickUp/Slack) to formalize
milestone tracking. Decision: the user is setting up ClickUp via its official remote MCP server
(`claude mcp add --transport http clickup https://mcp.clickup.com/mcp`, OAuth via `/mcp` — no API token).
**Not yet connected as of this note** — once it is, the plan is to mirror this project's milestone history
(Phase 1 backend complete, FE wiring, redesign, Projects wiring) into ClickUp and use it as the ongoing
tracker, with `.ai/` docs remaining the technical source of truth (code-level detail lives here; ClickUp
becomes the higher-level status/notification layer).

**Quotations section wiring, 2026-08-08 — status uncertain, not fully verified.** Frontend code was written
(`lib/api.ts` gained `Quotation` type + `listQuotations`/`createQuotation`; dashboard gained a "Recent
quotations" card with a dynamic line-item form, joining `leadId` → lead name via the already-fetched leads
list) and `tsc --noEmit` passed clean. **Live end-to-end verification was interrupted by the user before it
ran** (session pivoted straight to the permissions work below). Given the backend's auth behavior changed
substantially in the interim (see below), this should be re-verified before being treated as done — the
seeded `ADMIN`/`SALES`/`SUPERADMIN` accounts do have `QUOTATIONS` grants in the new permission matrix, so it
likely still works, but "likely" isn't "confirmed."

**Dynamic role-permission system shipped, 2026-08-08 — a breaking change.** User-directed: "superadmin will
decide who has what permission... every user can see only what superadmin gave access." SUPERADMIN now
configures, per role, whether each of `leads`/`customers`/`projects`/`quotations`/`workers` can be
viewed/written; default is **deny**. Full design went through `EnterPlanMode` (an Explore pass over the
existing dead `RolesGuard`/`@Roles()` infra, then a dedicated Plan agent) before any code was written, given
the size of the behavior change. Confirmed decisions: per-role (not per-user), resource-level (not
record-level) granularity, SUPERADMIN always bypasses and can't be locked out, permissions management is
SUPERADMIN-only (diverges from the PRD's "Administrator manages permissions," deliberately — reversible via
one API call). Verified with a 95/95-assertion Node script sweeping every (role, resource, action)
combination, the SUPERADMIN bypass, and a live-update proof; one real bug was caught and fixed **in the
verification script itself** (a reused mutating test route polluted later test state), not in the feature.
**2026-08-08 (later, user-directed):** the seed matrix's starter grants for ADMIN/SALES/PROJECT_MANAGER/
SUPERVISOR/ACCOUNTANT were removed — SUPERADMIN is now the only role with any access by default, both in
the seed source and in the already-running DB (live rows deleted via the new `DELETE` endpoint). A frontend
`/permissions` page (SUPERADMIN-only) now exists to grant access back role-by-role — see
`.ai/FE/features/permissions.md`. Full detail: `.ai/BE/features/permissions.md`.

**Material & Inventory Management shipped (core), 2026-08-09 — the first Phase 2 module.** User confirmed
"move to next module" after Phase 1 wrapped; a genuine 3-way design fork (catalog-only vs. catalog+requests
vs. per-project stock) was resolved via `AskUserQuestion` — user chose **catalog + stock + project material
requests, centralized (not per-project)**. Ships a `Material` catalog and a `MaterialRequest` workflow
(`REQUESTED → APPROVED → FULFILLED`/`REJECTED`, fulfilling atomically decrements stock), gated on a new
`MATERIALS` resource. First module with two schemas/services/controllers in one Nest module. Verified live
with an 18-assertion Node script; all passed, test data and temporary grants cleaned up afterward (including
one leftover test lead from an earlier permissions-verification pass, deleted directly from MongoDB since no
lead-delete endpoint exists). Sidebar "Materials" nav item and the `/permissions` page's resource list were
updated in the same pass. No frontend page yet — backend-only, matching precedent. Full detail:
`.ai/BE/features/material-inventory-management.md`.

**Materials wired into the FE, 2026-08-09.** User asked to "wire it up in the FE as well" right after the
backend shipped. Built a dedicated `/materials` route (not embedded in the dashboard, unlike
Projects/Quotations) — catalog card with low-stock alerts, material-requests card with create/approve/
reject/fulfill. First FE page to gate its own write actions on `GET /permissions/me`'s `canWrite`, not just
hide the sidebar link — a view-only role sees the data but no mutate buttons. Verified live by simulating
the page's exact call sequence (parallel page-load fetch, both dialogs, every action button) as a temporarily
-granted `PROJECT_MANAGER`, plus confirming a zero-grant role hits the page's own access-restricted branch;
12/12 assertions passed, test data and temporary grants cleaned up after. No browser-driven verification yet.
Full detail: `.ai/FE/features/materials.md`.

**Dedicated `/projects` page shipped, 2026-08-09 — user-directed, right after Materials.** Followed
`/materials`'s pattern (view/write gating via `GET /permissions/me`, its own create dialog) but for a
resource that already had dashboard coverage — resolved by being purely additive: the dashboard's "Active
projects" card was left untouched, not migrated or removed, so there are now two independent surfaces
reading the same backend data on their own schedules. Adds a stage-transition `Select` per row not present
on the dashboard version, and an `endDate` field on the create dialog. Verified live by simulating the
page's exact call sequence as a temporarily-granted `ACCOUNTANT` (page-load fetch, create-dialog shape
including the new field, stage change) plus confirming a zero-grant role hits the access-restricted branch;
8/8 assertions passed, test data and the temporary grant cleaned up after. Full detail:
`.ai/FE/features/projects.md`.

**Dedicated `/quotations` page shipped, 2026-08-09 — user-directed, right after Projects.** Same additive
pattern: the dashboard's "Recent quotations" card was left untouched. Adds a "View details" dialog (full
line-item breakdown) the dashboard version doesn't have; the create-dialog logic (dynamic line-item editor,
client-side totals preview) is copy-pasted from the dashboard, not extracted into a shared component — now
duplicated in two places, flagged as a real refactor candidate if a third consumer appears. Verified live by
simulating the page's exact call sequence as a temporarily-granted `SUPERVISOR` (chosen since it had zero
prior grants): access-restricted-before-grant, page-load fetch, full create flow with a 2-line-item
quotation (18% tax, 5% discount), and hand-verified the server's computed totals matched the FE preview's
math exactly (₹48,000 → ₹53,808). 9/9 assertions passed; the test lead/quotation (no delete endpoints for
either) were removed directly from MongoDB, and the temporary grant reverted. This also incidentally
re-verifies the Quotations backend flow against the now-permission-gated backend — the "status uncertain"
note from the dashboard-embedded version earlier in this log can be considered resolved for the API layer,
though the dashboard's own quotation UI still hasn't been manually clicked through in a browser. Full
detail: `.ai/FE/features/quotations.md`.

**Dashboard redesigned into a real cross-module executive summary, 2026-08-10 — user-directed.** Verbatim
ask: "all the modules summary will be shown on dashboard so a superadmin can verify and get all the
information from the dashboard, the dashboard should be more precise, use graphs and use some modern ui on
dashboard." This resolved the previous entry's open question on its own — the dashboard's Projects/
Quotations cards lost their tables and create dialogs, becoming slim summaries linking to the dedicated
pages, and the twice-duplicated quotation line-item editor is gone (deleted, not extracted — moot with one
consumer left). Every dashboard widget is now real: per-module permission gating on every section (not just
the sidebar — a role only ever sees/fetches data for resources it can view), 3 recharts charts (Lead
pipeline, Project stages, Worker availability — first charting library in this project, `npx shadcn add
chart`), 4 module-summary cards with "View all" links (Workers falls back to a toast — no dedicated page
yet), a SUPERADMIN-only Permissions overview card, and a real recent-activity feed merged across every
visible module by `createdAt`. Removed: the last mock content (fake revenue/payments metrics, the fixed
3-row activity feed) and the `MockBadge` component (nothing left to label). Workers gained its first FE
wiring ever (`Worker` type + `listWorkers()` in `src/lib/api.ts`) — previously zero. Verified live with a
Node script covering two scenarios: SUPERADMIN sees all 6 modules + the permissions matrix (all `200`), and
a temporarily-granted `ACCOUNTANT` with a deliberately partial grant (`QUOTATIONS`+`WORKERS` view only) both
succeeds on those two and correctly `403`s on `LEADS`/`GET /permissions` — proving the gating logic matches
what the backend actually enforces. 12/12 assertions passed; no new documents were created (read-only
verification), so no MongoDB cleanup was needed. Full detail: `.ai/FE/features/dashboard-shell.md`.

**Two same-day follow-ups from user feedback, 2026-08-10 (later):** (1) "the graph and cards... looking
like claustrophobic" — the redesign above shipped functionally complete but visually tight; fixed by giving
charts/cards more room (the 11-category Project stages chart in particular moved from a cramped
rotated-label vertical bar chart to a full-width horizontal one), no data changes. (2) "You dont have to
show the permissions overview on the dashboard" — the Permissions overview card added in the redesign above
was deleted outright, including its `GET /api/permissions` call and all associated state/constants; the
full matrix remains available at `/permissions`. Both documented in `.ai/FE/features/dashboard-shell.md`.

**Dedicated `/workers` page shipped, 2026-08-10 (later still) — user-directed, right after Materials/
Projects/Quotations.** Followed `/projects`'s pattern (view/write gating, an inline availability `Select`
per row via `PATCH /workers/:id/availability`, no transition guard on either side, matching the backend's
actual permissiveness) but unlike Projects/Quotations, Workers had **no** prior dashboard section — purely
additive, not a duplicate-then-resolve story. Both the sidebar's "Workers" link and the dashboard's Workers
summary card's "View all" button now route here instead of toasting "not built yet" — the last of the 4
module-summary cards to gain a real destination. Verified live by simulating the page's exact call sequence
as a temporarily-granted `SALES` (access-restricted-before-grant, page-load fetch, create flow defaulting to
`AVAILABLE`, an availability change, join correctness); 8/8 assertions passed, test data and the grant
cleaned up after. Full detail: `.ai/FE/features/workers.md`.

**Dedicated `/leads` page shipped, 2026-08-10 (later still) — user-directed.** Followed the same
view/write-gating pattern as every other dedicated page, plus a status
`Select` (`PATCH /leads/:id/status`, no transition guard) and a new "Convert" action for `WON` leads
(`POST /leads/:id/convert` — the first place in this FE that creates a `Customer`), which attempts the call
and surfaces the backend's specific error via toast rather than pre-computing conversion eligibility
client-side. **Unlike Projects/Quotations/Workers, this one deleted the dashboard's "＋ New lead"
button/dialog outright in the same change** — no additive-then-resolved-later step, since there was no
reason to leave a second create surface once `/leads` existed. The dashboard is now fully read-only end to
end; the also-now-dead `canWriteTo()` helper (it only ever gated that one button) was deleted too. The Lead
pipeline chart gained a "View all" link. Verified live by simulating the page's exact call sequence as a
temporarily-granted `PROJECT_MANAGER` (access-restricted-before-grant, page-load fetch, create defaulting
to `NEW`, a full status walk through all 7 statuses to `WON`, a successful convert, and a repeat convert
confirming the `409` toast path); 11/11 assertions passed, test data and the grant cleaned up after. Full
detail: `.ai/FE/features/leads.md`.

**Dedicated `/customers` page shipped, 2026-08-10 (later still, once more) — user-directed, the last Phase 1
CRM module.** Unlike every other page this session, Customers had **zero create UI anywhere in the FE**
before this — the backend's `POST /customers` ("create directly, not via lead conversion") had always
existed but nothing ever called it; the only path to a `Customer` document was `/leads`'s Convert action.
Adds a "＋ New customer" dialog plus a general-field **Edit** dialog (`PATCH /customers/:id`) — the first
such capability in this FE, since `Customer` has no status/stage field the way Leads/Projects/Workers/
Materials each got an inline transition control for. An "Origin" column (`Converted from lead` vs.
`Direct`, from `leadId` presence) makes the two creation paths visible side by side, deliberately without
joining against the leads list (would add a dependency a `CUSTOMERS`-only role might not have). Verified
live by simulating the page's exact call sequence as a temporarily-granted `SUPERVISOR` (access-restricted-
before-grant, page-load fetch, direct creation confirmed to have no `leadId`, then an edit confirmed via
refetch); 7/7 assertions passed, test data and the grant cleaned up after. Full detail:
`.ai/FE/features/customers.md`. **Every Phase 1 CRM module (Leads, Customers, Projects, Quotations,
Workers) now has a dedicated route**, plus Materials (Phase 2) and Permissions.

**`GET /api/users` shipped, 2026-08-10 (later still) — user-directed, backend-only.** The first public HTTP
surface for `User` documents (previously internal-only, consumed by `AuthModule`). `GET /api/users`
(paginated, optional `?role=` filter) and `GET /api/users/:id`, both gated on a new `USERS` resource
(SUPERADMIN seeded, everyone else at zero, same convention as every other resource). Deliberately read-only —
no create/update/delete route, matching exactly what was asked rather than building a fuller user-management
API. Both routes explicitly exclude the password hash at the query level (`.select('-password')`), not just
from the response DTO — verified by checking `Object.keys()` on every returned record, not spot-checking
one. Verified live: 9/9 assertions (shape, no password anywhere, role filter, get-by-id, `403` for a role
with no grant, and correctness of the live Swagger spec — both routes documented, `UserResponseDto` schema
missing `password`). Read-only verification, nothing to clean up. Built to unblock two known FE gaps (the
dashboard's dropped "Manager" column, role-based pickers) but **not wired into any FE page in this pass** —
that's separate follow-up work. Full detail: `.ai/BE/features/user-accounts.md`.

**`GET /api/users` wired into `/projects`, 2026-08-24 — user-directed, resuming after a session gap.**
Resolved the "Next" candidate below: `projectManagerId`/`supervisorId` were fields with zero UI since the
Projects module shipped. Added `Manager`/`Supervisor` table columns (resolved via `GET /users?role=`) and a
per-row inline `Select` for reassignment (mirrors the existing Stage column's "act immediately" pattern),
plus both fields as optional pickers in the "＋ New project" dialog. Uses the backend's pre-existing general
`PATCH /projects/:id` route, which had never been called from the FE before — verified live first, since it
wasn't obvious from reading the service code alone, that `findByIdAndUpdate(id, plainObject)` does a true
partial merge and not a full-document replace. Unassigning sends an explicit `null` rather than omitting the
key, since `JSON.stringify` silently drops `undefined`-valued object keys — confirmed the backend's
`@IsOptional()` DTO validator accepts `null` and the update actually clears the field. The picker gracefully
degrades to plain text for a role that has `PROJECTS:write` but lacks the separate `USERS:view` grant (same
precedent as the existing customers-picker degradation). Verified live: 14/14 assertions (page-load fetch, no
password leakage in the user list, create with both fields set, inline reassign, inline unassign-to-null, and
the no-`USERS`-grant degradation path); test project deleted directly from MongoDB (no delete endpoint
exists) and temporary grants reverted. The dashboard's "restore the Manager column" idea from the note below
turned out to be moot — that table was already removed in the 2026-08-10 dashboard redesign, replaced by a
slim summary card with no table at all. Full detail: `.ai/FE/features/projects.md`.

Next: connect ClickUp and populate it, get user eyes on the redesigned dashboard and every dedicated page
(Leads/Customers/Projects/Materials/Quotations/Workers) in an actual browser (still no browser-driven
verification anywhere in this project), start the next Phase 2 backend module (Supplier Management,
Module 8), add a general "edit project" dialog (name/budget/dates/notes/progressPercent — `PATCH
/projects/:id` already supports all of it), or something else — not yet decided.

## Open questions

- Is the public marketing website (Home/Services/Projects/About/Gallery/etc., per the Master Plan) part of
  this `frontend/` app, a separate site, or a separate repo? See `.ai/PRODUCT_SPEC.md` Open questions.
- **Resolved 2026-08-08:** frontend now uses Tailwind CSS v4 + shadcn/ui (user-directed, chosen for a full
  visual redesign over plain Tailwind or continuing hand-rolled CSS) — see `.ai/FE/ARCHITECTURE.md`.
- What file storage solution (PRD suggests AWS S3) should back document/photo uploads needed by Project,
  Quotation, Daily Site Report, and Expense modules?
- Does `SUPERADMIN` (in code, `Role` enum) map onto the PRD's `Administrator` role, or is it a distinct tier
  the PRD hasn't caught up to?
- **New, surfaced 2026-08-08:** there is no `GET /api/users` (or any user-listing) endpoint anywhere in the
  backend — `UsersService` is only consumed internally by `AuthModule`. This blocks the frontend from ever
  resolving `Project.projectManagerId`/`supervisorId` to a name (see `.ai/FE/features/dashboard-shell.md`).
  Worth a small backend module, or is user-listing intentionally admin-only/deferred?

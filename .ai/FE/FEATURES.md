# Frontend — Features index

| Feature | Slug | Status | Owner area | Detail doc |
|---|---|---|---|---|
| Authentication (FE) | `authentication` | shipped | `src/app/login`, `src/lib/auth.ts` | [features/authentication.md](features/authentication.md) |
| Dashboard shell | `dashboard-shell` | shipped (core) | `src/app/page.tsx` | [features/dashboard-shell.md](features/dashboard-shell.md) |
| Permissions management (FE) | `permissions` | shipped | `src/app/permissions/page.tsx` | [features/permissions.md](features/permissions.md) |
| Materials & inventory (FE) | `materials` | shipped (core) | `src/app/materials/page.tsx` | [features/materials.md](features/materials.md) |
| Projects (FE) | `projects` | shipped (core) | `src/app/projects/page.tsx` | [features/projects.md](features/projects.md) |
| Quotations (FE) | `quotations` | shipped (core) | `src/app/quotations/page.tsx` | [features/quotations.md](features/quotations.md) |
| Workers (FE) | `workers` | shipped (core) | `src/app/workers/page.tsx` | [features/workers.md](features/workers.md) |
| Leads (FE) | `leads` | shipped (core) | `src/app/leads/page.tsx` | [features/leads.md](features/leads.md) |
| Customers (FE) | `customers` | shipped (core) | `src/app/customers/page.tsx` | [features/customers.md](features/customers.md) |
| Customer portal (UI) | `customer-portal` | planned | — | [features/customer-portal.md](features/customer-portal.md) |
| Organization signup & pending approval | `organization-signup` | shipped (core) | `src/app/signup`, `src/app/pending` | [features/organization-signup.md](features/organization-signup.md) |
| Platform admin console | `platform-admin` | shipped (core) | `src/app/platform` | [features/platform-admin.md](features/platform-admin.md) |
| Design system (Claude Design mockups, Phase 1) | `design-system` | shipped (core) | `src/app/styles.css`, `src/lib/format.ts` | [features/design-system.md](features/design-system.md) |

**Not yet implemented:** dedicated pages for Suppliers, Billing, Schedule, Reports, a Job detail page, and a
client-facing quote document — all part of Phases 2–7 of the Claude-Design-mockup implementation plan (see
`design-system.md`), no backend module exists yet for Billing/Schedule/Suppliers/Site log. The sidebar has a
"Finance" stub entry for some of this. **Every Phase 1 CRM module now has a dedicated route** (Leads,
Customers, Projects, Quotations, Workers), plus Materials, Permissions, and (2026-08-27) org signup/pending
and a wholly separate platform-admin console. **2026-08-29:** every one of the routes above was restyled
under the new design system (Phase 1 of the mockup plan) — visual only, no new routes.

**2026-08-08:** First wiring pass — real login against the backend, real leads data on the dashboard (total
count + pipeline chart + working create form). Everything else on the dashboard remains mock, visibly
labeled. See `features/dashboard-shell.md` Known gaps for the exact remaining scope.

**2026-08-08 (later):** added `/permissions`, the first dedicated route beyond `/` and `/login`. Extracted a
shared `AppSidebar` component (`src/components/app-sidebar.tsx`) out of `page.tsx` so both routes render the
same nav — see `features/permissions.md`.

**2026-08-09:** added `/materials`, wiring the new `materials` backend module into the FE — the first FE
page to gate its own write actions (not just sidebar visibility) on `GET /permissions/me`, and the first
non-dashboard page with its own create dialogs. See `features/materials.md`.

**2026-08-09 (later):** added `/projects`, the first dedicated route for a resource that was already
embedded in the dashboard (Projects' dashboard card — "Active projects" metric + table + "New project"
dialog — left untouched at the time, additive). Adds a stage-transition control (a `Select` per row, `PATCH
/projects/:id/stage`) not present on the dashboard version. See `features/projects.md`.

**2026-08-09 (later still):** added `/quotations`, same additive pattern as `/projects`. Adds a "View
details" dialog showing the full line-item breakdown — the dashboard's summary only ever showed an item
count. See `features/quotations.md`.

**2026-08-10: dashboard redesigned into a real cross-module executive summary — user-directed** ("all the
modules summary will be shown on dashboard so a superadmin can verify and get all the information... more
precise, use graphs and modern UI"). Every widget is now real data — the last hardcoded mock content
("Monthly revenue", "Pending payments", the fixed 3-row activity feed) was removed. Added: per-module
permission gating on every section (not just the sidebar), 3 real recharts charts (Lead pipeline, Project
stages, Worker availability — first chart-library usage in this project, via `npx shadcn add chart`), 4
compact module-summary cards linking to their dedicated pages, and a real (not mock) recent-activity feed
merged across every visible module. The dashboard's own "New project"/"New quotation" dialogs were removed —
`/projects` and `/quotations` are now the sole owners of those create flows, resolving the "two surfaces"
duplication flagged when those pages first shipped. `src/lib/api.ts` gained `Worker` type + `listWorkers()`
(Workers had zero FE wiring before this). See `features/dashboard-shell.md`.

**2026-08-10 (later same day):** two follow-ups from user feedback. (1) Layout de-cramped — charts and
cards were rebuilt with more breathing room after feedback that they looked "claustrophobic"; the 11-category
Project stages chart in particular moved from a cramped rotated-label bar chart to a full-width horizontal
one. (2) The SUPERADMIN-only Permissions overview card added in the redesign above was removed entirely at
the user's request — `GET /api/permissions` is no longer called from `/` at all.

**2026-08-10 (later still): added `/workers`**, following `/projects`'s pattern — an inline availability
`Select` per row (`PATCH /workers/:id/availability`, same no-transition-guard permissiveness as the
backend), a "＋ New worker" dialog, and a client-side join resolving `assignedProjectId` to a project name.
Both the sidebar's "Workers" link and the dashboard's Workers summary card's "View all" button now route
here instead of showing a "not built yet" toast — the last of the 4 dashboard module-summary cards to gain
a real destination. `src/lib/api.ts` gained `createWorker()`/`updateWorkerAvailability()` (the `Worker` type
and `listWorkers()` already existed from the dashboard pass). See `features/workers.md`.

**2026-08-10 (later still): added `/leads`**, the last dedicated route for an existing Phase 1 CRM module.
A status `Select` per row (`PATCH /leads/:id/status`, no transition guard, matching the backend), a "＋ New
lead" dialog, and a "Convert" action for `WON` leads (`POST /leads/:id/convert`) that attempts the
conversion and surfaces the backend's specific error via toast (`400` not-WON, `404` not found, `409`
already-converted) rather than trying to pre-compute conversion eligibility client-side. **Unlike
Projects/Quotations, this resolved the dashboard's create dialog outright rather than leaving it
additive-then-resolved** — the dashboard's "＋ New lead" button/dialog/form-state were deleted in the same
change (along with the now-unused `canWriteTo()` helper), and the Lead pipeline chart gained a "View all"
link. `src/lib/api.ts` gained `updateLeadStatus()`/`convertLead()`. See `features/leads.md`.

**2026-08-10 (later still): added `/customers`**, the last Phase 1 CRM module to get a dedicated route.
Unlike every other page this session, Customers had **no create UI anywhere in the FE at all** before this
— the backend's `POST /customers` ("create a customer directly, not via lead conversion") existed but
nothing ever called it; the only way a customer document could be created was `/leads`'s Convert action.
This page adds both a "＋ New customer" dialog and, since `Customer` has no status/stage field for an inline
transition control the way other pages got one, an **Edit dialog** instead (`PATCH /customers/:id`) —
the first general-field edit capability in this FE; every other dedicated page still only supports
create + a narrow status/stage transition. An "Origin" column (`Converted from lead` vs. `Direct`, from
whether `leadId` is set) makes the two creation paths visible side by side. `src/lib/api.ts` gained
`createCustomer()`/`updateCustomer()`. See `features/customers.md`.

**2026-08-27: `organization-signup` + `platform-admin` shipped — multi-tenancy Stage 1's frontend
half.** `/signup` (org name/slug/admin credentials, auto-derived slug), `/pending` (a 3-state holding
screen for `PENDING`/`SUSPENDED`/`REJECTED` orgs), and `lib/api.ts`'s new 403-`ORGANIZATION_*` →
`/pending` redirect (placed beside the existing 401 → `/login` one). Separately, a wholly standalone
`/platform` admin console (own login, own `localStorage` keys, own `platformRequest()` client that
deliberately does not reuse `lib/api.ts`'s `request()`) with org lifecycle actions and an on-demand,
counts-only usage dialog. Neither area touches `AppSidebar` or the dashboard shell. See
`features/organization-signup.md`, `features/platform-admin.md`, and the backend side in
`.ai/BE/features/multi-tenancy.md` / `.ai/BE/features/platform-admin.md`.

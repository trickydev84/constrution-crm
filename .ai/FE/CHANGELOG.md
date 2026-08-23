# Frontend — Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project has no git history
available at documentation time (working directory is not a git repository), so no dated releases can be
reconstructed. The entry below reflects the current state of `frontend/` as a single baseline snapshot.

## [Unreleased]

### Removed

- **Dashboard's "＋ New lead" button and dialog** (2026-08-10, later still, superseded by `/leads`).
  Deleted along with `handleCreateLead()`, `showNewLead`/`form`/`submitting` state, the now-dead
  `canWriteTo()` helper (it only ever gated this one button), and the `Dialog`/`Input`/`Label`/`Select`/
  `LEAD_SOURCES`/`createLead`/`FormEvent`/`Plus` imports it alone required. This dashboard is now fully
  read-only — no create UI anywhere on it. Unlike Projects/Quotations, this wasn't left additive-then-
  resolved; it was deleted in the same change that added `/leads`.
- **Dashboard's Permissions overview card** (2026-08-10, later same day, user-directed: "You dont have to
  show the permissions overview on the dashboard"). Deleted, not hidden: `GET /api/permissions` is no
  longer called from `/`, along with the `listPermissions()`/`Permission` type imports, `ROLES`/
  `GRANTABLE_RESOURCES` constants, `permissionsMatrix` state, and `refreshPermissionsMatrix()`. The full
  permission matrix is still at `/permissions`.

### Changed

- **Dashboard layout de-cramped** (2026-08-10, same day, user feedback: "the graph and cards... looking
  like claustrophobic"): the 3 charts no longer share a single 3-column row — Lead pipeline + Worker
  availability now share a 2-column row at `h-72`, and the 11-category Project stages chart moved to its
  own full-width row as a horizontal bar chart (was a vertical chart with `-40°` rotated, overlapping axis
  labels crammed into a third of the screen — the main culprit). Metric cards rebuilt as icon-badge stat
  cards (colored accent per module) at `lg:grid-cols-3` instead of a tight `xl:grid-cols-6` grid of stacked
  text. Module-summary rows gained icon avatars, hover states, and show 5 items instead of 4. Permissions
  overview (since removed — see Removed above) gained a per-role progress bar in this pass, before its
  later removal the same day. Section/card spacing increased throughout. Pure layout — no data or API
  changes.

### Added

- **`/customers` page** (2026-08-10, later still): the last of the 5 core CRM modules to get a dedicated
  route. Unlike every other page this session, Customers had **zero create UI anywhere in the FE** before
  this — the backend's `POST /customers` ("create directly, not via lead conversion") existed but nothing
  called it. Adds a "＋ New customer" dialog and, since `Customer` has no status field to give an inline
  transition control, a general-field **Edit** dialog instead (`PATCH /customers/:id`) — the first such
  capability in this FE. An "Origin" column (`Converted from lead` vs. `Direct`, from `leadId` presence)
  distinguishes the two ways a customer can come into existence. `src/lib/api.ts` gained
  `createCustomer()`/`updateCustomer()`. See `.ai/FE/features/customers.md`.
- **`/leads` page** (2026-08-10, later still): a status `Select` per row (`PATCH /leads/:id/status`, no
  transition guard, matching the backend), a "＋ New lead" dialog (gained a `notes` field the old dashboard
  version never exposed), and a new "Convert"
  action for `WON` leads (`POST /leads/:id/convert`) that attempts the call and surfaces the backend's exact
  error via toast (`400`/`404`/`409`) rather than pre-computing eligibility client-side — the first place in
  this FE that creates a `Customer`. Sidebar's "Leads" link now routes here; the Lead pipeline chart on the
  dashboard gained a "View all" button. `src/lib/api.ts` gained `updateLeadStatus()`/`convertLead()`. See
  `.ai/FE/features/leads.md`.
- **`/workers` page** (2026-08-10, later still): dedicated worker roster, following `/projects`'s pattern —
  an inline availability `Select` per row (`PATCH /workers/:id/availability`, no transition guard on either
  side) and a "＋ New worker" dialog. Unlike Projects/Quotations, Workers had no prior dashboard section to
  resolve — purely additive. Both the sidebar's "Workers" link and the dashboard's Workers summary card's
  "View all" button now route here (previously a "not built yet" toast) — the last of the 4 module-summary
  cards to gain a real destination. `src/lib/api.ts` gained `createWorker()`/`updateWorkerAvailability()`.
  See `.ai/FE/features/workers.md`.
- **Dashboard redesigned into a real cross-module executive summary** (2026-08-10, user-directed): every
  widget is now real data, no mock content remains anywhere on `/`. Added: per-module `GET
  /api/permissions/me` gating on every section (metrics, charts, summary cards — a role only ever sees data
  for resources it has `view` access to, and the page never issues a doomed-to-403 request for anything
  else); 3 real charts via **recharts** (`npx shadcn add chart`, first chart-library usage in this project)
  — Lead pipeline (now a real `BarChart`, was hand-rolled `<div>`s), Project stages (new, all 11
  `ProjectStage` values), Worker availability (new, a `PieChart` donut with a hand-rolled legend); 4 compact
  module-summary cards (Projects, Quotations, Materials — low-stock focused, Workers) each with a "View all"
  button routing to its dedicated page (Workers has none yet, falls back to a toast); a SUPERADMIN-only
  Permissions overview card (`N/6 resources` per role, from `GET /api/permissions`); a real recent-activity
  feed merging the latest record from every visible module by `createdAt` (replaces the 3 hardcoded rows).
  **Removed**: "Monthly revenue"/"Pending payments" mock metric cards, the `MockBadge` component (nothing
  left to label), and the dashboard's own "New project"/"New quotation" dialogs — `/projects` and
  `/quotations` are now the sole owners of those create flows. The "＋ New lead" button (Leads still has no
  dedicated page) is now itself gated on `LEADS:write`, matching every other page's create-button
  convention. `src/lib/api.ts` gained `Worker` type + `listWorkers()` (Workers had zero FE wiring before
  this). New `src/components/ui/chart.tsx`. See `.ai/FE/features/dashboard-shell.md`.
- **`/quotations` page** (2026-08-09, later still): dedicated quotation list with a "View details" dialog
  (full line-item breakdown — Description/Category/Qty/Unit price/Amount, all server-computed values — plus
  the summary totals block and Notes/Terms) and a "＋ New quotation" dialog identical to the dashboard's
  version. Same view/write permission-gating as `/materials`/`/projects`. **Additive, not a migration** —
  the dashboard's "Recent quotations" card/dialog were left untouched. No `src/lib/api.ts` changes needed —
  reused `Quotation`/`Lead` types and `listQuotations()`/`createQuotation()`/`listLeads()` as-is. Sidebar's
  "Quotations" item now navigates here. See `.ai/FE/features/quotations.md`.
- **`/projects` page** (2026-08-09, later same day): dedicated project list with a stage-transition `Select`
  per row (`PATCH /projects/:id/stage`, no transition guard on either side, matching the backend's actual
  permissive behavior) and a "＋ New project" dialog (adds an `endDate` field the dashboard's version
  doesn't have). Same view/write permission-gating as `/materials`. **Additive, not a migration** — the
  dashboard's existing "Active projects" card/dialog were left untouched; the two surfaces read the same
  backend data independently and aren't kept in sync with each other. Sidebar's "Projects" item now
  navigates here. `src/lib/api.ts`'s `createProject()` gained an optional `endDate` param (backward
  compatible); new `updateProjectStage()`. See `.ai/FE/features/projects.md`.
- **`/materials` page** (2026-08-09): catalog (with low-stock alerts) + material-requests workflow (create,
  approve, reject, fulfill), wired to the new `materials` backend module. First FE page to gate its own
  write actions (create/approve/reject/fulfill buttons), not just sidebar link visibility, on
  `GET /permissions/me`'s `canWrite` — every earlier page either assumed SUPERADMIN-only access or relied on
  the backend's `403` as the only enforcement. Sidebar's "Materials" item now navigates here instead of
  showing a "not built yet" toast, once visible. `src/lib/api.ts` gained `Material`/`MaterialRequest` types
  and 7 new functions. See `.ai/FE/features/materials.md`.
- **Sidebar "Materials" gated on the real `MATERIALS` resource** (2026-08-09): now that the `materials`
  backend module exists (`.ai/BE/features/material-inventory-management.md`), the sidebar's "Materials" item
  behaves like Leads/Customers/Projects/Quotations/Workers — hidden unless the role has `MATERIALS:view`.
  `frontend/src/app/permissions/page.tsx`'s `RESOURCES` constant also gained `MATERIALS` (grid is now 42
  rows, 6 roles × 7 resources). No Materials frontend page exists yet — clicking it (once visible) still
  shows a "not built yet" toast.
- **`/permissions` page** (2026-08-08): SUPERADMIN-only role × resource permission matrix editor — 36 rows
  (6 roles × 6 resources), View/Write/Delete checkboxes per row wired to
  `GET/PATCH/DELETE /api/permissions/...`, immediate-effect toggles (no Save step), inline "Access
  restricted" message for non-SUPERADMIN users instead of a silent redirect. See
  `.ai/FE/features/permissions.md`. Companion backend change: new `DELETE /api/permissions/:role/:resource`
  endpoint (`.ai/BE/features/permissions.md`).
- **`AppSidebar` extracted** (2026-08-08) from `src/app/page.tsx` into `src/components/app-sidebar.tsx`,
  shared by `/` and the new `/permissions` route. Adds a SUPERADMIN-conditional "Permissions" nav item using
  a real `next/link` (via Base UI's `render` prop) rather than the toast-only placeholder used by other nav
  items.
- `src/components/ui/checkbox.tsx` added (`npx shadcn add checkbox`).
- `src/lib/api.ts` gained `Permission` type, `listPermissions()`, `updatePermission()`, `deletePermission()`.
- **Sidebar nav items permission-gated** (2026-08-08, later same day): `AppSidebar` now fetches
  `GET /api/permissions/me` and hides "Leads"/"Customers"/"Projects"/"Quotations"/"Workers" unless the
  logged-in role has `view` access on the matching backend resource. SUPERADMIN skips the fetch and always
  sees everything. "Overview"/"Materials"/"Finance" are unaffected (always visible — the latter two aren't
  backed by a real resource yet). `src/lib/api.ts` gained `MyPermission` type, `getMyPermissions()`. See
  `.ai/FE/features/dashboard-shell.md`.
- **Projects section wired to live data** (2026-08-08): "Active projects" metric and table now real
  (`GET /api/projects`), plus a "＋ New project" dialog (`POST /api/projects`) with a customer picker
  (`GET /api/customers`). The table resolves `Project.customerId` to a customer name via a client-side join
  (`Map` lookup against a separately-fetched customer list) since it's not a Mongoose `ref`. Dropped two
  columns from the original mock rather than faking them: "Status" (was fabricated, no real data source —
  replaced by the real `Stage` column) and "Manager" (no `GET /api/users` endpoint exists anywhere in the
  backend to resolve `projectManagerId` to a name). Verified via a Node script simulating the full flow
  (login → list projects → list customers → confirm join resolves → create → confirm it appears) against the
  live backend.
- `src/lib/api.ts` gained `Customer`/`Project` types, `listCustomers()`, `listProjects()`, `createProject()`.
- Real login flow (`src/app/login/page.tsx`) against `POST /api/auth/login`, with `localStorage`-backed
  session storage (`src/lib/auth.ts`) and a shared authenticated `fetch` wrapper (`src/lib/api.ts`).
  Login-only — no signup UI, since self-registration creates `CUSTOMER` accounts for a different,
  not-yet-built customer portal, not this staff dashboard.
- Dashboard (`/`) is now auth-gated: redirects to `/login` without a session; shows the real logged-in
  user's name/role/initials; working logout.
- "Total leads" metric and "Lead pipeline" chart now show live data from `GET /api/leads`.
- "＋ New lead" button now opens a working modal form that creates a lead via `POST /api/leads` and refreshes
  the pipeline/metric.
- A "Demo data" badge now visibly marks every dashboard section still showing hardcoded mock content
  (Active projects metric + table, Monthly revenue, Pending payments, Recent activity), so real and fake data
  aren't visually indistinguishable.
- Header greeting and date are now computed from the real current time instead of hardcoded strings.

- **Full visual redesign on Tailwind CSS v4 + shadcn/ui** (user-directed, 2026-08-08). Resolves the
  long-standing open question about adopting Tailwind. Added: `tailwindcss`, `@tailwindcss/postcss`,
  `postcss`, `shadcn` (CLI), `@base-ui/react` (shadcn's underlying primitive library in this CLI
  version — **not** Radix, see `.ai/FE/ARCHITECTURE.md`), `lucide-react`, `next-themes`, `sonner`,
  `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`.
- New `src/components/ui/` (shadcn-generated primitives: button, card, input, label, select, dialog, avatar,
  badge, dropdown-menu, table, separator, sidebar, sheet, skeleton, sonner, tooltip) and
  `src/hooks/use-mobile.ts` — vendored via `npx shadcn add`, not hand-written.
- New `src/components/theme-provider.tsx` and `theme-toggle.tsx` — light/dark mode, toggle in the sidebar
  footer.
- `tsconfig.json` gained a `@/*` → `./src/*` path alias (required by shadcn's generated imports).
- `components.json` (shadcn CLI config) and `postcss.config.mjs` (Tailwind v4 setup) added.
- Both pages rebuilt on shadcn components: login uses `Card`/`Input`/`Label`/`Button`; the dashboard uses the
  `Sidebar` block, `Card`, `Table`, `Dialog` (replacing the old custom modal overlay), `Select` (source
  dropdown — was previously a plain text input, then a native `<select>`, now shadcn's `Select`), `Avatar`,
  `Badge`, `DropdownMenu` (user menu + logout), `Skeleton` (pipeline loading state).
- Brand color customization layered on shadcn's neutral base: navy `--primary`, standalone `--brand-gold`
  accent — see `.ai/FE/ARCHITECTURE.md`.
- Error/success feedback moved from inline text to `sonner` toast notifications throughout.
- Sidebar nav items other than "Overview" now show a "not built yet" toast on click instead of being
  silently inert.

### Changed

- `src/app/styles.css` completely rewritten: every hand-rolled CSS class from the original mock and the
  first wiring pass was deleted, replaced by Tailwind's entry point + shadcn design tokens. No bespoke
  component CSS remains in the project.
- `src/app/page.tsx` converted from a Server Component to a Client Component (needs hooks, browser storage,
  interactivity) and reformatted from the original single-line-per-construct style to normal multi-line
  JSX — a deliberate, documented exception (see `.ai/FE/ARCHITECTURE.md`).

### Fixed

- Discovered and documented a real gotcha: running `next build` while `next dev` shares the same `.next`
  directory corrupts it, causing the dev server to start serving `500`s. Hit twice this session; fix is
  stop dev → `rm -rf .next` → restart. Documented in `.ai/FE/OVERVIEW.md` to prevent a third occurrence.
- **Fixed a live crash the user hit**: the redesigned user-menu dropdown (`frontend/src/app/page.tsx`) used
  `DropdownMenuLabel` without its required `DropdownMenuGroup` wrapper — threw `Base UI: MenuGroupContext is
  missing` the moment the menu opened, taking Logout down with it. Passed `tsc --noEmit`/`next build` cleanly
  since it's a runtime context error, not a type error; only surfaced once the user actually clicked it in a
  browser. See `.ai/FE/ARCHITECTURE.md`'s Base UI section.
- **Fixed the resulting trap**: combined with a naturally expired 15-minute JWT, the broken Logout left the
  user stuck with every API call `401`ing and no way back to `/login`. `frontend/src/lib/api.ts`'s `request()`
  now auto-clears the session and redirects to `/login` on any authenticated `401` (excluding `/auth/*`,
  where `401` means wrong credentials, not session expiry) — resolves the open question logged in
  `.ai/FE/features/authentication.md` about exactly this scenario.

## [0.0.0] - baseline (documented 2026-08-08)

### Added

- Next.js 15 App Router project scaffold (`frontend/next.config.ts`, `frontend/tsconfig.json`).
- Root layout (`frontend/src/app/layout.tsx`) and single dashboard route
  (`frontend/src/app/page.tsx`) with static/mock CRM dashboard content (metrics, lead pipeline chart,
  recent activity, active projects table).
- Global stylesheet (`frontend/src/app/styles.css`).
- Docker support (`frontend/Dockerfile`, standalone Next.js output) and inclusion in root
  `docker-compose.yml` as the `web` service.

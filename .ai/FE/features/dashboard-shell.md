# Dashboard shell
**Status:** shipped (core) | **Last verified:** 2026-08-10

## Summary

The main `/` route — a real, permission-aware **executive summary across every module**, not a single
module's page. User-directed redesign ("all the modules summary will be shown on dashboard so a superadmin
can verify and get all the information from the dashboard, the dashboard should be more precise, use graphs
and use some modern UI"). As of 2026-08-10 **every widget on this page is real data** — the last hardcoded
mock content ("Monthly revenue", "Pending payments", the old fixed "Recent activity" feed) was removed in
this pass, and `MockBadge`/the "Demo data" labeling convention is no longer used anywhere on this page (no
mock content remains to label).

**Layout follow-up (2026-08-10, same day):** the first pass shipped functionally complete but visually
cramped — user feedback: "make the graph and cards more detailed and ui compatible they are looking like
claustrophobic." Fixed without changing any data logic: the 3 charts no longer share one 3-column row (the
11-category Project stages chart in particular had rotated axis labels crammed into a third of the screen
width, at only `h-48`) — Lead pipeline and Worker availability now share a roomier 2-column row at `h-72`/
donut, and Project stages moved to its own full-width row as a **horizontal** bar chart (`layout="vertical"`
in recharts' terms — category axis on the left, one row per stage) so all 11 labels read cleanly instead of
overlapping. Metric cards were rebuilt as icon-badge stat cards (a colored rounded-icon square beside the
number, one accent color per module via `METRIC_STYLES`) instead of a cramped 6-across `xl:grid-cols-6` grid
of stacked icon/label/number text — now `sm:grid-cols-2 lg:grid-cols-3`, more room per card. Module-summary
list rows gained icon avatars and hover states, and now show 5 items instead of 4. Section spacing increased
throughout (`space-y-6`→`space-y-8`, `gap-4`→`gap-5`/`gap-6`, page padding `p-6`→`p-6 lg:p-8`). No new API
calls, no data-shape changes — see Key files for the exact classes.

**Removed (2026-08-10, later same day):** the SUPERADMIN-only Permissions overview card, at the user's
explicit request ("You dont have to show the permissions overview on the dashboard"). Along with it:
`GET /api/permissions` is no longer called from this page at all (it was the one call here that needed the
SUPERADMIN-only endpoint rather than `/permissions/me`); `listPermissions()`/`Permission` type imports,
`ROLES`/`GRANTABLE_RESOURCES` constants, the `permissionsMatrix` state, and `refreshPermissionsMatrix()`
were all deleted, not just hidden. The full permission matrix is still available at `/permissions` — see
`.ai/FE/features/permissions.md` — this only removed the dashboard's summary of it.

## User-facing behaviour

- Requires an active session — see `.ai/FE/features/authentication.md`. Redirects to `/login` if none.
- Sidebar profile shows the real logged-in user's name/role/initials; "Logout" is functional. The sidebar
  lives in the shared `src/components/app-sidebar.tsx` — see `.ai/FE/features/permissions.md`.
- **Every section is permission-gated per module**, not just the sidebar. A local `canSee(resource)` helper
  (backed by `GET /api/permissions/me`, same pattern as `/materials`/`/projects`/`/quotations`, skipped
  entirely for SUPERADMIN) controls whether each metric card, chart, and module-summary card renders at
  all — a role with only `QUOTATIONS:view`+`WORKERS:view` sees exactly those two metric cards, the
  Quotations/Workers summary cards, and nothing else; the dashboard never fetches (and never shows data for)
  a resource the caller can't see. This closes a real gap: previously the dashboard fetched Leads/Projects
  unconditionally regardless of the caller's actual grants.
- **Metrics row** (up to 6 cards, each independently gated): Total leads, Customers, Active projects, Quoted
  value (+ quotation count), Workers (+ available count), Materials (+ low-stock count, shown in amber with
  a warning icon when `> 0`).
- **Charts row** (up to 3, using shadcn's `chart.tsx` wrapper over **recharts**, added this pass — see Key
  files): a **Lead pipeline** bar chart (unchanged data — 5 of 7 `LeadStatus` values — now a real recharts
  `BarChart` instead of hand-rolled `<div>` bars; gained a "View all" button routing to `/leads` when that
  page shipped, 2026-08-10 later still), a new **Project stages** bar chart (all 11
  `ProjectStage` values, real counts from the fetched project list), and a new **Worker availability** donut
  (`PieChart`) broken down by `availabilityStatus` with a manual color-coded legend beneath it (not
  shadcn's `ChartLegendContent` — see Key files for why).
- **Module summary cards** (2-column grid on `xl+`): compact, read-only, each with a "View all" button
  routing to the matching dedicated page, each row with an icon avatar —
  - **Projects**: 5 most recent (name, customer, stage badge) → `/projects`.
  - **Quotations**: 5 most recent (lead name, item count, total) → `/quotations`.
  - **Materials**: up to 5 low-stock materials (name, category, `stock / reorderLevel unit`) or "All
    materials are well stocked" → `/materials`.
  - **Workers**: 5 most recent (name, skill, availability badge) → `/workers` (added 2026-08-10, later
    still — see `.ai/FE/features/workers.md`; previously fell back to a "not built yet" toast, the last of
    the 4 module-summary cards to gain a real destination).
- **Recent activity — now real, not mock.** Merges the most recently created record from every
  *currently-visible* module (Leads/Projects/Quotations/Workers/Materials) by `createdAt`, shows the top 7
  with an icon, a one-line description, and a relative timestamp (`timeAgo()`: "just now" / "`N`m ago" /
  "`N`h ago" / "`N`d ago"). Replaces the previous 3 fully-hardcoded rows ("New lead added — Priya Mehta",
  etc.).
- **This page has no create dialogs left at all, as of 2026-08-10 (later still).** "＋ New project" and "＋
  New quotation" moved to `/projects`/`/quotations` when those pages shipped (2026-08-09); "＋ New lead" was
  the last one and moved to `/leads` the same day `/leads` shipped (2026-08-10) — its button, `Dialog`,
  `handleCreateLead()`, and related state were deleted outright, not left additive-then-resolved like
  Projects/Quotations were, since there was no reason to leave a second create surface once the dedicated
  page existed. This dashboard is now genuinely read-only end to end — every mutation happens on a dedicated
  page. The Lead pipeline chart gained a "View all" button (routes to `/leads`) to match every other
  chart/summary card's convention.

## Key files

- `frontend/src/app/page.tsx` — the whole feature, substantially rewritten this pass. Notable pieces:
  - `canSee(resource)` — local permission-gating helper, same pattern as every other page
    (`user.role === 'SUPERADMIN'` bypass, else look up `permissions` state from `GET /api/permissions/me`).
    A companion `canWriteTo(resource)` existed briefly (it only ever gated the "＋ New lead" button) and was
    deleted as dead code once that button moved to `/leads` (2026-08-10, later still) — this page has no
    write actions left to gate.
  - `fetchModules(visible: string[])` — called once after permissions resolve (or immediately for
    SUPERADMIN with all 6 resources), conditionally triggers each module's `refreshX()` so the page never
    makes a doomed-to-403 request for a resource the caller can't see.
  - Client-side joins (`customerNameById`, `leadNameById`) — same pattern as before, now also feeding the
    Projects/Quotations summary cards and the activity feed, not just a single table.
  - `timeAgo()` — new, relative-time formatting for the real activity feed.
  - `CHART_PALETTE` — an 11-color hex array (enough for the 11-stage Project chart), reused via `<Cell>` for
    all three charts rather than shadcn's CSS-variable-per-series `ChartConfig` color mechanism, since these
    are single-series-many-categories charts (one bar per stage/status), not multi-series charts — `Cell`
    lets each bar/slice get its own color from one `dataKey`.
  - The Worker availability pie's legend is **hand-rolled** (a flex row of colored dots + labels), not
    shadcn's `<ChartLegendContent>` — that component keys off `ChartConfig` entries matching each series'
    `dataKey`, which fits multi-series charts poorly for a single-series categorical pie; a manual legend
    was simpler and equally on-brand than fighting the config-matching to reproduce it.
  - **Project stages chart uses `<BarChart layout="vertical">`** (recharts' term for a horizontal bar
    chart — category axis on `<YAxis>`, not `<XAxis>`) specifically because it has 11 categories; the
    initial vertical-bar version (rotated `-40°` axis labels crammed into a third of the screen) was the
    main source of the "claustrophobic" feedback that prompted the 2026-08-10 layout follow-up above.
  - `METRIC_STYLES` — a per-`Resource` Tailwind class map (`bg-*-50 text-*-600 dark:bg-*-950
    dark:text-*-400`) giving each metric card's icon badge a distinct accent color, added in the layout
    follow-up to replace the plain `text-muted-foreground` icons.
- `frontend/src/components/ui/chart.tsx` — **new**, added via `npx shadcn add chart`. Pulled in `recharts`
  as a real dependency for the first time in this project (previously the "chart" on this page was
  hand-rolled `<div>` bars with inline `height` styles). `ChartContainer` (theming + responsive sizing),
  `ChartTooltip`/`ChartTooltipContent` (used on all three charts), `ChartConfig` type. `ChartLegend`/
  `ChartLegendContent` are also generated but unused on this page — see above.
- `frontend/src/lib/api.ts` — gained `Worker` type and `listWorkers()` (Workers had **zero** frontend
  wiring before this pass — no type, no function, nothing). `listPermissions()` was briefly also called from
  this page (for the since-removed Permissions overview card) but that call, along with the `Permission`
  type import, was deleted when the card was removed — `listPermissions()` is only used by `/permissions`
  again now.

## Data / API touchpoints

- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives every gating decision on this page.
- `GET/POST /api/leads`, `GET /api/customers`, `GET /api/projects`, `GET /api/quotations`, `GET
  /api/workers`, `GET /api/materials` — each fetched only if `canSee()` says the caller has view access.
  `GET /api/permissions` (the full matrix, SUPERADMIN-only) is **not** called from this page — it was,
  briefly, to back the since-removed Permissions overview card; see the Summary's "Removed" note.
- Verified live with a Node script simulating two scenarios against the running backend, from before the
  Permissions overview card was removed (the assertions about `GET /permissions` below predate that
  removal and are no longer exercised by this page, but the module-gating assertions still hold): (1) as
  SUPERADMIN, confirmed all 6 module `GET`s (plus `GET /permissions`, at the time) return `200`; (2) granted
  `ACCOUNTANT` a partial grant (`QUOTATIONS`+`WORKERS` view only, nothing else),
  confirmed `GET /permissions/me` reports exactly those two resources as visible, confirmed `GET
  /quotations`/`GET /workers` succeed for that role, and confirmed `GET /leads` and `GET /permissions`
  both correctly `403` — proving the dashboard's conditional-fetch logic wouldn't have attempted (and the
  backend would have rejected) calls for resources outside that role's grants. 12/12 assertions passed; the
  temporary grant was reverted afterward. No new documents were created during this verification pass (read-
  only + one temporary permission grant), so no MongoDB cleanup was needed this time.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered charts/cards/legend haven't been manually clicked through or visually inspected yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (all gating logic).
- `.ai/BE/features/lead-management.md`, `customer-management.md`, `project-management.md`,
  `quotation-management.md`, `worker-management.md`, `material-inventory-management.md`.
- `.ai/FE/features/leads.md`, `customers.md`, `projects.md`, `quotations.md`, `materials.md`, `workers.md`,
  `permissions.md` — the dedicated pages this dashboard's "View all" buttons route to. All 5 (4
  module-summary cards + the Lead pipeline chart) now have a real destination as of 2026-08-10 (Leads was
  the last, and its arrival also removed this page's last create dialog — see Summary). `/customers` shipped
  the same day but has no dashboard-side link — this page's "Customers" is a bare metric card, not a chart
  or summary-list card, so there was nothing to point anywhere.

## Known gaps & TODOs

- **Recharts is a new dependency** (via `npx shadcn add chart`) — this is the first chart-library usage in
  the project; previously "charts" were hand-rolled `<div>`s. Bundle-size impact wasn't measured in this
  pass.
- **Metrics/charts/summaries all cap at `limit=200`** per underlying list fetch (unchanged convention from
  before) — a metric or chart could under-count on an organization with more than 200 records in any one
  module. Fine at current data scale.
- **The Worker availability chart and summary card show nothing informative if there are zero workers** — a
  plain "No workers yet" message, no chart rendered (an empty `PieChart` would look broken, not just empty).
- Still no pagination UI, no edit/delete UI for anything reachable from this page — matches every other
  page's documented scope.

## Open questions

- **Resolved 2026-08-10 (later still)**: yes — `/leads` shipped, and this dashboard is now fully read-only,
  no create dialogs anywhere on it. See `.ai/FE/features/leads.md`.
- **Resolved 2026-08-10 (later still, again)**: yes — `/customers` shipped too, closing out every Phase 1
  CRM module. See `.ai/FE/features/customers.md`.
- Should the dashboard's bare "Customers" metric card grow into a richer summary card (like Projects/
  Quotations/Materials/Workers each have) now that `/customers` exists to link to, or is a bare count
  sufficient for a resource with no interesting categorical breakdown?

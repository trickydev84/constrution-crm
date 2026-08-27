# Frontend — Architecture

## Current state (updated 2026-08-10 — customers FE pass)

Nine routes:

```
src/app/layout.tsx        → Geist font (next/font/google), ThemeProvider (next-themes, class-based dark
                              mode), Sonner <Toaster/> for toast notifications. Still a Server Component.
src/app/login/page.tsx     → Client Component. shadcn Card/Input/Label/Button. Errors surface as a toast
                              (sonner) instead of inline text.
src/app/page.tsx           → Client Component. The dashboard — a real, per-module-permission-gated
                              executive summary (metrics + 3 recharts charts + 4 module-summary cards + a
                              real recent-activity feed). No mock content anywhere on this page. A
                              SUPERADMIN-only Permissions overview card existed briefly (2026-08-10) and
                              was removed the same day at the user's request. **No create dialogs left at
                              all as of this pass** — "＋ New lead" (the last one) moved to /leads, deleted
                              outright rather than left as a duplicate; this dashboard is now fully
                              read-only end to end — see .ai/FE/features/dashboard-shell.md.
src/app/permissions/page.tsx → Client Component. SUPERADMIN-only permission matrix editor — see
                              .ai/FE/features/permissions.md.
src/app/materials/page.tsx → Client Component. Materials catalog + material-requests workflow — see
                              .ai/FE/features/materials.md. First page to gate its own write actions (not
                              just sidebar visibility) on GET /permissions/me's canWrite, not just canView.
src/app/projects/page.tsx → Client Component. Full project list + stage-transition control + create
                              dialog — see .ai/FE/features/projects.md. The sole owner of project creation
                              as of 2026-08-10 (the dashboard's former duplicate was removed).
src/app/quotations/page.tsx → Client Component. Quotation list + "View details" line-item breakdown +
                              create dialog — see .ai/FE/features/quotations.md. The sole owner of
                              quotation creation as of 2026-08-10 (the dashboard's former duplicate,
                              including its own copy of the line-item editor, was removed — no longer
                              duplicated anywhere).
src/app/workers/page.tsx  → Client Component. Worker roster + inline availability-transition control +
                              create dialog — see .ai/FE/features/workers.md. Unlike Projects/Quotations,
                              Workers never had dashboard coverage before this page, so it was purely
                              additive.
src/app/leads/page.tsx    → Client Component. Lead pipeline + status-transition control + "Convert
                              to customer" action (POST /leads/:id/convert) + create dialog — see
                              .ai/FE/features/leads.md. Unlike Projects/Quotations (additive, resolved
                              later) or Workers (purely additive, nothing to resolve), this page's arrival
                              immediately deleted the dashboard's "＋ New lead" dialog in the same change.
src/app/customers/page.tsx → Client Component, new. Customer list + create dialog + a general-field Edit
                              dialog (PATCH /customers/:id, the first such capability in this FE — every
                              other dedicated page only supports create + a narrow status/stage transition)
                              — see .ai/FE/features/customers.md. The last Phase 1 CRM module to get a
                              dedicated route. Unlike every other page, Customers had zero create UI
                              anywhere before this — the only prior path to a Customer document was
                              /leads's Convert action, which this page's "Origin" column now distinguishes
                              from direct creation.
src/components/app-sidebar.tsx → shared by every route above except login. Owns the nav list, the
                              SUPERADMIN-conditional Permissions link, the user-menu DropdownMenu, and
                              Logout. Nav items without a real route still just toast "not built yet"; items
                              with one (`Overview`, `Permissions` for SUPERADMIN, `Leads`/`Customers`/
                              `Materials`/`Projects`/`Quotations`/`Workers` for roles with view access)
                              render as a real next/link via Base UI's render prop (see the Base UI section
                              below).
src/lib/auth.ts             → unchanged.
src/lib/api.ts              → gained Permission/MyPermission/Material/MaterialRequest/Worker types and
                              their corresponding list/create/update/delete/approve/reject/fulfill
                              functions; createProject() gained an endDate? param, new
                              updateProjectStage(), createWorker(), updateWorkerAvailability(),
                              updateLeadStatus(), convertLead(), createCustomer(), updateCustomer().
                              listLeads()/createLead()/Lead type and listCustomers()/Customer type already
                              existed from the very first wiring pass.
src/components/ui/          → shadcn-generated component primitives — vendored, not hand-written. Gained
                              checkbox.tsx in the permissions pass, chart.tsx in the dashboard pass (`npx
                              shadcn add chart` — see below, first chart-library usage in this project).
src/components/theme-provider.tsx, theme-toggle.tsx → unchanged. Light/dark mode.
```

## Charting: recharts via shadcn's `chart.tsx`

**Added 2026-08-10**, user-directed ("use graphs" for the dashboard redesign). `npx shadcn add chart`
installed `recharts` (first real charting dependency in this project — the pre-redesign "Lead pipeline
chart" was hand-rolled `<div>` bars with inline `height` styles, not an actual chart library) and generated
`src/components/ui/chart.tsx`: `ChartContainer` (theming/responsive sizing), `ChartTooltip`/
`ChartTooltipContent`, `ChartConfig` type, plus `ChartLegend`/`ChartLegendContent` (generated but unused so
far — see below).

- **Categorical single-series charts use `<Cell>`, not shadcn's per-series `ChartConfig` colors.** shadcn's
  chart color mechanism (`--color-<dataKey>` CSS vars set per `ChartConfig` entry) is designed for
  multi-series charts (e.g. "revenue" vs. "expenses" as two `dataKey`s). The dashboard's three charts (Lead
  pipeline, Project stages, Worker availability) are each **one series with many categories** (one bar/slice
  per status/stage) — recharts' own `<Cell>` element, one per data point inside a single `<Bar>`/`<Pie>`,
  fits this shape directly. `frontend/src/app/page.tsx`'s `CHART_PALETTE` (an 11-color hex array, sized for
  the 11-stage Project chart) is reused across all three via `data.map((_, i) => <Cell fill={CHART_PALETTE[i
  % CHART_PALETTE.length]} />)`.
- **The Worker availability pie's legend is hand-rolled**, not `<ChartLegendContent>` — that component keys
  off matching `ChartConfig` entries to each series' `dataKey`/`name`, which doesn't map cleanly onto a
  single-series categorical pie either. A manual flex row of colored dots + labels (reusing the same
  `CHART_PALETTE` indices as the `<Cell>`s) was simpler and looks identical.
- `<ChartTooltip content={<ChartTooltipContent />} />` works without a fully-populated `ChartConfig` —
  it gracefully falls back to `item.name`/`item.dataKey`/`item.payload?.fill` when a data key isn't a
  `ChartConfig` entry (verified by reading `chart.tsx`'s implementation before relying on it), so a minimal
  `{ value: { label: 'Count' } }` config is enough to get working tooltips on all three charts.

## Styling architecture: Tailwind CSS v4 + shadcn/ui

**Decision (2026-08-08, user-directed):** the frontend previously used one hand-rolled plain-CSS file with no
framework — flagged as an open question in `.ai/PROJECT.md` since the PRD suggested Tailwind. When asked for
a full visual redesign, the user chose **Tailwind + shadcn/ui** specifically (over plain Tailwind or
continuing hand-rolled CSS) for the most "modern SaaS dashboard" look with accessible primitives out of the
box.

- **`src/app/styles.css`** is now the Tailwind entry point (`@import "tailwindcss";`) plus shadcn's design
  tokens: CSS custom properties (`--background`, `--foreground`, `--primary`, `--sidebar`, etc.) defined once
  in `:root` and again in `.dark`, consumed via Tailwind's `@theme inline` block so classes like `bg-primary`
  or `text-muted-foreground` resolve correctly in both themes automatically. **Every hand-rolled class from
  before this pass (`.shell`, `.metric`, `.bar`, `.modalCard`, etc.) was deleted** — the whole page is now
  Tailwind utility classes plus shadcn components, no bespoke CSS remains.
- **Brand color layered on shadcn's neutral base**: `--primary`/`--ring`/`--sidebar-primary` were overridden
  to a deep navy (`#14283f` light / `#7d9bc4` dark) instead of shadcn's default grayscale primary, plus a
  standalone `--brand-gold` custom property (`#d8a94a` light / `#e6bc63` dark, **not** a semantic shadcn
  token — used directly via `style={{ color: 'var(--brand-gold)' }}`) for a couple of small brand accents
  (the logo mark, the header's sparkle icon). Everything else — card backgrounds, borders, muted text —
  stays on shadcn's tuned neutral scale, unmodified.
- **`components.json`**: `style: "base-nova"`, `baseColor: "neutral"`, `iconLibrary: "lucide"`,
  `cssVariables: true`, path aliases → `@/*`. This is the config the `npx shadcn add <name>` CLI reads —
  don't hand-edit generated files in `src/components/ui/` beyond trivial tweaks; re-run the CLI instead.

## ⚠️ shadcn here is built on `@base-ui/react`, not Radix

This matters if you've used shadcn/ui before and expect Radix UI underneath — **this project's shadcn CLI
version (4.16.2, `style: base-nova`) generates components on top of `@base-ui/react`** (the MUI team's
headless component library), not `@radix-ui/react-*`. Concretely:

- **No `asChild` prop.** Radix's `asChild` pattern (render your own element instead of the primitive's
  default) doesn't exist here. `DropdownMenuTrigger`, `SidebarMenuButton`, etc. either render their own
  semantic element directly (put your content as children, style via `className` — this is what
  `frontend/src/app/page.tsx`'s user-menu trigger does) or accept a Base UI `render` prop for the rare case
  you need a different underlying element.
- **`Select`'s `onValueChange` can receive `null`**, not just `string` — Base UI's `Select.Root` supports a
  deselected state Radix's doesn't expose the same way. `frontend/src/app/page.tsx` handles this with
  `onValueChange={(v) => setForm({ ...form, source: v ?? '' })}`.
- **`DropdownMenuLabel` (and other "group" parts) require a `<DropdownMenuGroup>` ancestor.** This one
  actually shipped broken and was caught live: `DropdownMenuLabel` wraps Base UI's `Menu.GroupLabel`, which
  reads a `MenuGroupContext` that only `Menu.Group` provides. The redesign's user-menu dropdown originally
  put `DropdownMenuLabel`/`DropdownMenuSeparator`/`DropdownMenuItem` directly inside `DropdownMenuContent`
  with no `DropdownMenuGroup` wrapper — compiled and type-checked fine (`tsc --noEmit` has no way to catch a
  runtime context requirement), then threw `Base UI: MenuGroupContext is missing` the moment the menu opened
  in a real browser, taking Logout down with it. Fixed by wrapping the label/separator/item in
  `<DropdownMenuGroup>`. **This is the concrete case for why `tsc --noEmit`/`next build` passing is not the
  same as verifying the UI actually works** — this bug was invisible to every check available in this
  session and only surfaced once the user opened it in a real browser.
- If you copy example code from shadcn's own docs/examples site, it will very likely assume Radix — expect to
  need small adaptations like the ones above.

## Data flow (unchanged from before the redesign)

Still exactly the login → `setSession` → dashboard `useEffect` → `listLeads()` flow documented in
`.ai/FE/features/authentication.md` and `.ai/FE/features/dashboard-shell.md`. This pass touched presentation
only — no change to what data is fetched, when, or how errors are surfaced at the network layer (though
*user-facing* error display moved from inline text to `sonner` toasts).

## Patterns and conventions actually in use

- **`components/ui/` is vendored code.** Treat it like a dependency, not application code — generated by the
  shadcn CLI, meant to be regenerated/updated via the CLI rather than hand-maintained line by line.
- **App-specific components live directly in `src/components/`** (flat, not nested under `ui/`) —
  `theme-provider.tsx`, `theme-toggle.tsx`. Only two exist so far; no deeper organization was needed yet.
- **Path aliases (`@/*`)** are now used throughout (`@/components/ui/button`, `@/lib/api`, etc.) instead of
  relative imports — added specifically because shadcn's CLI and generated components expect this alias to
  exist (`tsconfig.json`'s `baseUrl`/`paths`, `components.json`'s `aliases`).
- **Dark mode**: class-based (`next-themes` with `attribute="class"`), toggled via `theme-toggle.tsx` in the
  sidebar footer. `html` gets `suppressHydrationWarning` (required by `next-themes` — the server can't know
  the client's preferred theme before hydration, so a warning is expected and intentionally suppressed here,
  not a bug).
- **Toasts (`sonner`) replaced inline error text** for both the login form and the new-lead dialog — success
  and failure states now surface as toast notifications rather than a paragraph of red text in the form.
- **Real vs. mock data labeling — no longer needed on the dashboard as of 2026-08-10.** The `MockBadge`
  pattern (a small shadcn `Badge` marking hardcoded sections) was used from the Tailwind redesign until the
  2026-08-10 dashboard rewrite removed the last mock content ("Monthly revenue", "Pending payments", the
  fixed activity feed) — every dashboard widget is real data now, so there's nothing left to label. The
  policy itself (never silently mix real and fake data) still applies if mock content is ever reintroduced
  anywhere in this app.
- **A `401` on any authenticated call now auto-clears the session and redirects to `/login`**
  (`frontend/src/lib/api.ts`'s `request()`) — added after a real incident (see
  `.ai/FE/features/authentication.md` Known gaps) where an expired token plus a broken Logout button left the
  user stuck with no way back to the login screen. Explicitly excludes `/auth/*` endpoints, since a `401`
  from `login`/`register` means "wrong credentials," not "session expired."
- **2026-08-27: a `403` with `code` starting `ORGANIZATION_` redirects to `/pending`** — same `request()`
  helper, same pattern as the `401` handling right above it, added when multi-tenancy shipped
  (`.ai/BE/features/multi-tenancy.md`). A pending/suspended/rejected org's user gets one consistent
  holding screen instead of a different "Missing permission" toast on every dashboard widget's failed
  fetch.
- **2026-08-27: the platform-admin console runs a second, deliberately separate API client and token
  store** (`lib/platform-api.ts` / `lib/platform-auth.ts`) rather than reusing `lib/api.ts`/`lib/auth.ts`.
  This mirrors the backend's two-JWT-secret split (`.ai/BE/features/platform-admin.md`) on the
  frontend — an org session and a platform session use different `localStorage` keys and different
  401-redirect targets (`/login` vs. `/platform/login`), so the two identities can't accidentally
  cross-contaminate on the client either. `/platform`'s pages also don't render `AppSidebar` or any
  part of the org-facing dashboard shell — a standalone top bar instead.

## Trade-offs / observations

- **Gotcha hit twice this session**: running `next build` while `next dev` is running against the same
  `.next` directory corrupts it (`Cannot find module './NNN.js'` errors, dev server starts 500ing). Fix:
  stop the dev server, `rm -rf .next`, restart. Documented in `.ai/FE/OVERVIEW.md` so it isn't hit a third
  time.
- No component tests, no visual regression tests. Automated verification this pass was `tsc --noEmit`/
  `next build` (clean) and a Node script re-confirming the API contract — **none of which caught the
  DropdownMenuGroup crash**, since it's a runtime-only error. The user then manually clicked through the
  redesign in their own browser and did catch it (plus the resulting 401 trap) — this is the concrete
  evidence for why manual browser verification matters even when every automated check is green. No browser
  automation tool was available in this session to do that verification directly; it depended on the user
  doing it themselves.
- Sidebar nav items other than "Overview" now give feedback when clicked (a `sonner` toast: `"<Label> isn't
  built yet"`) instead of doing nothing silently — a small but real UX improvement over the pre-redesign
  version, where they were inert `<a>` tags with no feedback at all.

## Open questions

- Should `components/ui/` be periodically re-synced with `npx shadcn add --overwrite` as the shadcn registry
  evolves, or pinned as-is once the design settles?
- **Resolved 2026-08-08:** the user manually clicked through the redesign, confirmed login and the leads
  section work, found and reported the `DropdownMenuGroup` crash, and confirmed the fix works. Whether the
  visual result is what "elegant and modern" meant to them specifically hasn't been asked outright, but no
  further redesign request has come in either.
- **Resolved 2026-08-08 (later):** "wait until a second page needs the sidebar" — `/permissions` is that
  second page. `AppSidebar` is now shared between it and `page.tsx`.
- **Resolved 2026-08-09:** the next dedicated route was `/materials`, following the backend module rather
  than pre-existing dashboard sections.
- **Resolved 2026-08-09 (later):** `/projects` followed next, user-directed — the first dedicated route for
  a resource that already had dashboard coverage, initially left additive (dashboard card kept as-is).
- **Resolved 2026-08-09 (later still):** `/quotations` followed the same additive pattern, user-directed.
- **Resolved 2026-08-10:** the dashboard-duplication questions above resolved themselves the following day
  when the user asked for a full dashboard redesign ("all modules summary... more precise") — the
  dashboard's "Active projects"/"Recent quotations" cards lost their tables and create dialogs, becoming
  slim summaries linking to `/projects`/`/quotations`. The quotation line-item editor duplication is gone
  too (deleted from the dashboard, not extracted — moot with one consumer left).
- **Resolved 2026-08-10 (later still):** `/workers` followed, user-directed. Unlike Projects/Quotations it
  had no prior dashboard coverage to resolve — the dashboard's Workers summary card's "View all" was simply
  pointed at the new route.
- **Resolved 2026-08-10 (later still, again):** `/leads` followed next, user-directed — the last of the 5
  core CRM modules. Unlike either prior pattern, this one deleted the dashboard's create dialog outright in
  the same change rather than leaving it additive: the dashboard is now fully read-only, no create UI
  anywhere on it.
- **Resolved 2026-08-10 (later still, once more):** `/customers` followed, user-directed — the last Phase 1
  CRM module. Genuinely new capability, not a relocation: this was the first FE surface ever to call
  `POST /customers` directly, and the first page in this app with a general-field Edit dialog.
- Every core CRM module (Leads, Customers, Projects, Quotations, Workers) plus Materials and Permissions now
  has a dedicated route. What's next: Phase 2 frontend work, `GET /api/users` on the backend, ClickUp, or a
  browser-driven pass across everything shipped so far (still zero browser verification this session)?

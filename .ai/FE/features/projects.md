# Projects (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-09

## Summary

`/projects` — a dedicated project management page, following `/materials`'s pattern (view/write permission
gating, its own create dialog). Originally shipped alongside the dashboard's pre-existing "Active projects"
card (metric + table + its own "New project" dialog); **as of 2026-08-10 that dashboard card's table and
dialog are gone** — the dashboard's Projects section is now a slim read-only summary linking here (see
`.ai/FE/features/dashboard-shell.md`), so `/projects` is the only place project creation happens. Adds one
capability the old dashboard version never had: an inline stage-transition control per row.

## User-facing behaviour

- Requires an active session (same auth-gating as the dashboard); redirects to `/login` with no session.
- **View-gated**: a role without `PROJECTS:view` sees an inline "Access restricted" message (link back to
  `/`), checked via `GET /api/permissions/me`, skipped for SUPERADMIN — same pattern as `/materials`.
- **Write-gated**: "＋ New project" and the per-row stage `Select` only render if the role has
  `PROJECTS:write`; a view-only role sees a read-only `Badge` for stage instead of an editable control.
- **Table**: Project, Customer (client-side join), Stage, Progress (bar + %), Budget, Start date, End date —
  two more columns than the dashboard's version (Start date/End date), since this page has room for them and
  they were already on `Project` but not previously surfaced anywhere in the FE.
- **Stage column**: for a role with write access, this is a live `Select` (not a static badge) pre-set to
  the project's current stage, listing all 11 `PROJECT_STAGES` in pipeline order. Changing it fires
  `PATCH /projects/:id/stage` immediately (no confirmation, no separate Save step — matches this app's
  "act immediately, toast the result" convention) and refetches the list. The backend applies **no
  transition guard** here (any stage → any stage, unlike `MaterialRequest`'s approve/reject/fulfill state
  machine) — the FE doesn't invent one either; the `Select` lets you pick any of the 11 stages directly,
  matching the backend's actual (permissive) behavior rather than a stricter behavior the backend doesn't
  enforce.
- **"＋ New project" dialog**: `name`, `customerId` (`Select`, populated from `GET /api/customers`, disabled
  with a hint if there are no customers yet), `budget?`, `startDate?`, `endDate?` (new — the dashboard's
  version doesn't expose this field), `notes?`. Submits to `POST /api/projects`, refetches. Still doesn't
  expose `projectManagerId`/`supervisorId`/`progressPercent` — same reasoning as the dashboard's version
  (no `GET /users` endpoint to build a picker from; `progressPercent` has no dedicated update path either,
  see Known gaps).
- Empty state when there are zero projects, phrased differently depending on write access.

## Key files

- `frontend/src/app/projects/page.tsx` — the whole feature. Local `PROJECT_STAGES` constant mirrors
  `backend/src/common/contracts/index.ts`'s `ProjectStage` enum exactly, in pipeline order — **if the backend
  enum changes, this must be updated by hand**, same caveat as every other page's local enum mirrors.
- `frontend/src/components/app-sidebar.tsx` — "Projects" nav item's `href` changed from `null` to
  `/projects` (it already had `resource: 'PROJECTS'` from the earlier sidebar-gating work).
- `frontend/src/lib/api.ts` — `createProject()` gained an `endDate?` parameter (backward-compatible — the
  dashboard's existing call site doesn't pass it and is unaffected); new `updateProjectStage()`. Reuses the
  existing `Project`/`Customer` types and `listProjects()`/`listCustomers()` — no new types needed, unlike
  `/materials`.

## Data / API touchpoints

- `GET/POST /api/projects`, `PATCH /api/projects/:id/stage` (`.ai/BE/features/project-management.md`).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives both the page-level view gate and
  the write-gated stage control / create button.
- `GET /api/customers` (`.ai/BE/features/customer-management.md`) — read-only, for the join and the create
  dialog's picker.
- Verified live by simulating the page's exact call sequence: confirmed a zero-grant role (`SALES`) would
  hit the page's "Access restricted" branch (`GET /permissions/me` → `PROJECTS.canView === false`); granted
  `ACCOUNTANT` temporary `PROJECTS`/`CUSTOMERS` write access, ran the page's parallel page-load fetch
  (`projects` + `customers`), created a project through the dialog's exact field shape (including the new
  `endDate`), changed its stage through the same call the `Select` makes, and confirmed the created
  project's `customerId` was well-formed for `customerNameById` to resolve. 8/8 assertions passed; test data
  and the temporary grant were removed afterward.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered UI (the stage `Select`, badges, dialog) hasn't been manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating).
- `.ai/BE/features/project-management.md`.
- `.ai/FE/features/dashboard-shell.md` — shares `AppSidebar`, and the dashboard's own "Active projects"
  card/dialog were resolved into a slim summary + "View all" link as of 2026-08-10 — see that doc.

## Known gaps & TODOs

- **Resolved 2026-08-10**: the dashboard's "Active projects" card no longer has its own table or "New
  project" dialog — it's now a 4-item summary linking here. This page is the only place project creation
  happens.
- No pagination UI — fetches `limit=200`, same convention as everywhere else.
- No edit UI for general project fields (name, budget, dates, notes) after creation — only the stage
  `Select`. `PATCH /projects/:id` exists on the backend but nothing calls it from this page yet.
- No way to set `progressPercent` from the FE anywhere — the field exists and renders (as a progress bar)
  but there's no input for it. Would need the general edit capability above.
- `projectManagerId`/`supervisorId` still unset from any FE form — blocked on the same missing
  `GET /users` endpoint flagged in `.ai/FE/features/dashboard-shell.md`.

## Open questions

- **Resolved 2026-08-10**: yes, the dashboard's card is now a summary + link — see
  `.ai/FE/features/dashboard-shell.md`.

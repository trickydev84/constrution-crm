# Projects (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-24

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
- **Table**: Project, Customer (client-side join), Stage, Manager, Supervisor, Progress (bar + %), Budget,
  Start date, End date — two more columns than the dashboard's version (Start date/End date), since this
  page has room for them and they were already on `Project` but not previously surfaced anywhere in the FE.
- **Manager / Supervisor columns, added 2026-08-24** (unblocked by `GET /api/users` shipping 2026-08-10):
  for a role with `PROJECTS:write` **and** at least one row in the fetched user list, each cell is a live
  `Select` pre-set to the project's current `projectManagerId`/`supervisorId` (or a literal `"unassigned"`
  sentinel item — Base UI `Select` requires non-empty item values, so `''` can't represent "no selection").
  Choosing a name fires `PATCH /projects/:id` immediately (same "act immediately, toast" convention as the
  Stage column) with `{ projectManagerId: <id> }`; choosing "Unassigned" sends `{ projectManagerId: null }`
  — **must be `null`, not omitted** — `JSON.stringify` drops `undefined`-valued keys, which would leave the
  field unchanged server-side instead of clearing it. Confirmed live that the backend's `UpdateProjectDto`
  (`@IsOptional()`) accepts `null` and `findByIdAndUpdate` treats it as a real partial `$set`-style merge,
  not a full-document replace (a real risk worth checking before wiring this up — verified by PATCHing one
  field and confirming every other field on the document was untouched). If the picker's user list is empty
  (role has `PROJECTS:write` but no `USERS:view` grant — a separate resource permission), the cell falls back
  to plain resolved-name-or-"Unassigned" text instead of an empty, useless `Select`.
- **Stage column**: for a role with write access, this is a live `Select` (not a static badge) pre-set to
  the project's current stage, listing all 11 `PROJECT_STAGES` in pipeline order. Changing it fires
  `PATCH /projects/:id/stage` immediately (no confirmation, no separate Save step — matches this app's
  "act immediately, toast the result" convention) and refetches the list. The backend applies **no
  transition guard** here (any stage → any stage, unlike `MaterialRequest`'s approve/reject/fulfill state
  machine) — the FE doesn't invent one either; the `Select` lets you pick any of the 11 stages directly,
  matching the backend's actual (permissive) behavior rather than a stricter behavior the backend doesn't
  enforce.
- **"＋ New project" dialog**: `name`, `customerId` (`Select`, populated from `GET /api/customers`, disabled
  with a hint if there are no customers yet), `projectManagerId?`/`supervisorId?` (new 2026-08-24 — same
  `Select` + "Unassigned" pattern as the table columns, disabled with a placeholder if the corresponding user
  list is empty), `budget?`, `startDate?`, `endDate?`, `notes?`. Submits to `POST /api/projects`, refetches.
  `progressPercent` still has no input anywhere — no dedicated update path, see Known gaps.
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
- **2026-08-24**: `createProject()` gained `projectManagerId?`/`supervisorId?`; new `updateProject(id, {
  projectManagerId?, supervisorId? })` (`string | null` — `null` clears, `undefined` omits and leaves
  unchanged) wrapping the backend's general `PATCH /projects/:id`, and `listUsersByRole(role)` wrapping the
  new `GET /users?role=`. New `User` type (`_id`, `name`, `email`, `role`, `organizationId`, `active`,
  timestamps) mirroring `UserResponseDto`.

## Data / API touchpoints

- `GET/POST /api/projects`, `PATCH /api/projects/:id`, `PATCH /api/projects/:id/stage`
  (`.ai/BE/features/project-management.md`).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives both the page-level view gate and
  the write-gated stage/manager/supervisor controls and create button.
- `GET /api/customers` (`.ai/BE/features/customer-management.md`) — read-only, for the join and the create
  dialog's picker.
- **2026-08-24**: `GET /api/users?role=PROJECT_MANAGER` / `?role=SUPERVISOR` (`.ai/BE/features/user-accounts.md`)
  — read-only, for the Manager/Supervisor pickers and table-column name resolution. Gated on `USERS:view`, a
  resource distinct from `PROJECTS` — a role can have `PROJECTS:write` without it, in which case the pickers
  degrade to plain text (see above) rather than failing the page.
- Verified live by simulating the page's exact call sequence: confirmed a zero-grant role (`SALES`) would
  hit the page's "Access restricted" branch (`GET /permissions/me` → `PROJECTS.canView === false`); granted
  `ACCOUNTANT` temporary `PROJECTS`/`CUSTOMERS` write access, ran the page's parallel page-load fetch
  (`projects` + `customers`), created a project through the dialog's exact field shape (including the new
  `endDate`), changed its stage through the same call the `Select` makes, and confirmed the created
  project's `customerId` was well-formed for `customerNameById` to resolve. 8/8 assertions passed; test data
  and the temporary grant were removed afterward.
- **2026-08-24, Manager/Supervisor pickers**: granted `PROJECT_MANAGER` temporary `PROJECTS`/`CUSTOMERS`/
  `USERS` write/view access, ran the page-load sequence (`customers` + both `GET /users?role=` calls,
  confirmed no `password` field on any returned row), created a project with both `projectManagerId` and
  `supervisorId` set directly, exercised the inline reassignment `Select`'s exact call
  (`PATCH /projects/:id` with a new `supervisorId`), then the "Unassigned" path (`{ supervisorId: null }`,
  confirmed the field actually clears — not just a no-op), and confirmed a role with `PROJECTS:write` but no
  `USERS:view` grant (`SUPERVISOR`) gets a clean `403` on `GET /users` while everything else on the page
  keeps working. 14/14 assertions passed; test project deleted directly from MongoDB (no delete endpoint
  exists) and temporary grants reverted afterward. Also confirmed via a direct `PATCH` probe beforehand that
  the general `PATCH /projects/:id` route does a true partial `$set` merge, not a full-document replace —
  worth checking explicitly since Mongoose's `findByIdAndUpdate(id, plainObject)` behavior isn't obvious from
  reading the service code alone.
  **No browser-driven verification anywhere on this page** — no browser automation tool was available in
  this session; the actual rendered UI (Stage/Manager/Supervisor `Select`s, badges, dialog) hasn't been
  manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating).
- `.ai/BE/features/project-management.md`.
- `.ai/BE/features/user-accounts.md` — `GET /api/users?role=`, the source for the Manager/Supervisor pickers.
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
  but there's no input for it. Would need the general edit capability above (`PATCH /projects/:id` is now
  wired for `projectManagerId`/`supervisorId`, so extending the same route to a `progressPercent` control
  would be a small follow-up, not new plumbing).
- **Resolved 2026-08-24**: `projectManagerId`/`supervisorId` are now settable — both at creation and via a
  per-row inline `Select` on the table, backed by `GET /users?role=`. Still no general "edit project" dialog
  for `name`/`budget`/`startDate`/`endDate`/`notes` after creation — only these two fields and stage are
  editable post-creation.
- The Manager/Supervisor `Select`s list **every** user with that role, with no indication of current
  workload (e.g. how many other projects they're already assigned to) — fine at current scale, worth
  revisiting if the roster grows.

## Open questions

- **Resolved 2026-08-10**: yes, the dashboard's card is now a summary + link — see
  `.ai/FE/features/dashboard-shell.md`.
- **Resolved 2026-08-24**: the missing `GET /users` endpoint (open question in `.ai/FE/features/
  dashboard-shell.md` and the "Next" note in `.ai/PROJECT.md`) is now wired into this page for the
  Manager/Supervisor pickers.

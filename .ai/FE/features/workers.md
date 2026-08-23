# Workers (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-10

## Summary

`/workers` — a dedicated worker roster page, following `/projects`'s pattern (view/write permission gating,
an inline status-transition `Select` per row, its own create dialog). Workers had **zero** frontend wiring
before this — no dashboard section ever existed for it (unlike Projects/Quotations, which had dashboard
cards before their dedicated pages), so this is entirely additive, not a migration of anything. Also the
last of the dashboard's 4 module-summary cards to gain a real "View all" destination — its button
previously fell back to a "not built yet" toast.

## User-facing behaviour

- Requires an active session; redirects to `/login` with no session.
- **View-gated**: a role without `WORKERS:view` sees an inline "Access restricted" message, checked via
  `GET /api/permissions/me`, skipped for SUPERADMIN — same pattern as every other dedicated page.
- **Write-gated**: "＋ New worker" only renders for roles with `WORKERS:write`; the availability column
  falls back to a plain read-only `Badge` (colored by status) for view-only roles instead of an editable
  `Select`.
- **Table**: Name, Skill (badge), Phone, Daily wage, Assigned project (client-side join, `—` if unset),
  Rating (a filled star icon + number, `—` if unset), Availability.
- **Availability column**: for a role with write access, a live `Select` pre-set to the worker's current
  `availabilityStatus`, listing all 4 `WORKER_AVAILABILITY_STATUSES`. Changing it fires `PATCH
  /workers/:id/availability` immediately and refetches — same "act immediately, no confirmation" convention
  as `/projects`'s stage `Select`. The backend applies **no transition guard** here either (any status → any
  status), so the FE doesn't invent one.
- **"＋ New worker" dialog**: `name`, `phone`, `skillCategory` (`Select`, defaults to `MASON`), `dailyWage?`,
  `rating?` (1–5), `assignedProjectId?` (`Select` populated from `GET /api/projects`, disabled with a hint if
  there are no projects yet — labeled "Unassigned" as the placeholder since this field is optional, unlike
  the required customer/project pickers on other create dialogs), `notes?`. Submits to `POST /api/workers`,
  refetches.
- Empty state when there are zero workers, phrased differently depending on write access.

## Key files

- `frontend/src/app/workers/page.tsx` — the whole feature. Local `WORKER_SKILL_CATEGORIES` and
  `WORKER_AVAILABILITY_STATUSES` constants mirror `backend/src/modules/workers/worker.constants.ts` exactly
  — **update both if either backend list changes**, same caveat as every other page's local enum mirrors.
  `availabilityBadgeClass()` maps each status to a distinct color (emerald/AVAILABLE, sky/ASSIGNED, amber/
  ON_LEAVE, muted/INACTIVE) for the view-only badge — not shared with `/projects`'s stage `Badge` (plain
  `secondary` there, since 11 stages don't map cleanly to a small fixed palette the way 4 statuses do).
- `frontend/src/components/app-sidebar.tsx` — "Workers" nav item's `href` changed from `null` to `/workers`
  (already had `resource: 'WORKERS'` from the earlier sidebar-gating work).
- `frontend/src/app/page.tsx` (dashboard) — the Workers summary card's "View all" button changed from
  `comingSoon('Workers page')` to `router.push('/workers')` — see `.ai/FE/features/dashboard-shell.md`.
- `frontend/src/lib/api.ts` — gained `createWorker()` and `updateWorkerAvailability()`. `Worker` type and
  `listWorkers()` already existed (added during the 2026-08-10 dashboard redesign, before this page did).

## Data / API touchpoints

- `GET/POST /api/workers`, `PATCH /api/workers/:id/availability` (`.ai/BE/features/worker-management.md`).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives the view/write gating.
- `GET /api/projects` (`.ai/BE/features/project-management.md`) — read-only, for the join and the create
  dialog's optional project picker.
- Verified live by simulating the page's exact call sequence: confirmed a zero-grant role (`SALES`, which
  at the time only had `LEADS` access) hit the page's "Access restricted" branch before a grant; after
  granting `SALES` temporary `WORKERS`/`PROJECTS`/`CUSTOMERS` write access, ran the page's parallel
  page-load fetch (`workers` + `projects`), created a project to assign the worker to, created a worker
  through the dialog's exact field shape (confirmed it defaults to `AVAILABLE`), changed its availability
  through the same call the `Select` makes, and confirmed the worker's `assignedProjectId` was well-formed
  for the join to resolve. 8/8 assertions passed; the test worker/project/customer (none have delete
  endpoints) were removed directly from MongoDB afterward, and the temporary grant was reverted.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered UI (the availability `Select`, star rating, badges) hasn't been manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating).
- `.ai/BE/features/worker-management.md`.
- `.ai/FE/features/dashboard-shell.md` — shares `AppSidebar`; its Workers summary card now links here.

## Known gaps & TODOs

- No pagination UI — fetches `limit=200`, same convention as everywhere else.
- No edit UI for general worker fields (name, phone, wage, skill, project, rating, notes) — only the
  availability `Select`. `PATCH /workers/:id` exists on the backend but nothing calls it from this page.
- `assignedProjectId` isn't validated against real projects on the backend (documented gap, same as
  `Worker.assignedProjectId` everywhere else in this app) — the picker only offers real projects, but a
  worker's `assignedProjectId` could in principle point at a deleted-in-spirit or nonexistent project if
  ever set some other way; the join just falls back to "Unknown project" in that case.
- No daily attendance tracking — deliberately deferred to Daily Site Reports (Phase 2, not built) per the
  backend module's own documented scope, so nothing on this page attempts it either.

## Open questions

- None outstanding specific to this page — the same open questions as `/projects`/`/quotations`
  (dashboard-duplication, dedicated-route-for-Leads) already cover the pattern this page follows.

# Platform admin console (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-27

## Summary

A minimal, entirely separate admin area for the platform's master-admin: `/platform/login` +
`/platform`. Manages organization lifecycle (approve/reject/suspend/reactivate) and shows per-org
usage counts — never business records, matching the backend's own guarantee
(`.ai/BE/features/platform-admin.md`). Deliberately doesn't share `AppSidebar`, the dashboard shell,
or (critically) `lib/api.ts`'s org token/client — it has its own of everything.

## User-facing behaviour

- **`/platform/login`** — email + password, same shadcn `Card` layout as `/login` and `/signup` but
  with its own copy ("Platform Admin," "master-admin console — organization lifecycle & usage only").
  On success, stores the platform session and routes to `/platform`.
- **`/platform`** — a minimal top bar (product mark, admin name, Logout) instead of `AppSidebar`, then:
  - 5 stat tiles (`total`/`pending`/`active`/`suspended`/`rejected`) from `GET /platform/stats`.
  - A status-filtered (`All`/`Pending`/`Active`/`Suspended`/`Rejected`) `Table` of every organization:
    name, slug, a colored status `Badge`, created date, trial-end date.
  - Per-row actions, shown only for the current status: `PENDING` → Approve / Reject; `ACTIVE` →
    Suspend; `SUSPENDED` → Reactivate. Reject/Suspend open a small `Dialog` for an optional reason
    before confirming; Approve/Reactivate fire immediately (matches this app's "act immediately, toast
    the result" convention used everywhere else, e.g. `/leads`'s status `Select`).
  - A "Usage" action per row opens a `Dialog` and fetches `GET /platform/organizations/:id/usage`
    **on demand**, not for every row on page load — avoids an N+1 fetch pattern as the org list grows.
    Shows counts only (users/leads/customers/projects/quotations/workers/materials/material
    requests) plus last-activity timestamp — there is no UI path to see an org's actual records,
    matching the backend's structural guarantee.

## Key files

- `frontend/src/lib/platform-auth.ts` — `getPlatformToken()`/`getPlatformAdmin()`/
  `setPlatformSession()`/`clearPlatformSession()`. Separate `localStorage` keys
  (`ccrm.platform.token`/`ccrm.platform.admin`) from `lib/auth.ts`'s `ccrm.token`/`ccrm.user` — an
  org session and a platform session coexist in the same browser without colliding.
- `frontend/src/lib/platform-api.ts` — its own `platformRequest()` helper, **deliberately not
  reusing** `lib/api.ts`'s `request()` (which reads the org token and redirects org 401s to
  `/login`). Mirrors the backend's two-JWT-secret split on the frontend too, so a crossover is
  structurally impossible on this side as well, not just a convention. 401 here redirects to
  `/platform/login`. Exports `platformLogin`, `getPlatformStats`, `listOrganizations`,
  `approveOrganization`, `rejectOrganization`, `suspendOrganization`, `reactivateOrganization`,
  `getOrganizationUsage`.
- `frontend/src/app/platform/login/page.tsx` — the login form.
- `frontend/src/app/platform/page.tsx` — the whole dashboard: stats tiles, filterable table, row
  actions, both dialogs (reason, usage). No `SidebarProvider`/`AppSidebar` — a plain top bar built
  inline, since this area is deliberately not part of the org-facing app shell.

## Data / API touchpoints

All under `/api/platform/*` plus `POST /api/platform/auth/login` — see `.ai/BE/API.md`'s Platform
section and `.ai/BE/features/platform-admin.md`. Every call requires the platform bearer token; an
org token here fails with `401` (verified live on the backend side).

## Dependencies

- `.ai/BE/features/platform-admin.md` — the backend identity/guard/endpoints this console calls.
- `.ai/BE/features/multi-tenancy.md` — `Organization`'s status state machine, which the row actions
  and status filter are built around.

## Known gaps & TODOs

- No pagination UI on the organizations table — fetches `limit=200`, same convention as every other
  list page in this app.
- No search/name-filter input wired up yet, even though the backend's `?q=` param already supports
  it (`listOrganizations()` accepts a `q` argument, just not called from the page's UI).
- No org detail/drill-down page — the table + two dialogs is the entire admin surface.
- No browser-driven verification — matches every other page in this project; verified instead by a
  Node script simulating the exact page-load and action call sequences.

## Open questions

None outstanding for this pass.

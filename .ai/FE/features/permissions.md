# Permissions management (FE)

**Status:** shipped | **Last verified:** 2026-08-08

## Summary

`/permissions` — a SUPERADMIN-only page for configuring the role × resource permission matrix that
`backend/src/modules/permissions/` enforces on every other route (see `.ai/BE/features/permissions.md`).
Renders all 36 combinations of the 6 non-SUPERADMIN `Role` values × 6 `Resource` values as a table with a
View/Write/Delete checkbox per cell, plus a per-row "clear" button. Every toggle calls the backend
immediately — there's no separate "Save" step.

## User-facing behaviour

- Requires an active session (same auth-gating as the dashboard — see `.ai/FE/features/authentication.md`);
  redirects to `/login` with no session.
- **Role-gated, not just link-hidden**: a logged-in non-SUPERADMIN user who navigates to `/permissions`
  directly (the sidebar link is already hidden from them — see Key files) sees an inline "Access restricted"
  message with a link back to `/`, not a redirect and not a blank page. This is deliberate: the backend would
  reject these calls with a real `403` regardless, so showing *why* is more honest than silently bouncing
  them, and it avoids the surprise of a link that appears to work but does nothing.
- Table: one row per (role, resource) pair, 36 rows total, grouped visually by role (role name only printed
  on each role's first row, with a top border separating groups). Columns: Role, Resource, View, Write,
  Delete, Clear.
- Each checkbox reflects the live value from `GET /api/permissions`; toggling it fires
  `PATCH /api/permissions/:role/:resource` with just that one field, then refetches the full list to stay in
  sync with the DB. A `sonner` toast surfaces any failure (e.g. a stale/expired session).
- The "Clear" button (only enabled when the row has at least one grant) calls
  `DELETE /api/permissions/:role/:resource`, removing the row entirely rather than setting all three flags to
  `false` — functionally identical (a missing row and an all-`false` row both deny every action) but keeps
  the table free of leftover zero-grant rows. Confirmed with a success toast.
- SUPERADMIN itself is not shown in the grid — it always bypasses `PermissionsGuard` regardless of any stored
  row, so a row for it would be purely cosmetic and could misleadingly suggest it's configurable. A caption
  in the page header states this explicitly.
- No optimistic UI: each toggle shows the table's existing values until the PATCH + refetch round-trip
  completes (checkboxes are `disabled` mid-request via a `savingKey` state keyed by `role:resource`).
  Acceptable at this data scale (36 rows, admin-only screen, occasional use) — see `.ai/BE/features/permissions.md`'s
  "one DB round-trip per protected request" note for the equivalent backend-side trade-off.

## Key files

- `frontend/src/app/permissions/page.tsx` — the whole feature. Local `ROLES`/`RESOURCES` constants mirror
  `backend/src/common/contracts/index.ts`'s `Role`/`Resource` enums exactly (excluding `SUPERADMIN` from
  `ROLES`, per above) — **if either backend enum changes, these arrays must be updated by hand**, there's no
  shared-types package. `RESOURCES` gained `MATERIALS` on 2026-08-09 when the `materials` backend module
  shipped (`.ai/BE/features/material-inventory-management.md`) — the grid is now 42 rows (6 roles × 7
  resources), not 36.
- `frontend/src/components/app-sidebar.tsx` (new, extracted from `page.tsx` in this same pass) — the
  SUPERADMIN-only "Permissions" nav item (`ShieldCheck` icon) lives here, conditionally rendered via
  `user.role === 'SUPERADMIN'`, `isActive` highlighted via `usePathname()`. This is the first real
  `next/link`-based nav item in the sidebar (via Base UI's `useRender` `render` prop —
  `render={<Link href="/permissions" />}` — see `.ai/FE/ARCHITECTURE.md`'s Base UI section for why this isn't
  the Radix `asChild` pattern); every other nav item still just shows a "not built yet" toast. **Added
  2026-08-08 (later same day)**: every non-SUPERADMIN, non-"Overview" nav item is also gated on
  `GET /api/permissions/me` (`canSee()`, filters `NAV_ITEMS` by a `resource` field before rendering) — see
  `.ai/FE/features/dashboard-shell.md` for the full behavior description; this is the piece the FE permissions
  page exists to configure.
- `frontend/src/lib/api.ts` — gained `Permission`/`MyPermission` types, `listPermissions()`,
  `updatePermission()`, `deletePermission()`, `getMyPermissions()`.
- `frontend/src/components/ui/checkbox.tsx` — added via `npx shadcn add checkbox`. Wraps Base UI's
  `Checkbox.Root`/`Checkbox.Indicator`; props are `checked: boolean` / `onCheckedChange: (checked: boolean,
  eventDetails) => void` (the `checked` argument, not a bare boolean callback signature you might expect from
  a native `<input type=checkbox>` `onChange`).

## Data / API touchpoints

- `GET/PATCH/DELETE /api/permissions/...` (`.ai/BE/features/permissions.md`). All three require
  `PERMISSIONS:view`/`write`/`delete` respectively — which only SUPERADMIN has by default, so in practice
  only SUPERADMIN can ever load or use this page (the FE role check above is a UX nicety, not the real
  enforcement boundary).
- `GET /api/permissions/me` (added 2026-08-08, later same day) is **not** called from this page — it's
  consumed by `AppSidebar` (see Key files) to decide nav visibility for every role. Listed here because this
  page is where those grants actually get configured; see `.ai/FE/features/dashboard-shell.md` for the
  consuming side.
- Verified live against the running backend (not just `tsc --noEmit`): logged in as the seeded SUPERADMIN
  account, confirmed `GET /api/permissions` returns the current matrix, `PATCH .../ACCOUNTANT/WORKERS
  {canWrite:true}` sets the flag and is reflected on the next `GET`, `DELETE .../ACCOUNTANT/WORKERS` removes
  the row — this was before the 2026-08-08 (later) change described in `.ai/BE/CHANGELOG.md` that cleared
  every non-SUPERADMIN role's grants; `GET /api/permissions/me` was separately verified for both SUPERADMIN
  (all resources fully granted) and a zero-grant role (all `false`), plus one live grant/revert cycle
  (`PATCH SALES/LEADS {canView:true}` → `/me` reflects it → `DELETE` reverts it).
  **No browser-driven verification** — no browser automation tool was available in this session; the
  checkbox/table UI itself hasn't been manually clicked through by the user yet, only the underlying API
  calls it makes.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/BE/features/permissions.md` (the enforcement this page manages).
- `.ai/FE/features/dashboard-shell.md` (shares the new `AppSidebar` component with this page — see that
  doc's Key files for the sidebar-extraction note).

## Known gaps & TODOs

- No confirmation dialog before "Clear" — a misclick removes a row immediately (recoverable by re-checking
  the boxes, but not a true undo).
- No audit trail of who changed what permission when — `Permission` documents have `timestamps: true`
  (`updatedAt`) but no `changedBy` field and the UI doesn't surface `updatedAt` either.
- Refetches the entire 36-row matrix after every single toggle rather than patching local state — simple and
  always-correct, but means every checkbox click is two network round-trips instead of one. Fine at this
  scale; worth revisiting if the matrix grows much larger.

## Open questions

- Should there be a bulk "reset role to defaults" action (re-apply the seed matrix's row for one role) rather
  than clearing cells one at a time?

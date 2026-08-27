# Permissions
**Status:** shipped | **Last verified:** 2026-08-08

## Summary

Dynamic, database-backed role-permission system. SUPERADMIN decides which of the 7 `Role`s can
view/write/delete each `Resource`; every other authenticated request is checked against that matrix and
**denied by default** unless an explicit grant exists. This replaces "any authenticated user can do
anything" (the status quo before this feature) with real, configurable authorization — a genuine breaking
change, not an additive one. See `.ai/BE/CHANGELOG.md`.

**Confirmed design decisions** (user-directed, 2026-08-08):
- **Per-role**, not per-user — one shared permission set per `Role` enum value.
- **Default-deny** — no grant means no access. The single exception is SUPERADMIN, which always bypasses
  every check and can never be locked out.
- **Resource-level granularity** (view/write/delete per resource), not record-level — no resource has an
  `assignedTo`/owner field, so "can this SALES user see leads *they* created" isn't buildable yet.
- **"Write" covers create + update combined**, not split into separate permissions.
- **Permissions management is SUPERADMIN-only** — deliberately diverges from `.ai/PRODUCT_SPEC.md`'s role
  table, which describes `Administrator` as also managing permissions. SUPERADMIN can grant `ADMIN` access to
  the `PERMISSIONS` resource at any time via the API below if this should change; nothing is hardcoded to
  prevent it, it's just not seeded in by default.

## User-facing behaviour

- Every protected route across `leads`, `customers`, `projects`, `quotations`, `workers` now requires a
  specific `(resource, action)` grant, not just "any valid JWT." GET routes require `view`, POST/PATCH
  require `write`. A `403 Forbidden` with `{"message":"Missing '<action>' permission on '<resource>'"}` means
  the caller's role lacks that specific grant.
- `GET /api/permissions` — lists the full current matrix (SUPERADMIN-only in practice — see Key files for
  how that's enforced without a special-cased guard).
- `PATCH /api/permissions/:role/:resource` — updates `canView`/`canWrite`/`canDelete` for one role+resource
  pair (SUPERADMIN-only). Upserts, so it works even if the seed never created that exact row. Takes effect
  immediately on the *next* request from any user with that role — there is no caching, no restart needed,
  no delay.
- `DELETE /api/permissions/:role/:resource` (added 2026-08-08, `@RequirePermission(Resource.PERMISSIONS,
  'delete')`) — removes a role+resource row entirely. Functionally identical to `PATCH`-ing all three flags
  to `false` (a missing row and an all-`false` row both deny every action equally), but keeps the collection
  free of leftover zero-grant rows. Returns the deleted document, or `null` if no row existed for that pair.
  Built to back the frontend permissions page's per-row "Clear" button — see `.ai/FE/features/permissions.md`.
- `GET /api/permissions/me` (added 2026-08-08, later same day) — returns the **caller's own** effective
  permissions: one entry per `Resource` (`{resource, canView, canWrite, canDelete}`), defaulted to all-`false`
  for resources with no stored grant. **Open to any authenticated user**, not SUPERADMIN-only — deliberately
  undecorated with `@RequirePermission` (see Key files for why). SUPERADMIN gets every resource hardcoded to
  fully-granted rather than read from the DB, matching `PermissionsGuard`'s bypass. Built so the frontend can
  decide which nav items/actions to show without needing `PERMISSIONS:view` itself — see
  `.ai/FE/features/dashboard-shell.md`.
- SUPERADMIN bypasses all of the above unconditionally — every route works for SUPERADMIN regardless of what
  the `Permission` collection contains.

## Key files

- `backend/src/common/contracts/index.ts` — new `Resource` enum: `LEADS, CUSTOMERS, PROJECTS, QUOTATIONS,
  WORKERS, PERMISSIONS`. Deliberately excludes `USERS` (no controller exists to protect yet) and any Phase 2
  resource (Materials/Suppliers/etc. — those modules don't exist) — extend this enum only when a real
  controller needs it, not speculatively ahead of time.
- `backend/src/modules/auth/decorators/require-permission.decorator.ts` — `@RequirePermission(resource,
  action)`, `action: 'view' | 'write' | 'delete'`. Lives alongside `public.decorator.ts`/`roles.decorator.ts`
  since it's an auth-concept decorator applied from every domain controller.
- `backend/src/modules/permissions/permission.schema.ts` — `Permission` schema: `role`, `resource` (both
  Mongoose-`enum`-constrained — unlike most other schemas in this app, e.g. `Lead.status`, which are
  intentionally unconstrained strings; a typo'd role/resource here would silently create a dead, unreachable
  row, so the stakes justify the stricter schema); `organizationId` (default `'default'`); `canView`,
  `canWrite`, `canDelete` (all default `false`). Unique compound index on `{role, resource, organizationId}`.
- `backend/src/modules/permissions/permissions.service.ts` — `check()` (the guard's hot path — one
  `findOne().lean()` per protected request), `listMatrix(organizationId)`, `update()` (upsert), `remove()`
  (added 2026-08-08, `findOneAndDelete`), `myPermissions()` (added 2026-08-08 later same day — one row per
  `Resource` enum value for a given role, defaulted to all-`false` if no stored row; hardcoded fully-granted
  for SUPERADMIN rather than a DB read), `onModuleInit()` (idempotent seed, mirrors `UsersService`'s exact
  pattern, gated by new env var `SEED_PERMISSIONS`). The default seed matrix (`DEFAULT_MATRIX` constant in
  this file) is the actual source of truth for what ships — see Known gaps for the per-role rationale.
  **2026-08-27:** `listMatrix()`/`update()`/`remove()` now take a real `organizationId` from the
  caller (via `@CurrentUser('organizationId')` in the controller) instead of a hardcoded `'default'`
  literal — closing a previously-latent bug where any org's SUPERADMIN could have edited another
  org's permission matrix once real multi-tenancy existed. The seeding loop was also extracted into a
  reusable `seedOrganization(organizationId)` method so `onModuleInit()` and org signup
  (`.ai/BE/features/multi-tenancy.md`) share one implementation — a new org gets the same starter
  SUPERADMIN rows the legacy org does.
- `backend/src/modules/permissions/guards/permissions.guard.ts` — `PermissionsGuard`. No `@RequirePermission`
  metadata on a route → allow (same fail-open convention `RolesGuard` already had for missing `@Roles()`
  metadata — see Known gaps). SUPERADMIN → allow, no DB query. Otherwise → `PermissionsService.check()`,
  `403` on denial.
- `backend/src/modules/permissions/permissions.controller.ts` — `GET /permissions`, `GET /permissions/me`
  (added 2026-08-08 later same day), `PATCH /permissions/:role/:resource`, `DELETE
  /permissions/:role/:resource` (added 2026-08-08). Every route except `GET /permissions/me` is gated by
  `@RequirePermission(Resource.PERMISSIONS, ...)`. **No hardcoded SUPERADMIN role check anywhere in this
  controller** — it's locked down purely because no non-SUPERADMIN role is seeded with `PERMISSIONS` access,
  and the only way to grant that access is through this same endpoint, which itself requires
  `PERMISSIONS:write`/`delete` (which only SUPERADMIN has via bypass). Self consistent, no redundant
  authorization logic.
- `backend/src/modules/auth/auth.module.ts` — `PermissionsGuard` registered as a third `APP_GUARD`, after
  `JwtAuthGuard` and `RolesGuard` in the providers array (order matters: `PermissionsGuard` reads
  `request.user`, which `JwtAuthGuard` attaches — Nest runs global guards in registration order).
  `PermissionsModule` imported here for that DI wiring. `RolesGuard`/`@Roles()` are **kept but superseded** —
  see `.ai/BE/features/auth.md`.
- Every existing controller (`leads`, `customers`, `projects`, `quotations`, `workers`) — every route
  decorated with `@RequirePermission(Resource.X, 'view'|'write')`. One accepted coarseness: `POST
  /leads/:id/convert` creates a `Customer` internally but is gated on `LEADS:write` only, not also
  `CUSTOMERS:write` — see Known gaps.

## Data / API touchpoints

- `Permission` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Every existing endpoint in `.ai/BE/API.md` — the "Auth required" column now names the specific
  `(resource, action)` grant needed, not generic "any authenticated role."
- Verified end-to-end with a throwaway Node script (`login as all 7 seeded roles → sweep every (role,
  resource, action) combination derived directly from the seed matrix → assert 200/201 vs 403 → prove
  SUPERADMIN bypass independent of matrix rows → prove PATCH takes effect immediately by flipping SALES's
  WORKERS:view from denied to allowed and back`) — 95/95 assertions passed on the final clean run. One real
  bug was caught and fixed **in the verification script itself**, not the feature: an earlier version reused
  a live mutating `PATCH` call as the generic "write" test route for the `PERMISSIONS` resource across every
  role, so `SUPERADMIN`'s turn in the sweep (which legitimately has `PERMISSIONS:write`) executed that PATCH
  for real and polluted a later, unrelated `SALES`/`WORKERS` check reading the same row — a test-isolation
  bug, not an authorization bug. Confirmed via isolated manual `curl` calls (clean, correct `403`, including
  10 identical repeats in a tight loop) before concluding the actual guard/service logic was correct all
  along.

## Dependencies

- `.ai/BE/features/user-accounts.md` — the 7 seeded role accounts are exactly what the default matrix and
  the verification script are built around.
- `.ai/BE/features/auth.md` — `PermissionsGuard` depends on `JwtAuthGuard` having already attached
  `request.user`.

## Known gaps & TODOs

- **Fail-open on undecorated routes.** Like the (superseded) `RolesGuard`, `PermissionsGuard` allows any
  route with no `@RequirePermission()` metadata. Every real route today is decorated, but a future route
  shipped without the decorator would silently be open to any authenticated user — exactly the problem this
  feature exists to solve, just relocated to "did the developer remember the decorator." No automated
  route-coverage test exists to catch this (there is no test suite at all in this repo yet); flagged as a
  fast-follow, not built in this pass.
- **`leads/:id/convert`'s dual-resource-write coarseness** — gated on `LEADS:write` only, even though it also
  creates a `Customer`. A role with lead-write but not customer-write can still indirectly create a customer
  through this one route. Accepted as a documented simplification consistent with resource-level (not
  action-level-per-side-effect) granularity — see `.ai/BE/features/lead-management.md`.
- **Every non-SUPERADMIN role currently has zero grants** (changed 2026-08-08, user-directed — see
  `.ai/BE/CHANGELOG.md`). Previously the seed matrix gave ADMIN/SALES/PROJECT_MANAGER/SUPERVISOR/ACCOUNTANT a
  starter set of view/write grants derived from `.ai/PRODUCT_SPEC.md`'s role descriptions; that starter set
  was removed from `DEFAULT_MATRIX` (`permissions.service.ts`) and the equivalent live rows were deleted via
  `DELETE /api/permissions/:role/:resource`. Only the 6 SUPERADMIN rows remain — SUPERADMIN is now the only
  role that can access anything until an operator explicitly grants access to another role via `PATCH` (or
  the FE permissions page). `CUSTOMER` was already at zero grants before this change (see below) and is
  unaffected.
- **`CUSTOMER` role gets zero grants in the default matrix, deliberately.** With only resource-level (not
  ownership-level) scoping available, granting `CUSTOMER` view on e.g. `PROJECTS` would let any customer see
  every customer's projects — a worse leak than today's status quo. Whoever builds the customer portal next
  will need either record-level scoping (a real follow-up feature) or a dedicated customer-facing API surface
  that doesn't reuse these internal resource checks at all.
- **One DB round-trip per protected request** (`PermissionsGuard` → `PermissionsService.check()`). Fine at
  current scale; an in-memory cache invalidated on `PATCH` is a future optimization if it ever matters.
- **Default seed matrix is an editable starting point, not a spec.** `canDelete` is `false` everywhere except
  SUPERADMIN since **no delete endpoints exist anywhere in the app yet** (except `permissions` itself) — the
  field exists so it's ready when more delete endpoints do.
- **Idempotent seeding means matrix changes in code don't retroactively update an already-booted DB** —
  same caveat `UsersService`'s seeder already has. During active tuning of the default matrix, either wipe
  the `permissions` collection or `PATCH` rows manually; `onModuleInit()` only creates rows that don't
  already exist.
- **Frontend is entirely unaware of this** — no FE changes were made in this pass (explicitly out of scope).
  A `403` from any existing FE API call will surface via the existing generic `ApiError`/`sonner` toast
  handling (no special-casing needed for it to at least show *something*), but there's no permission-aware UI
  (e.g. hiding a nav item a role can't access) yet.

## Open questions

- Should `ADMIN` be granted `PERMISSIONS` access to match the PRD's "Administrator manages permissions"
  language, or stay SUPERADMIN-only indefinitely? Currently the latter, by deliberate choice — reversible any
  time via one `PATCH` call.
- Should the frontend eventually reflect the permission matrix (e.g. hide/disable nav items and buttons the
  current user's role can't use), or is a `403` + toast sufficient?

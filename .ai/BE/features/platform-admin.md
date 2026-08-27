# Platform admin (master-admin)

**Status:** shipped (core) | **Last verified:** 2026-08-27

## Summary

A completely separate identity for the platform's operator (the "master-admin"): manages
organization lifecycle (approve/reject/suspend/reactivate) and per-org usage analytics, with
**zero access to any organization's actual business data**. Not a `User`, not a `Role`, not gated by
`PermissionsGuard` at all — a distinct collection, distinct JWT secret, distinct guard, so that a
platform-admin token satisfying a business route is impossible by construction, not just unlikely by
convention.

## Design decision: why not `User` with `organizationId: null`

The rejected alternative was reusing `User`/`Role` with a new `Role.PLATFORM_ADMIN` and
`organizationId: null`. It fails on a concrete, verifiable point: `PATCH
/api/permissions/:role/:resource` upserts using **the caller's own `organizationId`**
(`permissions.controller.ts`). A platform admin with `organizationId: null` calling it would write a
real `{organizationId: null}` `Permission` row, and `PermissionsGuard.check(role, resource, null,
action)` would then find and honor it — the "no business-data access" guarantee would be a data-state
accident (nobody happened to call that route with a null org) rather than something structurally
impossible. Adding `PLATFORM_ADMIN` to the shared `Role` enum would also make it assignable to any
`User` and selectable in the per-org permissions grid, further blurring the two identities.

## User-facing behaviour

- **`POST /api/platform/auth/login`** (public) — email/password, issues a token signed with
  `PLATFORM_JWT_SECRET`, a completely different secret from `JWT_SECRET` (org tokens). An org token
  presented here, or a platform token presented on any business/org route, fails `verifyAsync`
  **cryptographically** — verified live both directions.
- **Org lifecycle**: `GET /platform/organizations` (paginated, `?status=`/`?q=` filters), `GET
  /platform/organizations/:id`, `PATCH .../approve` (`PENDING→ACTIVE`), `PATCH .../reject`
  (`PENDING→REJECTED`, optional `{reason}`), `PATCH .../suspend` (`ACTIVE→SUSPENDED`, optional
  `{reason}`), `PATCH .../reactivate` (`SUSPENDED→ACTIVE`). Each is a guarded state-machine
  transition — 400 if the org isn't in the expected starting state.
- **`GET /platform/stats`** — organization counts by status (`{total,pending,active,suspended,rejected}`).
- **`GET /platform/organizations/:id/usage`** — per-org record counts (`users`, `leads`,
  `customers`, `projects`, `quotations`, `workers`, `materials`, `materialRequests`) plus
  `lastActivityAt`. **Never actual records.**

## Key files

- `backend/src/modules/platform/platform-admin.schema.ts` — `PlatformAdmin`: `name`, `email`
  (unique, lowercase), `password` (bcrypt cost 12), `active`. Its own collection, no relation to `User`.
- `backend/src/modules/platform/platform-admins.service.ts` — `findByEmail`, `findById`, and an
  idempotent `onModuleInit` seeder (mirrors `UsersService`'s own pattern) from
  `PLATFORM_ADMIN_EMAIL`/`_NAME`/`_PASSWORD`, skippable via `SEED_PLATFORM_ADMIN=false`.
- `backend/src/modules/platform/platform-auth.service.ts` / `platform-auth.controller.ts` — login
  only; issues `{sub, email, typ: 'platform'}` — deliberately **no `organizationId`, no `role`**.
- `backend/src/modules/platform/guards/platform-admin.guard.ts` — `PlatformAdminGuard`: verifies
  with the platform-scoped `JwtService`, checks `payload.typ === 'platform'`, loads the admin by id
  and checks `active`, sets `request.platformAdmin`. **Never sets `request.user`**, so no downstream
  code (e.g. anything expecting `request.user.organizationId`) can pick up a false org context from
  a platform request. Verified by a dedicated unit spec.
- `backend/src/modules/platform/decorators/platform-admin-only.decorator.ts` — `@PlatformAdminOnly()`
  = `@Public()` (steps the global `JwtAuthGuard`/`OrganizationStatusGuard` aside — Nest evaluates
  global guards before controller-scoped ones, so `PlatformAdminGuard` still runs) +
  `@UseGuards(PlatformAdminGuard)` + `@ApiBearerAuth()`, applied at the controller class level so a
  new platform route can't be left open by omission.
- `backend/src/modules/platform/decorators/current-platform-admin.decorator.ts` —
  `@CurrentPlatformAdmin()` / `@CurrentPlatformAdmin('sub')`, reads `request.platformAdmin`.
- `backend/src/modules/platform/organization-usage.service.ts` — `OrganizationUsageService`,
  **counts-only by design**: every method returns a number or a timestamp, never a document. Only
  raw Mongoose `Model<T>`s are injected (via `MongooseModule.forFeature` directly in
  `platform.module.ts`), not the business modules' services — there is no code path from this class
  to a full `Lead`/`Customer`/... document. **Explicit invariant for future editors**: if any method
  under `modules/platform/` ever returns something other than a count or a date, the "master-admin
  has no business-data access" guarantee is broken.
- `backend/src/modules/platform/platform-organizations.controller.ts` / `.service.ts` — the
  lifecycle/usage/stats endpoints; delegates all `Organization` mutation to `OrganizationsService`
  (owned by `.ai/BE/features/multi-tenancy.md`) rather than duplicating that logic.
- `backend/src/modules/platform/platform.module.ts` — registers its own
  `JwtModule.registerAsync({...PLATFORM_JWT_SECRET...})` (mirrors `auth.module.ts`'s pattern exactly,
  for the same load-bearing reason: a bare `.register()` reads `process.env` at decorator-evaluation
  time, before `ConfigModule.forRoot()` has run — verified live that boot fails fast and cleanly with
  `PLATFORM_JWT_SECRET` unset). Imports `OrganizationsModule` (needed — org lifecycle *is* the
  master-admin's job) but deliberately **never imports `AuthModule`/`UsersModule`'s controllers, nor
  any business module's services** (`LeadsModule`, `CustomersModule`, etc.) — this is the structural
  enforcement that there is no dependency path from here to the org JWT secret or to full business
  records.

## Data / API touchpoints

See `.ai/BE/API.md`'s Platform section. All platform routes live under `/api/platform/*` except
`GET /api/organizations/me` (an org-scoped route, owned by `.ai/BE/features/multi-tenancy.md`).

## Dependencies

- `.ai/BE/features/multi-tenancy.md` — `OrganizationsService` owns all `Organization` mutation logic;
  this module only orchestrates calls into it plus the counts-only usage aggregation.
- `.ai/BE/features/production-hardening.md` — `OrganizationUsageService`'s per-collection counts and
  `lastActivityAt` lookups are served by that pass's `{organizationId:1, createdAt:-1}` indexes.

## Known gaps & TODOs

- **Single admin account, no admin-management UI.** `PLATFORM_ADMIN_EMAIL`/`_PASSWORD` seed exactly
  one admin; there's no endpoint to create/deactivate additional platform admins.
- **No audit log of lifecycle actions** (who approved/rejected/suspended which org, when) beyond the
  `approvedBy`/`approvedAt`/etc. fields already on `Organization` itself — no append-only event log.
- **No impersonation** (deliberately, per the confirmed product decision) — the master-admin can
  never see or act as a specific organization's user.
- `PLATFORM_JWT_EXPIRES_IN` defaults to 30m with no refresh mechanism, same limitation as the org
  JWT.

## Open questions

None outstanding — the "how much access does master-admin get" question was resolved by the
confirmed product decision (lifecycle + usage analytics, never business records) before this module
was designed.

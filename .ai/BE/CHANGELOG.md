# Backend — Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project has no git history
available at documentation time (working directory is not a git repository), so no dated releases can be
reconstructed. The entry below reflects the current state of `backend/` as a single baseline snapshot.

## [Unreleased]

### Added (2026-08-10)

- **`GET /api/users` and `GET /api/users/:id`** — the first public HTTP surface for `User` documents
  (previously only consumed internally by `AuthModule`). Paginated list with an optional `?role=` filter;
  both routes explicitly `.select('-password')` at the query level, never returning the hash. No
  create/update/delete route — deliberately read-only. New `Resource.USERS`; new `DEFAULT_MATRIX` row
  `{SUPERADMIN, USERS, V+W+D}`. `UsersModule` gained a `UsersController` (the module was already imported
  directly by `app.module.ts`, so no other wiring changed). Built to unblock the FE's dropped "Manager"
  column and role-based pickers; not consumed by any FE page yet. Full detail:
  `.ai/BE/features/user-accounts.md`.

### Added (2026-08-09)

- **New `materials` module — Material & Inventory Management core, the first Phase 2 module.**
  `Material` catalog (`name`, `category`, `unit`, `unitPrice`, `stockQuantity`, `reorderLevel`) and a
  `MaterialRequest` workflow (project requests a quantity of a material; `REQUESTED → APPROVED →
  FULFILLED`/`REJECTED`). New endpoints: `GET/POST /api/materials`, `GET /api/materials/low-stock`, `GET/PATCH
  /api/materials/:id`, `GET/POST /api/material-requests` (optional `?projectId=`/`?status=` filters), `GET
  /api/material-requests/:id`, `PATCH /api/material-requests/:id/approve`|`/reject`|`/fulfill`. Fulfilling
  atomically decrements stock via a conditional `findOneAndUpdate` (not read-then-write) and fails with `400`
  on insufficient stock or a non-`APPROVED` request. New `Resource.MATERIALS` in `common/contracts/index.ts`;
  new `DEFAULT_MATRIX` row `{SUPERADMIN, MATERIALS, V+W+D}` in `permissions.service.ts`. Design fork
  (centralized vs. per-project stock, catalog-only vs. +requests) resolved via `AskUserQuestion` — user chose
  centralized stock + project material requests. Full detail: `.ai/BE/features/material-inventory-management.md`.

### ⚠ Breaking

- **All routes now default-deny.** New dynamic, database-backed permission system
  (`backend/src/modules/permissions/`): SUPERADMIN configures, per role, whether `leads`/`customers`/
  `projects`/`quotations`/`workers` can be viewed/written. Any role without an explicit `Permission` grant
  now gets `403` where it previously got `200` — this affects every existing endpoint, not just new ones. A
  seed matrix (`PermissionsService`'s `DEFAULT_MATRIX`, seeded on boot like `UsersService`'s user seeder) keeps
  the 7 demo accounts usable immediately; SUPERADMIN always bypasses all checks and can never be locked out.
  New `Resource` enum (`common/contracts/index.ts`): `LEADS, CUSTOMERS, PROJECTS, QUOTATIONS, WORKERS,
  PERMISSIONS`. New `@RequirePermission(resource, action)` decorator + `PermissionsGuard`, registered as a
  third global `APP_GUARD` after `JwtAuthGuard`/`RolesGuard`. New endpoints: `GET /api/permissions`,
  `PATCH /api/permissions/:role/:resource` (both SUPERADMIN-only in practice, enforced via the same
  mechanism rather than a hardcoded role check). `RolesGuard`/`@Roles()` — previously dead code, applied to
  zero routes — are now formally superseded by this, not deleted. Full design, rationale, and the 95/95
  end-to-end verification run: `.ai/BE/features/permissions.md`.

### Added

- `DELETE /api/permissions/:role/:resource` (2026-08-08, `PERMISSIONS:delete`, SUPERADMIN-only in practice):
  removes a role+resource permission row entirely, functionally equivalent to `PATCH`-ing all three flags to
  `false` but without leaving a zero-grant row behind. `PermissionsService.remove()`. Built to back the new
  frontend permissions page's per-row "Clear" action (`.ai/FE/features/permissions.md`).
- `GET /api/permissions/me` (2026-08-08, later same day): returns the caller's own effective permissions —
  one entry per `Resource`, defaulted to all-`false` for resources with no stored grant. Open to **any**
  authenticated user, not gated by `@RequirePermission` — avoids a chicken-and-egg lockout where a
  non-SUPERADMIN role would need `PERMISSIONS:view` just to find out it has no permissions.
  `PermissionsService.myPermissions()`, new `MyPermissionDto`. Built so the frontend sidebar can show/hide
  module links per role — see `.ai/FE/features/dashboard-shell.md`.

### ⚠ Breaking (2026-08-08, later same day, user-directed)

- **Removed the starter grants for every non-SUPERADMIN role.** `DEFAULT_MATRIX` in
  `permissions.service.ts` now seeds only the 6 SUPERADMIN rows — ADMIN/SALES/PROJECT_MANAGER/SUPERVISOR/
  ACCOUNTANT previously had a starter set of view/write grants (see the matrix in the git history of this
  file / `.ai/BE/features/permissions.md`'s prior revision); all of that was intentionally removed. The
  equivalent 19 live rows in the already-seeded `permissions` collection were also deleted via
  `DELETE /api/permissions/:role/:resource` so the change took effect immediately, not just for future
  fresh installs. SUPERADMIN is now the only role with any access out of the box; every other role must be
  granted access explicitly (`PATCH /api/permissions/:role/:resource` or the FE permissions page) before it
  can do anything. Verified: `GET /api/leads` as SALES now returns `403` (previously `200`); SUPERADMIN
  unaffected.

- Global JWT authentication guard (`backend/src/modules/auth/guards/jwt-auth.guard.ts`) and role-based
  authorization guard (`backend/src/modules/auth/guards/roles.guard.ts`), registered as `APP_GUARD`
  providers so every route requires a valid Bearer token by default.
- `@Public()` decorator to exempt a route from the auth guard (applied to `auth.register` / `auth.login`).
- `@Roles(...roles: Role[])` decorator for future per-route role restriction (not yet applied to any route).

- New `customers` module (`backend/src/modules/customers/`): `Customer` schema, `CustomersService`
  (list/create/get/update, plus `findByLeadId` for conversion idempotency), `CustomersController`
  (`GET/POST /api/customers`, `GET/PATCH /api/customers/:id`).
- `POST /api/leads/:id/convert` on the existing `leads` module: converts a `WON` lead into a `Customer`
  (`404` if lead missing, `400` if not `WON`, `409` if already converted). `LeadsModule` now imports
  `CustomersModule` to call `CustomersService`.

- Full Swagger documentation for all 10 existing endpoints: `@ApiTags`, `@ApiBearerAuth` (on every protected
  controller), `@ApiOperation` summaries/descriptions, and `@ApiResponse` for every realistic status code
  (including error cases). Every request DTO now carries `@ApiProperty`/`@ApiPropertyOptional` with examples;
  every endpoint has a dedicated response DTO (`AuthResponseDto`, `LeadResponseDto`, `LeadListResponseDto`,
  `CustomerResponseDto`, `CustomerListResponseDto`) used for Swagger's `type:` option. New shared
  `backend/src/common/dto/pagination-meta.dto.ts`. Verified against the live `/docs-json` output.
- `auth`'s combined `AuthDto` split into `RegisterDto` and `LoginDto` (`backend/src/modules/auth/dto/`) so
  login no longer requires an unused `name` field — a correctness fix incidental to writing accurate Swagger
  docs for it.

- New `projects` module (`backend/src/modules/projects/`): `Project` schema (`customerId` required, `stage`
  defaulting to `PLANNING`, plus `projectManagerId`/`supervisorId`/`budget`/`startDate`/`endDate`/
  `progressPercent`/`notes`), `ProjectsService` (list/create/get/update/updateStage — `create()` validates
  `customerId` exists via `CustomersService`, throwing `404` otherwise), `ProjectsController`
  (`GET/POST /api/projects`, `GET/PATCH /api/projects/:id`, `PATCH /api/projects/:id/stage`). Fully
  Swagger-documented from the start (5 endpoints, request/response DTOs, `/docs-json` verified).

- New `quotations` module (`backend/src/modules/quotations/`): `Quotation` schema with embedded
  `QuotationLineItem` subdocuments, `QuotationsService` (list/create/get/update — `create()` validates
  `leadId` exists via `LeadsService`, throwing `404` otherwise; totals always computed server-side, discount
  applied before tax), `QuotationsController` (`GET/POST /api/quotations`, `GET/PATCH /api/quotations/:id`).
  Verified against hand-calculated totals for a real tax+discount scenario. Fully Swagger-documented from the
  start, including the nested line-item schema.
- `LeadsService` gained a public `findById()` method; `LeadsModule` now `exports: [LeadsService]` so
  `QuotationsModule` can consume it (mirrors the existing `CustomersService` export pattern).

- New `workers` module (`backend/src/modules/workers/`): `Worker` schema (`skillCategory`,
  `availabilityStatus` both strictly `@IsIn(...)`-validated against locally-defined constants — a stricter
  pattern than `Lead.status`/`Project.stage`), `WorkersService` (list/create/get/update/updateAvailability,
  self-contained, no cross-module dependency), `WorkersController` (`GET/POST /api/workers`,
  `GET/PATCH /api/workers/:id`, `PATCH /api/workers/:id/availability`). Scoped to the worker roster only —
  daily attendance logging deferred to Daily Site Reports (Phase 2) to avoid duplicating the concept. Fully
  Swagger-documented from the start. This completes every `.ai/PRODUCT_SPEC.md` Phase 1 backend module.

### Changed

- DTOs moved out of inline controller-file classes into a `dto/` subfolder per module
  (`backend/src/modules/{auth,leads,customers}/dto/`), normally formatted (one field per line) rather than
  this codebase's usual dense single-line style — necessary once `@ApiProperty()` decorators were added to
  every field. See `.ai/BE/ARCHITECTURE.md`.
- `POST /api/auth/register` now creates accounts with role `CUSTOMER` instead of `ADMIN`
  (`backend/src/modules/auth/auth.service.ts`), closing the previously open privilege-escalation gap where
  any unauthenticated caller could self-register as an administrator. Registration stays public, anticipating
  future customer self-signup for the customer portal.
- `User.role`'s Mongoose schema default changed from `'ADMIN'` to `'CUSTOMER'`
  (`backend/src/modules/users/user.schema.ts`), for the same least-privilege reasoning — this default is only
  reached if a future caller of `UsersService.create()` omits `role` entirely.

### Fixed

- Backend build was broken (`npm run build` failed) due to a missing `@types/bcrypt` dev dependency and a
  type mismatch on `JwtModule`'s `signOptions.expiresIn` (env var typed as `string`, expected `StringValue`).
  Both fixed to unblock verifying the auth-guard change.

## [0.0.0] - baseline (documented 2026-08-08)

### Added

- NestJS application bootstrap with global `/api` prefix, open CORS, global `ValidationPipe`, and Swagger UI
  at `/docs` (`backend/src/main.ts`).
- `auth` module: `POST /api/auth/register`, `POST /api/auth/login`, JWT issuance via `@nestjs/jwt`.
- `users` module: `User` Mongoose schema, `UsersService` lookup/create, idempotent startup seeder for 7
  role-based accounts.
- `leads` module: `Lead` Mongoose schema, paginated list, create, and status-update endpoints.
- Shared domain contracts (`Role`, `LeadStatus`, `ProjectStage` enums; `ApiResponse`, `ApiError`, `Money`,
  `DateRange`, `FileMetadata`, `AuditEvent` interfaces) in `backend/src/common/contracts/index.ts`.
- Standalone seed script (`npm run seed` → `backend/src/database/seed.ts`).
- Docker support (`backend/Dockerfile`) and root-level `docker-compose.yml` (mongodb + api + web).

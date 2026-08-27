# Multi-tenancy (Stage 1)

**Status:** shipped (core) | **Last verified:** 2026-08-27

## Summary

Converts the system from single-organization to real multi-tenant SaaS: any number of independent
construction companies ("organizations") can now sign up and use fully isolated instances of every
Phase 1/2 module (leads, customers, projects, quotations, workers, materials, users, permissions).
This reverses `.ai/PROJECT.md`'s prior statement that the system is "single-organization... no
per-tenant isolation logic and none is intended" — that statement was true until this pass and is
now false.

Two structural facts made this smaller than it could have been, and one made it bigger:
1. **`Permission` was already tenant-aware at the data-model level** — its schema already had a
   unique `{role, resource, organizationId}` index, and `PermissionsGuard` already read
   `request.user.organizationId` from the JWT rather than a hardcoded constant. Only the seeding
   and every *other* module's controllers hardcoded `'default'`.
2. **The JWT already carried the user's real `organizationId`** (`auth.service.ts`'s `issue()`
   always signed `user.organizationId`, not a constant) — so no token-format change was needed.
3. **The actual retrofit was bigger than "thread the org id into `list()`."** Every service's
   `findById`/`findByIdAndUpdate`-style methods queried **by `_id` alone**, with no org filter —
   e.g. `customers.service.ts`'s old `findById(id) { return this.model.findById(id).exec(); }`.
   Left alone, this would have been a live cross-tenant IDOR on every `GET/PATCH .../:id` route.
   The retrofit had to cover every by-id query, not just list endpoints.

## User-facing behaviour

- **Self-serve signup, pending approval.** `POST /api/organizations/signup` (public) creates an
  `Organization` (`status: PENDING`) and its first user (`role: SUPERADMIN`, scoped to the new org)
  in one call. No `accessToken` is returned — the org is `PENDING`, so every protected route would
  403 anyway; the caller logs in normally once approved.
- **Login always succeeds; data access doesn't.** A user whose org is `PENDING`/`SUSPENDED`/
  `REJECTED` can still `POST /auth/login` (so the frontend can show a status-specific screen), but
  every other route 403s with `{statusCode:403, message, code: 'ORGANIZATION_<STATUS>'}` until the
  org is `ACTIVE`.
- **One account = one organization.** `User.email` stays globally unique across the whole platform
  (unchanged schema constraint) — no multi-org membership, no org-switcher.
- **`slug` is the tenant key, and is immutable.** An org's `Organization.slug` is exactly the value
  stored as `organizationId` on every business document it owns. No rename endpoint exists.
- **`GET /organizations/me`** lets any authenticated user (even a `PENDING` one) discover their own
  org's name/status/trial dates — the one route exempted from the active-org check.
- **`POST /auth/register`** (public self-registration, previously always-on) is now off by default
  (`ALLOW_PUBLIC_REGISTRATION=false` → `403`) and, when enabled, requires an `organizationSlug` that
  must reference an existing `ACTIVE` org — it used to silently default into the single 'default'
  org via a Mongoose schema default that no longer exists.

## Key files

- `backend/src/modules/organizations/organization.schema.ts` — `name`, `slug` (unique, lowercase,
  `^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$`, immutable), `status` (`OrganizationStatus` enum,
  default `PENDING`), `contactEmail`, `contactPhone?`, `ownerUserId?`, `trialStartsAt?`,
  `trialEndsAt?` (`null` = no trial limit, used by the legacy org), `approvedAt?`/`approvedBy?`,
  `rejectedAt?`/`rejectionReason?`, `suspendedAt?`/`suspensionReason?`. Indexes: `{slug:1}` unique
  (from `@Prop({unique:true})`), `{status:1, createdAt:-1}`.
- `backend/src/modules/organizations/organizations.service.ts` — `findBySlug`, `findById`, `list`
  (status/name-filtered, paginated), `getStatusBySlug` (in-process TTL-cached, see below),
  `invalidate(slug)`, `signup(dto)` (see below), `seedDefaultOrganization()` (`onModuleInit`,
  idempotent — creates `{slug: DEFAULT_ORGANIZATION_ID, status: ACTIVE, trialEndsAt: null}` if
  absent), `approve`/`reject`/`suspend`/`reactivate` (state-machine-guarded, invalidate the cache on
  every transition), `stats()` (aggregate counts by status).
- `backend/src/modules/organizations/organizations.controller.ts` — `POST /organizations/signup`
  (`@Public()`, 5/min hardcoded throttle), `GET /organizations/me` (`@AllowInactiveOrganization()`).
- `backend/src/modules/organizations/organization.constants.ts` — `SLUG_PATTERN`, `RESERVED_SLUGS`
  (`www, api, app, admin, platform, docs, mail, static, assets, default, support, status, help, billing`).
- `backend/src/modules/organizations/guards/organization-status.guard.ts` — `OrganizationStatusGuard`,
  see Guard chain below. `backend/src/modules/organizations/decorators/allow-inactive-organization.decorator.ts`
  — `@AllowInactiveOrganization()`.
- `backend/src/modules/auth/decorators/current-user.decorator.ts` — `@CurrentUser()` /
  `@CurrentUser('organizationId')`, a `createParamDecorator` reading `request.user`. Used at the
  front of every retrofitted controller handler. Custom param decorators are invisible to the
  Swagger generator, so this touches ~35 handlers with zero OpenAPI churn.
- New `OrganizationStatus` enum in `backend/src/common/contracts/index.ts`.

## The retrofit — same pattern across all 9 modules

Applied identically to `leads`, `customers`, `projects`, `quotations`, `workers`, `materials`,
`material-requests`, `users`, and `permissions` (the last one easy to miss, since `PermissionsGuard`
itself needed no change — but `permissions.controller.ts` hardcoded `'default'` in `update()`/
`remove()`, and `list()` called `listMatrix()` with no argument).

**(a) Service** — `organizationId` becomes a required first parameter on every method, threaded into
every query:
```ts
// before
findById(id: string) { return this.model.findById(id).exec(); }
// after
findById(organizationId: string, id: string) { return this.model.findOne({ _id: id, organizationId }).exec(); }
```
`findByIdAndUpdate(id, ...)` → `findOneAndUpdate({_id:id, organizationId}, ...)`. `create` →
`this.model.create({...data, organizationId})`, org id stamped **last** so it wins over any
client-supplied field. `MaterialsService.decrementStock`'s existing atomic conditional
`findOneAndUpdate` gained `organizationId` into its filter. Cross-service hops thread the caller's
org id through (`ProjectsService.create → CustomersService.findById(organizationId, ...)`,
`QuotationsService.create → LeadsService.findById(organizationId, ...)`,
`MaterialRequestsService.{create,fulfill} → MaterialsService.{findById,decrementStock}(organizationId, ...)`,
`LeadsService.convertToCustomer(organizationId, id) → CustomersService.findByLeadId(organizationId, ...)`).

**(b) Controller** — one `@CurrentUser('organizationId')` param added per handler (always first),
the `'default'` literal deleted, `organizationId` passed as the service call's first argument.
Swagger decorators stay byte-identical (the decorator is invisible to the generator).

**(c) Schema** — every `@Prop({default:'default'}) organizationId!: string` became
`@Prop({required:true})`. Last line of defence: any create path that somehow misses the explicit
stamp now throws a Mongoose `ValidationError` instead of silently landing in the legacy org.
Zero-migration-safe — every existing document already had the field stored at write time under the
old default, verified by a pre-flight `countDocuments({organizationId:{$exists:false}})===0` check
on all 9 collections before shipping the schema change.

Response DTOs' `organizationId` field `@ApiProperty` examples were updated from `'default'` to a
realistic slug (`'acme-builders'`) with a description noting it's an `Organization.slug`.

## Decision: `slug`, not `_id`, is the tenant key

Every schema already stored `organizationId: 'default'` as a literal string. Creating the legacy
org's document with `slug: 'default'` meant **zero data backfill** was needed across the 9 existing
collections — no type change, no index rebuild. `slug` also becomes the future subdomain label
(`acme.yourcrm.com`) with no separate mapping table. Using `_id` instead would have forced either a
bulk backfill or a legacy org with a non-ObjectId `_id` mixed with real ObjectIds for new orgs.

## Guard chain

New global `APP_GUARD` order (registration order = execution order):
`ThrottlerGuard` → `JwtAuthGuard` (attaches `request.user`) → **`OrganizationStatusGuard`** →
`RolesGuard` (dead) → `PermissionsGuard`.

`OrganizationStatusGuard` must run **before** `PermissionsGuard` — `PermissionsGuard` bypasses
`SUPERADMIN` unconditionally, and a `PENDING` org's first user is exactly a `SUPERADMIN` (created by
signup), so if the order were reversed a pending org would sail straight through permission checks.
Logic: `@Public()` → allow; `@AllowInactiveOrganization()` → allow; no `request.user` → 403
(defensive); org not found → 403 `ORGANIZATION_NOT_FOUND`; status ≠ `ACTIVE` → 403
`ORGANIZATION_<STATUS>`. Uses `ForbiddenException` with a structured `{statusCode, message, code}`
body — the first real use of the `code` field already declared on `ApiError` in
`common/contracts/index.ts`.

**Cache**: `OrganizationsService` keeps an in-process `Map<slug, {status, expiresAt}>`
(`ORG_STATUS_CACHE_TTL_MS`, default 30000ms) so the guard doesn't hit Mongo on every request.
Explicitly invalidated on every approve/reject/suspend/reactivate — verified live that a status
change is visible immediately (not after the TTL) on the instance that served the mutation.
**Known gap**: multi-instance staleness up to the TTL — same shape as the rate limiter's
in-memory-storage gap from the prior hardening pass; same Redis fix would address both.

## Org signup — no MongoDB transaction

`docker-compose.yml` runs single-node `mongo:8`; `startTransaction()` requires a replica set and
would fail at runtime, not just be unavailable. `OrganizationsService.signup()` instead uses the
unique indexes on `Organization.slug` and `User.email` as compensating-write guards:
1. Validate slug format + not reserved; pre-check email via `UsersService.findByEmail`.
2. `Organization.create({status: PENDING, ...})` — catch `E11000` on `slug` → `409`.
3. `User.create({role: 'SUPERADMIN', organizationId: slug, ...})` — catch `E11000` on `email` →
   **delete the org just created**, then `409`. Verified live: a losing email race leaves **no**
   orphan `PENDING` org in the platform admin's queue.
4. Set `organization.ownerUserId`.
5. `PermissionsService.seedOrganization(slug)` — the `DEFAULT_MATRIX` seeding loop, extracted out of
   `onModuleInit` into a reusable method (`onModuleInit` now calls
   `seedOrganization(DEFAULT_ORGANIZATION_ID)`), so a new org gets the same starter SUPERADMIN rows
   as the legacy org. Best-effort, not rolled back on failure — `PermissionsGuard` bypasses
   `SUPERADMIN` unconditionally regardless.

## Data / API touchpoints

- `POST /api/organizations/signup`, `GET /api/organizations/me` — see `.ai/BE/API.md`.
- Every existing org-scoped route can now additionally return `403` with `code` ∈
  `ORGANIZATION_PENDING|SUSPENDED|REJECTED|NOT_FOUND`.
- `POST /api/auth/login`/`POST /api/auth/register` responses gained `user.organizationId` and a top-level
  `organization: {name, slug, status, trialEndsAt} | null` — JWT claims themselves are unchanged, so
  **pre-existing tokens keep working**.

## Dependencies

- `.ai/BE/features/permissions.md` — `PermissionsGuard` needed no change; `PermissionsService`
  gained `seedOrganization()`.
- `.ai/BE/features/platform-admin.md` — the separate identity that manages `Organization` lifecycle.
- `.ai/BE/features/production-hardening.md` — the `{organizationId:1, createdAt:-1}`-style indexes
  from that pass are exactly what make `OrganizationUsageService`'s per-org counts and
  `lastActivityAt` lookups fast.

## Known gaps & TODOs

- **Stage 2 (deferred, not built)**: `Plan`/`Subscription` models, Razorpay billing integration,
  trial-expiry lockout (the guard is designed with a future `TRIAL_EXPIRED` code in mind), usage-limit
  and feature-gate enforcement. Trial dates are written in Stage 1 precisely so Stage 2 has nothing
  to backfill.
- **Stage 3 (deferred, not built)**: real per-org subdomains — wildcard DNS/SSL, Next.js middleware
  tenant resolution from `Host`, host-header validation against the JWT's `organizationId`. `slug`
  was chosen as the tenant key specifically so this becomes a routing change later, not a data
  migration.
- No MongoDB replica set / real `withTransaction` for signup (see above) — deferred alongside Stage 3.
- No org self-service rename, no invite-based member creation (every user is either the signup-time
  SUPERADMIN or created by the seeder) — deferred.
- `projectManagerId`/`supervisorId`/`assignedProjectId`-style cross-references are still plain
  strings with no org-membership validation (unchanged from before this pass — a pre-existing gap,
  not introduced here).
- `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` seed a single platform admin; there's no
  multi-admin support or admin-management UI.

## Open questions

- Should the legacy `default` organization be renamed/rebranded once real customers exist, or should
  it stay as an internal "house" tenant indefinitely? Not decided.
- Should `ALLOW_PUBLIC_REGISTRATION` ever default to `true` (enabling the customer-portal self-signup
  the original `/auth/register` endpoint was built for), or is org-signup now the only public
  account-creation path this product wants? Not decided.

# User accounts & startup seeding
**Status:** shipped | **Last verified:** 2026-08-10

## Summary

Mongoose-backed user accounts with a role field, plus an idempotent startup seeder that provisions one
account per role for local development. **As of 2026-08-10, a read-only listing API exists**
(`GET /api/users`, `GET /api/users/:id`) — the first public HTTP surface for `User` documents; previously
they were only ever consumed internally by `AuthModule`. There is still no create/update/delete API for
users beyond auth registration and the seeder — this endpoint is intentionally list/get only.

## User-facing behaviour

- On every backend boot (unless `SEED_USERS=false`), 7 fixed accounts are created if they don't already
  exist (matched by email), one per role: `SUPERADMIN`, `ADMIN`, `SALES`, `PROJECT_MANAGER`, `SUPERVISOR`,
  `ACCOUNTANT`, `CUSTOMER`. Passwords default to `ChangeMe123!` (overridable via env), emails follow the
  `<role>@construction.local` pattern (see `backend/README.md` for the full table).
- Existing accounts (matched by email) are never overwritten — safe to restart repeatedly.
- Can also be triggered standalone via `npm run seed` (`backend/src/database/seed.ts`), which boots a Nest
  application context and lets `UsersService.onModuleInit` do the same work.
- `GET /api/users` (paginated, `?role=` optional filter) and `GET /api/users/:id` — both gated on
  `USERS:view` (new `Resource.USERS`, seeded only for SUPERADMIN by default, same zero-default-for-everyone-
  else convention as every other resource since 2026-08-08's permission reset). **Never returns the password
  hash** — excluded at the query level (`.select('-password')`), not just omitted from the response DTO.
  Built specifically to unblock two known FE gaps: resolving `Project.projectManagerId`/`supervisorId` and
  `Worker.assignedProjectId`'s counterpart (a manager/supervisor's *name*, not just their id) to a real name,
  and populating role-based pickers (e.g. `?role=PROJECT_MANAGER` for a "assign PM" dropdown) — see
  `.ai/FE/` for whichever page ends up consuming this.
- Still **no endpoint to create, update, deactivate, or delete users** — accounts only ever come from the
  seeder or `POST /auth/register` (which always creates a `CUSTOMER`, see `.ai/BE/features/auth.md`). The
  `active` field exists on the schema and is now visible in `GET /users` responses, but nothing anywhere in
  the code reads or writes it after creation — it's always `true`.

## Key files

- `backend/src/modules/users/user.schema.ts` — `User` schema: `name`, `email` (unique, lowercased),
  `password` (hashed), `role` (default `'CUSTOMER'`), `organizationId` (default `'default'`), `active`
  (default `true`); `timestamps: true`.
- `backend/src/modules/users/users.service.ts` — `findByEmail` (still returns `password`, since `AuthService`
  needs the hash to verify login), `create`, `onModuleInit` (the seeder), and new `list()`/`findById()` —
  both explicitly `.select('-password')`, the only two methods on this service safe to expose over HTTP.
- `backend/src/modules/users/users.controller.ts` — **new**. `GET /users`, `GET /users/:id`, both
  `@RequirePermission(Resource.USERS, 'view')`. No `POST`/`PATCH`/`DELETE` — deliberately read-only, matching
  the task this was built for ("build the GET /api/users endpoint," not a full user-management API).
- `backend/src/modules/users/dto/user-response.dto.ts` — mirrors the schema minus `password`, with a
  comment noting the exclusion is enforced at the query level, not just here.
- `backend/src/modules/users/dto/user-list-response.dto.ts` — standard `{data, meta}` pagination shape,
  same as every other list endpoint.
- `backend/src/modules/users/users.module.ts` — now also registers `UsersController` (previously only
  exported `UsersService` for `AuthModule` to consume — already imported directly by `app.module.ts`, so no
  other wiring was needed).
- `backend/src/common/contracts/index.ts` — `Resource` enum gained `USERS`.
- `backend/src/modules/permissions/permissions.service.ts` — `DEFAULT_MATRIX` gained one row:
  `{SUPERADMIN, USERS, V+W+D}` (cosmetic, like every other SUPERADMIN row — bypass makes it informational
  only; every non-SUPERADMIN role has zero grants by default, same as every other resource).
- `backend/src/database/seed.ts` — standalone seed script entry point, unchanged.
- `backend/README.md` — documents the seeded account table and default password, unchanged.

## Data / API touchpoints

- `User` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Consumed internally by `.ai/BE/features/auth.md` (`AuthService` calls `UsersService.findByEmail` / `create`
  — unaffected by this change, still gets the full document including `password`).
- See `.ai/BE/API.md`'s two new rows for `GET /api/users` and `GET /api/users/:id`.
- Verified live: confirmed `GET /users` returns `200` with the correct `{data,meta}` shape, every seeded
  role present, and **no `password` field on any returned document** (checked `Object.keys()` on every row,
  not just spot-checked one); confirmed `?role=PROJECT_MANAGER` filters correctly; confirmed `GET
  /users/:id` returns the matching document, also without `password`; confirmed `SALES` (no `USERS` grant)
  gets `403`; confirmed both routes and the `UserResponseDto` schema (with `password` absent from its
  properties) appear correctly in the live `/docs-json` Swagger spec. 9/9 assertions passed. Read-only
  verification — no new documents created, nothing to clean up.

## Dependencies

- `bcrypt` for password hashing (cost factor 12, same as auth).
- Env vars: `SEED_USERS`, `SEED_DEFAULT_PASSWORD`, `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`,
  `DEFAULT_ORGANIZATION_ID`.
- `.ai/BE/features/permissions.md` — the new `USERS:view` gate this endpoint requires.

## Known gaps & TODOs

- **Still no create/update/deactivate/delete user endpoints** — this pass deliberately scoped to
  read-only listing, matching exactly what was asked. A fuller user-management API (edit role, deactivate,
  reset password) remains unbuilt.
- No email-verification or invite flow; seeded credentials are the only bootstrap mechanism besides
  self-registration (which is always `CUSTOMER`, see `.ai/BE/features/auth.md`).
- `GET /users` has no filter beyond `?role=` — no search by name/email, no `active`-only filter.
- Nothing in the FE calls this endpoint yet — it exists to unblock future work (the dashboard's dropped
  "Manager" column, a richer permissions UI, PM/supervisor pickers on `/projects`), none of which was wired
  up in this pass.

## Open questions

- Is a fuller user-management API (edit role, deactivate, reset password) planned, or does this app's scope
  stop at read-only listing plus the seeder? **Status: still undecided.**
- Should the FE now build on top of this — e.g. resolve `Project.projectManagerId`/`supervisorId` to real
  names on `/projects`, or restore the dashboard's dropped "Manager" column?

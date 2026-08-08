# User accounts & startup seeding
**Status:** shipped | **Last verified:** 2026-08-08

## Summary

Mongoose-backed user accounts with a role field, plus an idempotent startup seeder that provisions one
account per role for local development. No CRUD API exists for managing users beyond auth registration and
the seeder.

## User-facing behaviour

- On every backend boot (unless `SEED_USERS=false`), 7 fixed accounts are created if they don't already
  exist (matched by email), one per role: `SUPERADMIN`, `ADMIN`, `SALES`, `PROJECT_MANAGER`, `SUPERVISOR`,
  `ACCOUNTANT`, `CUSTOMER`. Passwords default to `ChangeMe123!` (overridable via env), emails follow the
  `<role>@construction.local` pattern (see `backend/README.md` for the full table).
- Existing accounts (matched by email) are never overwritten — safe to restart repeatedly.
- Can also be triggered standalone via `npm run seed` (`backend/src/database/seed.ts`), which boots a Nest
  application context and lets `UsersService.onModuleInit` do the same work.
- No endpoint exists to list, update, or delete users — this is persistence + seeding only.

## Key files

- `backend/src/modules/users/user.schema.ts` — `User` schema: `name`, `email` (unique, lowercased),
  `password` (hashed), `role` (default `'ADMIN'`), `organizationId` (default `'default'`), `active`
  (default `true`); `timestamps: true`.
- `backend/src/modules/users/users.service.ts` — `findByEmail`, `create`, and `onModuleInit` (the seeder
  logic, including the hardcoded list of 7 `SeedUser` entries).
- `backend/src/modules/users/users.module.ts` — registers the Mongoose feature and exports `UsersService`
  for `AuthModule` to consume.
- `backend/src/database/seed.ts` — standalone seed script entry point.
- `backend/README.md` — documents the seeded account table and default password.

## Data / API touchpoints

- `User` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Consumed by `.ai/BE/features/auth.md` (`AuthService` calls `UsersService.findByEmail` / `create`).

## Dependencies

- `bcrypt` for password hashing (cost factor 12, same as auth).
- Env vars: `SEED_USERS`, `SEED_DEFAULT_PASSWORD`, `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD`,
  `DEFAULT_ORGANIZATION_ID`.

## Known gaps & TODOs

- No user management endpoints (list/update role/deactivate) exist — `active` field is defined on the schema
  but nothing in the code ever reads or sets it after creation.
- No email-verification or invite flow; seeded credentials are the only bootstrap mechanism besides
  self-registration (which is always `ADMIN`, see `.ai/BE/features/auth.md`).

## Open questions

- Is a user-management API (list/edit/deactivate users) planned, or is the seeder considered sufficient for
  this system's scope? **Status: still undecided** — confirmed as unresolved on 2026-08-08.

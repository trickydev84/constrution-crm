# Backend — Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). This project has no git history
available at documentation time (working directory is not a git repository), so no dated releases can be
reconstructed. The entry below reflects the current state of `backend/` as a single baseline snapshot.

## [Unreleased]

### Added

- Global JWT authentication guard (`backend/src/modules/auth/guards/jwt-auth.guard.ts`) and role-based
  authorization guard (`backend/src/modules/auth/guards/roles.guard.ts`), registered as `APP_GUARD`
  providers so every route requires a valid Bearer token by default.
- `@Public()` decorator to exempt a route from the auth guard (applied to `auth.register` / `auth.login`).
- `@Roles(...roles: Role[])` decorator for future per-route role restriction (not yet applied to any route).

### Changed

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

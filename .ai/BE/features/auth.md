# Authentication
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Registration and login endpoints that issue a JWT, plus a global `JwtAuthGuard` + `RolesGuard` that enforce
it on every route by default. `POST /api/auth/register` and `POST /api/auth/login` are the only public
(unauthenticated) routes, marked via `@Public()` — every other controller in the app (currently just
`leads`) now requires a valid Bearer token, with no per-route opt-in needed for new controllers.

## User-facing behaviour

- `POST /api/auth/register` — creates a new user with `name`, `email`, `password`. The created user is
  **always** given role `CUSTOMER`, regardless of any role field in the request (there isn't one accepted) —
  this is public self-signup for the eventual customer portal, not a way to create staff accounts. Staff
  accounts (`ADMIN`, `SALES`, `PROJECT_MANAGER`, etc.) are only created via the startup seeder — see
  `.ai/BE/features/user-accounts.md`. Returns an access token and a user summary, identical shape to login.
- `POST /api/auth/login` — validates email + password (bcrypt compare) and returns the same token/user shape.
- On success, both endpoints return:
  ```json
  { "accessToken": "<jwt>", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }
  ```
- Invalid login credentials or a duplicate email on register both raise `401 Unauthorized`.

## Key files

- `backend/src/modules/auth/auth.controller.ts` — routes `POST /auth/register`, `POST /auth/login`, both
  marked `@Public()`; inline `AuthDto` (`name`, `email`, `password`, min length 8).
- `backend/src/modules/auth/auth.service.ts` — `register()` (hardcodes `role: 'CUSTOMER'`), `login()`
  (bcrypt compare), `issue()` (signs the JWT with `sub`, `email`, `role`, `organizationId`).
- `backend/src/modules/auth/auth.module.ts` — registers `JwtModule` with `JWT_SECRET` / `JWT_EXPIRES_IN` from
  env (falls back to `'dev-secret'` / unset if missing); imports `UsersModule`; registers `JwtAuthGuard` and
  `RolesGuard` as `APP_GUARD` providers, making them apply to every route in the app, not just this module.
- `backend/src/modules/auth/guards/jwt-auth.guard.ts` — global guard: allows `@Public()` routes through,
  otherwise requires a `Bearer <token>` header, verifies it via the injected `JwtService`, and attaches the
  decoded payload to `request.user`. Throws `401` on a missing or invalid/expired token.
- `backend/src/modules/auth/guards/roles.guard.ts` — global guard: no-ops unless a route/controller carries
  `@Roles(...)` metadata, in which case it checks `request.user.role` against the allowed list. Throws `403`
  if the authenticated user's role isn't permitted. (Runs after `JwtAuthGuard` in the `APP_GUARD` chain, so
  `request.user` is already populated when it runs.)
- `backend/src/modules/auth/decorators/public.decorator.ts` — `@Public()`, exempts a route/controller from
  `JwtAuthGuard`.
- `backend/src/modules/auth/decorators/roles.decorator.ts` — `@Roles(...roles: Role[])`, restricts a
  route/controller to specific roles via `RolesGuard`. Not yet applied to any route — no controller currently
  declares role restrictions; every authenticated user can hit every non-public route today.

## Data / API touchpoints

- Reads/writes via `UsersService` (`backend/src/modules/users/users.service.ts`) → `User` Mongoose model.
- Passwords hashed with `bcrypt`, cost factor 12.
- JWT payload: `{ sub: userId, email, role, organizationId }`.

## Dependencies

- `.ai/BE/features/user-accounts.md` (auth delegates all persistence to `UsersService`)
- `@nestjs/jwt`, `bcrypt`

## Known gaps & TODOs

- **Resolved 2026-08-08:** `register` no longer grants `ADMIN` — it now creates a `CUSTOMER` account
  (confirmed choice: keep registration public, anticipating customer self-signup for the portal, rather than
  gating it behind admin auth or removing it). There is still no way to self-register as staff, and no
  endpoint exists yet to promote a `CUSTOMER` account or create staff accounts outside the seeder.
- `RolesGuard` and `@Roles()` exist but aren't applied anywhere yet — every authenticated user, regardless of
  role, can currently call every non-public route (e.g. `leads`). Per-route role restrictions are a follow-up
  decision, not yet made for any endpoint.
- No refresh-token or logout mechanism — only short-lived access tokens (`JWT_EXPIRES_IN`, default `15m`).
- No password-reset flow (required by `.ai/PRODUCT_SPEC.md` Module 1).
- No activity/audit logs (required by `.ai/PRODUCT_SPEC.md` Module 1 — the shared `AuditEvent` contract in
  `backend/src/common/contracts/index.ts` exists but nothing writes to it).
- No user profile management endpoints (view/edit own profile).

## Open questions

- Which roles should be allowed to call which existing/future endpoints? `RolesGuard`/`@Roles()` are ready to
  use but no per-endpoint role policy has been decided yet (e.g. should `leads` writes be restricted to
  `SALES`/`ADMIN`?).

# Authentication
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Registration and login endpoints that issue a JWT, plus a global `JwtAuthGuard` that enforces a valid token
on every route by default. `POST /api/auth/register` and `POST /api/auth/login` are the only public
(unauthenticated) routes, marked via `@Public()` — every other controller in the app now requires a valid
Bearer token, with no per-route opt-in needed for new controllers. **Authorization** (which authenticated
role can do what) is a separate concern, handled by `PermissionsGuard` — see `.ai/BE/features/permissions.md`.

## User-facing behaviour

- `POST /api/auth/register` — creates a new user with `name`, `email`, `password`. The created user is
  **always** given role `CUSTOMER`, regardless of any role field in the request (there isn't one accepted) —
  this is public self-signup for the eventual customer portal, not a way to create staff accounts. Staff
  accounts (`ADMIN`, `SALES`, `PROJECT_MANAGER`, etc.) are only created via the startup seeder — see
  `.ai/BE/features/user-accounts.md`. Returns an access token and a user summary, identical shape to login.
- `POST /api/auth/login` — validates email + password (bcrypt compare) and returns the same token/user shape.
- On success, both endpoints return `201` (Nest's default for `@Post()` with no `@HttpCode()` override —
  applies to login too, despite not creating anything):
  ```json
  { "accessToken": "<jwt>", "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }
  ```
- Invalid login credentials or a duplicate email on register both raise `401 Unauthorized`.
- Both endpoints, and every DTO in the app, are now fully Swagger-documented — see `/docs` /
  `/docs-json` and `.ai/BE/ARCHITECTURE.md`.

## Key files

- `backend/src/modules/auth/auth.controller.ts` — routes `POST /auth/register`, `POST /auth/login`, both
  marked `@Public()`, both fully Swagger-annotated (`@ApiTags`, `@ApiOperation`, `@ApiResponse`).
- `backend/src/modules/auth/dto/register.dto.ts` — `RegisterDto` (`name`, `email`, `password`, min length 8).
- `backend/src/modules/auth/dto/login.dto.ts` — `LoginDto` (`email`, `password`, min length 8) — split out
  from the old combined `AuthDto` so login no longer requires an unused `name` field.
- `backend/src/modules/auth/dto/auth-response.dto.ts` — `AuthResponseDto` / `AuthUserDto`, the documented
  response shape for both endpoints (Swagger `type:` only — not runtime-enforced serialization).
- `backend/src/modules/auth/auth.service.ts` — `register()` (hardcodes `role: 'CUSTOMER'`, typed to accept
  `RegisterDto`), `login()` (bcrypt compare), `issue()` (signs the JWT with `sub`, `email`, `role`,
  `organizationId`).
- `backend/src/modules/auth/auth.module.ts` — registers `JwtModule` with `JWT_SECRET` / `JWT_EXPIRES_IN` from
  env (falls back to `'dev-secret'` / unset if missing); imports `UsersModule` and `PermissionsModule`;
  registers `JwtAuthGuard`, `RolesGuard`, and (2026-08-08) `PermissionsGuard` as `APP_GUARD` providers, in
  that order — order matters, `PermissionsGuard` reads `request.user`, which only exists after `JwtAuthGuard`
  runs.
- `backend/src/modules/auth/guards/jwt-auth.guard.ts` — global guard: allows `@Public()` routes through,
  otherwise requires a `Bearer <token>` header, verifies it via the injected `JwtService`, and attaches the
  decoded payload to `request.user`. Throws `401` on a missing or invalid/expired token.
- `backend/src/modules/auth/guards/roles.guard.ts` — global guard: no-ops unless a route/controller carries
  `@Roles(...)` metadata, in which case it checks `request.user.role` against the allowed list. Throws `403`
  if the authenticated user's role isn't permitted. **Superseded 2026-08-08**: kept as harmless unused
  infrastructure (no route uses `@Roles()`, none should going forward), but real per-route authorization is
  now `PermissionsGuard`/`@RequirePermission()` — see `.ai/BE/features/permissions.md`. This file's `@Roles()`
  decorator and this guard exist only for historical/potential reasons; don't reach for them on new routes.
- `backend/src/modules/auth/decorators/public.decorator.ts` — `@Public()`, exempts a route/controller from
  `JwtAuthGuard`.
- `backend/src/modules/auth/decorators/roles.decorator.ts` — `@Roles(...roles: Role[])`, restricts a
  route/controller to specific roles via `RolesGuard`. Still applied to zero routes; superseded, see above.
- `backend/src/modules/auth/decorators/require-permission.decorator.ts` — **the real authorization mechanism**
  (2026-08-08). `@RequirePermission(resource, action)`, consumed by `PermissionsGuard`. See
  `.ai/BE/features/permissions.md` for the full design.

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
- **Resolved 2026-08-08, but via a different mechanism than originally planned**: per-route authorization now
  exists, but it's `PermissionsGuard`/`@RequirePermission()` (a dynamic, database-backed, SUPERADMIN
  configurable system), not `RolesGuard`/`@Roles()` (which would have been a static, code-only,
  redeploy-to-change mechanism). See `.ai/BE/features/permissions.md`.
- No refresh-token or logout mechanism — only short-lived access tokens (`JWT_EXPIRES_IN`, default `15m`).
- No password-reset flow (required by `.ai/PRODUCT_SPEC.md` Module 1).
- No activity/audit logs (required by `.ai/PRODUCT_SPEC.md` Module 1 — the shared `AuditEvent` contract in
  `backend/src/common/contracts/index.ts` exists but nothing writes to it).
- No user profile management endpoints (view/edit own profile).

## Open questions

None outstanding here — resolved by `.ai/BE/features/permissions.md` (which has its own, separate open
questions, e.g. whether `ADMIN` should get `PERMISSIONS` access to match the PRD).

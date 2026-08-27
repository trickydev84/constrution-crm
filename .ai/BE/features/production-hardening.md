# Production hardening (Phase 1)

**Status:** shipped | **Last verified:** 2026-08-24

## Summary

A code-only production-readiness pass, prompted by the user asking whether this repo could handle
"millions of traffic" — the honest answer was no (see the audit in `.ai/PROJECT.md`'s 2026-08-24
entry). This module closes the gaps that were fully within the repo's control: a real security bug
(JWT secret silently ignored), missing DB indexes, no security headers/rate limiting, no health
check, no connection tuning, and a test-infra facade (`npm test` referenced `jest` without `jest`
ever being installed). It does **not** attempt actual horizontal-scale infrastructure (replicated
DB, load balancer, CDN, distributed cache) — those are hosting decisions outside what editing this
repo can produce; see `.ai/PROJECT.md`'s *Scaling & deployment (out of repo)* section.

## User-facing behaviour

- **Breaking: every existing session is invalidated.** The JWT-secret fix means the effective
  signing secret changed; all previously issued tokens fail verification and every user must log in
  again. No data loss.
- **Breaking: CORS is now an allow-list, not wide open.** A browser origin not in `ALLOWED_ORIGINS`
  (default `http://localhost:3000`) is now blocked where it previously succeeded.
- **New: `GET /api/health`** — public, unauthenticated, unthrottled. `200 {"status":"ok","timestamp":...}`
  when MongoDB is reachable, `503` otherwise. For load balancers/orchestrators, not consumed by the FE.
- **New: rate limiting.** Every route can now return `429 {"statusCode":429,"message":"ThrottlerException: Too Many Requests"}`
  past its limit — 300 requests/minute per IP by default, 20/minute specifically on
  `POST /auth/register` and `POST /auth/login`. Verified the `429` body's `message` is a plain
  string (not an array), so the frontend's `Array.isArray(body.message)` branch in `lib/api.ts`
  still renders it correctly as a toast.
- **New: boot now fails fast if `JWT_SECRET` is unset**, instead of silently signing every token
  with a hardcoded fallback.
- No other response shapes changed. List responses are unchanged (`{data, meta}`), just faster on
  larger collections.

## Key files

- `backend/src/modules/auth/auth.module.ts` — **the security fix.** `JwtModule.register({ secret:
  process.env.JWT_SECRET || 'dev-secret' })` replaced with `JwtModule.registerAsync({ inject:
  [ConfigService], useFactory })`. This is load-bearing, not stylistic: the old `.register()` call
  read `process.env.JWT_SECRET` at **decorator-evaluation time** — which happens when
  `auth.module.ts` is `import`ed at the top of `app.module.ts`, i.e. before `app.module.ts`'s own
  body runs `ConfigModule.forRoot()`. Verified live before fixing: `process.env.JWT_SECRET` was
  `undefined` at that point unless it was already in the OS-level environment (not just `.env`), so
  every JWT was silently signed with `'dev-secret'`. `useFactory` runs at Nest's
  module-instantiation phase instead, after `ConfigModule` has loaded `.env`, and now throws
  (`Error('JWT_SECRET must be set')`) if the secret is still missing — verified live: booting with
  `JWT_SECRET` stripped from `.env` throws immediately with a clear message instead of starting.
- `backend/src/modules/auth/auth.controller.ts` — `register`/`login` gained
  `@Throttle({ default: { limit: 20, ttl: 60000 } })`, hardcoded literals rather than env reads for
  the same reason as above (a controller decorator evaluates at import time too).
- `backend/src/main.ts` — `app.use(helmet({ contentSecurityPolicy: false }))` (CSP disabled: the
  default policy breaks Swagger UI's inline bootstrap script at `/docs`, and buys little for a JSON
  API whose only HTML surface is that page), `app.use(compression())`, CORS rebuilt as an
  env-driven allow-list (`ALLOWED_ORIGINS`, comma-separated, `'*'` escape hatch), and
  `app.enableShutdownHooks()` for graceful shutdown on `SIGINT`/`SIGTERM`.
- `backend/src/app.module.ts` — `MongooseModule.forRoot()` gained connection options
  (`maxPoolSize`/`minPoolSize`/`serverSelectionTimeoutMS`/`socketTimeoutMS`/`autoIndex`, all
  env-configurable, defaults matching the driver's own defaults); new
  `ThrottlerModule.forRoot([...])` + `{ provide: APP_GUARD, useClass: ThrottlerGuard }`; new
  `HealthModule` import.
- `backend/src/modules/health/` — new module. `health.controller.ts` (`GET /health`, `@Public()`,
  `@SkipThrottle()`, checks `connection.readyState === 1` then `connection.db.admin().ping()`),
  `health.module.ts`, `dto/health-response.dto.ts`. Deliberately **not** `@nestjs/terminus`: it pulls
  peer deps spanning gRPC/Prisma/TypeORM/Sequelize/MikroORM/`@nestjs/axios` for a single check this
  project needs, and imposes its own response envelope/decorator idiom in a repo that already has
  one convention (hand-documented Swagger + a plain response DTO). Revisit when a second dependency
  (Redis, S3, an external API) needs its own health indicator.
- Every `*.schema.ts` under `backend/src/modules/{leads,customers,projects,quotations,workers,
  materials,users}/` — one or more `Schema.index(...)` calls added, matching each `list()` method's
  actual filter/sort. Full table in `.ai/BE/DATA_MODEL.md`'s Indexes section.
- `backend/jest.config.js`, `backend/tsconfig.build.json` (new — required so `nest build`, which
  picks `tsconfig.build.json` over `tsconfig.json` when present, doesn't start emitting
  `*.spec.js` into `dist/`), three new specs:
  `backend/src/modules/quotations/quotations.service.spec.ts`,
  `backend/src/modules/permissions/guards/permissions.guard.spec.ts`,
  `backend/src/modules/health/health.controller.spec.ts`.
- `backend/.env.example` — new vars: `ALLOWED_ORIGINS`, `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`,
  `MONGO_MAX_POOL_SIZE`, `MONGO_MIN_POOL_SIZE`, `MONGO_SERVER_SELECTION_TIMEOUT_MS`,
  `MONGO_SOCKET_TIMEOUT_MS`, `MONGO_AUTO_INDEX`.

## Data / API touchpoints

- `GET /api/health` — new, `@Public()`, unthrottled. No auth required.
- Every existing route can now return `429` (rate limit) in addition to its documented responses.
- No request/response body shapes changed on any existing route.

## Dependencies

- New runtime deps: `helmet`, `compression`, `@nestjs/throttler`.
- New dev deps: `@nestjs/testing`, `jest`, `ts-jest`, `@types/jest`, `supertest`,
  `@types/supertest`, `@types/compression`.
- Installed with `--legacy-peer-deps`: this repo's `package-lock.json` already carried a peer
  conflict (`@nestjs/swagger@8.1.1` wants `@nestjs/common@^9||^10`, this repo runs `^11`) predating
  this pass — not introduced here, just newly triggered by npm's stricter resolver on a fresh
  install. Not fixed in this pass (would mean bumping `@nestjs/swagger`, out of scope — see Known
  gaps).

## Known gaps & TODOs

- **In-memory throttler storage is per-instance.** With N horizontally-scaled app instances, the
  effective rate limit becomes N×`THROTTLE_LIMIT`. Fix is `ThrottlerStorageRedisService` — deferred
  to Phase 3 (once Redis exists for another reason too, e.g. caching).
- **No `trust proxy` configured, deliberately.** Enabling it without an actual reverse proxy in
  front would let any client spoof `X-Forwarded-For` and evade IP-based throttling entirely. Should
  be enabled together with the load balancer that would make it correct (Phase 3).
- **Deep pagination (`skip()`) is unchanged** — still O(skip) for the pages the indexes now serve
  efficiently for read filtering, but far-out pages of a very large collection are still slow. Not
  addressed this pass.
- **`Customer.leadId`'s index is `sparse`, not `unique`.** Making it unique would enforce the
  "already converted" invariant at the DB layer, but would turn the lead-conversion race-loser's
  clean `409 ConflictException` (from `LeadsService`) into a raw driver `E11000` error surfaced to
  the frontend as an ugly message. Deliberately deferred.
- **No structured request logging** — still Nest's default `Logger` only. No log aggregation/sink
  decision has been made, and adopting one (e.g. `nestjs-pino`) changes every log line's shape, so
  it's deferred rather than rushed alongside this pass.
- **No response-DTO serialization enforcement** (`ClassSerializerInterceptor`) — controllers still
  return raw Mongoose documents (including `__v`); response DTOs remain Swagger-shape-only. Touches
  every controller; real behavior-change risk; deferred.
- **Pre-existing `npm audit` findings** (1 critical, 4 high, 1 moderate) traced to `bcrypt`'s native
  build chain (`@mapbox/node-pre-gyp` → `tar`) and `@nestjs/swagger`'s transitive `js-yaml`/`lodash`
  — confirmed none trace to any package added in this pass. Not fixed here; `@nestjs/swagger`'s
  underlying peer conflict (see Dependencies) would need resolving first.
- **Frontend has no request-caching/dedup layer** (no SWR/React Query) — every dedicated page
  re-fetches everything on mount. Named as Phase 2, not attempted here.
- No CI — every check in this pass was run manually (see the 2026-08-24 `.ai/PROJECT.md` entry for
  the exact commands), matching this repo's established no-CI workflow.

## Open questions

None specific to this module. See `.ai/PROJECT.md`'s *Scaling & deployment (out of repo)* section
for what real horizontal scale would actually require.

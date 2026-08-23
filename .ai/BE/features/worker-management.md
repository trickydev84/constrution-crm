# Worker management
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Module 6 of `.ai/PRODUCT_SPEC.md` — Phase 1. Worker **roster**: profile, skill category, daily wage,
availability status, current project assignment, rating. **Scoping decision made without a clarifying
question** (documented here, not left as an open question): the PRD lists "daily attendance" under both
Worker Management (Module 6) and again under Daily Site Reports (Module 11, Phase 2, per-day/per-project
attendance captured in a supervisor's report). Building day-by-day attendance logging twice would duplicate
the concept, so this module intentionally covers only the roster — attendance tracking will live with Daily
Site Reports when that module is built. Workers are **not** `User` accounts — no login exists for them (the
Worker mobile app is Phase 3), so this is a self-contained module with no cross-module dependency, the same
shape `customers` had before other modules started depending on it.

## User-facing behaviour

- `POST /api/workers` — create from `CreateWorkerDto { name, phone, skillCategory, dailyWage?,
  assignedProjectId?, rating?, notes? }`. `skillCategory` is strictly validated against a fixed list (see
  below) — invalid values are rejected with `400`, unlike `Lead.status`/`Project.stage` which accept any
  string. `availabilityStatus` always starts at `AVAILABLE`; not accepted from the client on create.
- `GET /api/workers?page=&limit=` — paginated list, newest first, scoped to the (single, fixed) organization.
- `GET /api/workers/:id` — fetch one worker.
- `PATCH /api/workers/:id` — update `name`, `phone`, `skillCategory`, `dailyWage`, `assignedProjectId`,
  `rating`, `notes`. Does **not** accept `availabilityStatus` — use the dedicated endpoint below.
- `PATCH /api/workers/:id/availability` — moves a worker between `AVAILABLE → ASSIGNED → ON_LEAVE →
  INACTIVE` (not an ordered pipeline — any transition is allowed). Strictly validated against the fixed list
  (`400` on invalid value), mirroring the `leads`/`projects` status-transition endpoint pattern but with real
  enum enforcement this time.
- All five endpoints require authentication (global `JwtAuthGuard`) **and**, since 2026-08-08, a specific
  `WORKERS:view`/`WORKERS:write` grant configured by SUPERADMIN — see `.ai/BE/features/permissions.md`.
  Fully Swagger-documented (`@ApiTags('Workers')`, `@ApiBearerAuth()`, `@ApiOperation`/`@ApiResponse` per
  route) — verified against the live `/docs-json`.

## Key files

- `backend/src/modules/workers/worker.constants.ts` — `WORKER_SKILL_CATEGORIES` (`MASON`, `ELECTRICIAN`,
  `PLUMBER`, `CARPENTER`, `PAINTER`, `MARBLE_WORKER`, `WELDER` — from the Master Plan's worker categories)
  and `WORKER_AVAILABILITY_STATUSES` (`AVAILABLE`, `ASSIGNED`, `ON_LEAVE`, `INACTIVE` — **invented for this
  module**, not PRD-specified; the PRD asks for an "availability status" field but doesn't enumerate values).
  Neither list is in the shared `backend/src/common/contracts/index.ts` — kept local since the frontend
  doesn't consume it yet and, unlike `Role`/`LeadStatus`/`ProjectStage`, these weren't pre-existing shared
  contracts.
- `backend/src/modules/workers/worker.schema.ts` — `Worker` schema: `name`, `phone`, `skillCategory`
  (required); `dailyWage`, `assignedProjectId`, `rating` (1–5, optional), `notes` (optional);
  `availabilityStatus` (default `'AVAILABLE'`); `organizationId` (default `'default'`); `timestamps: true`.
- `backend/src/modules/workers/dto/create-worker.dto.ts` / `dto/update-worker.dto.ts` /
  `dto/update-worker-availability.dto.ts` — `skillCategory`/`availabilityStatus` validated with `@IsIn(...)`
  against the constants above (strict — rejects unknown values, unlike `Lead.status`/`Project.stage`'s loose
  `@IsString()`). `assignedProjectId` is format-validated only (`@IsMongoId()`), not existence-checked.
- `backend/src/modules/workers/dto/worker-response.dto.ts` / `dto/worker-list-response.dto.ts` — documented
  response shapes; list wrapper reuses `backend/src/common/dto/pagination-meta.dto.ts`.
- `backend/src/modules/workers/workers.service.ts` — `list()`, `findById()`, `create()`, `update()`,
  `updateAvailability()`. No cross-module calls.
- `backend/src/modules/workers/workers.controller.ts` — routes, fully Swagger-annotated.
- `backend/src/modules/workers/workers.module.ts` — `exports: [WorkersService]` pre-emptively, anticipating
  Daily Site Reports will need it once built (same reasoning `customers`/`leads` were exported before anyone
  consumed them).

## Data / API touchpoints

- `Worker` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- No cross-module dependency (self-contained, like `customers` originally was).
- Full endpoint table: `.ai/BE/API.md`.

## Dependencies

- `.ai/BE/features/auth.md` (all routes require a valid JWT).
- Loosely related to `.ai/BE/features/project-management.md` via the unvalidated `assignedProjectId` field.

## Known gaps & TODOs

Per `.ai/PRODUCT_SPEC.md` Module 6, this covers profile/skill/wage/availability/assignment/rating. Not built:
- **Daily attendance logging** — deliberately deferred to Daily Site Reports (Module 11, Phase 2, still
  `planned`) rather than built twice. See Summary above.
- **`assignedProjectId` is not validated** against `ProjectsService` — unlike `Project.customerId` or
  `Quotation.leadId`, any syntactically-valid Mongo ID is accepted even if no such project exists. Left
  unvalidated deliberately: workers move between projects frequently, so this is treated as a soft reference
  (same treatment as `Project.projectManagerId`/`supervisorId`), not the core relationship the module is
  built around.
- **No currency handling** — `dailyWage` is a bare number, consistent with `Project.budget`/`Quotation`
  monetary fields.
- No delete endpoint (matches every other module's convention).
- **Resolved 2026-08-08:** role restriction now exists via `WORKERS:view`/`write` grants — see
  `.ai/BE/features/permissions.md`. As of 2026-08-08 (later same day) the default seed matrix grants
  **no role except SUPERADMIN** any access by default — every other role needs an explicit grant via
  `PATCH /api/permissions/:role/:resource` (or the FE permissions page) before it can view/write workers.

## Open questions

- `WORKER_AVAILABILITY_STATUSES` was invented for this pass (`AVAILABLE`/`ASSIGNED`/`ON_LEAVE`/`INACTIVE`) —
  does this match how the business actually wants to track worker availability, or should the vocabulary
  change (e.g. distinguish "on leave" reasons, or track availability per-date rather than as a single current
  status)?
- Should `assignedProjectId` become the validated/enforced relationship once Daily Site Reports needs to
  cross-reference workers and projects reliably?

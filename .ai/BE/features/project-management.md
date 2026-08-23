# Project management
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Module 4 of `.ai/PRODUCT_SPEC.md` — Phase 1. Each project belongs to an existing `Customer` (required,
validated on create), moves through the `ProjectStage` pipeline, and carries budget/timeline/progress fields.
No PRD open questions blocked this build — the PRD is explicit that "each customer project becomes a
workspace," so `customerId` is required by design, matching the precedent set by
`.ai/BE/features/customer-management.md` (Customer → Project is a straightforward required foreign key, no
conversion gate needed the way Lead → Customer had one).

## User-facing behaviour

- `POST /api/projects` — create a project from `CreateProjectDto { name, customerId, projectManagerId?,
  supervisorId?, budget?, startDate?, endDate?, progressPercent?, notes? }`. `customerId` must reference an
  existing `Customer` — `404` if not found. `stage` always starts at schema default `PLANNING`; not accepted
  from the client on create.
- `GET /api/projects?page=&limit=` — paginated list, newest first, scoped to the (single, fixed)
  organization.
- `GET /api/projects/:id` — fetch one project.
- `PATCH /api/projects/:id` — update `name`, `projectManagerId`, `supervisorId`, `budget`, `startDate`,
  `endDate`, `progressPercent`, `notes`. **`customerId` is intentionally not updatable** — a project cannot
  be reassigned to a different customer through this endpoint.
- `PATCH /api/projects/:id/stage` — moves a project through `ProjectStage` (`PLANNING → FOUNDATION →
  STRUCTURE → BRICKWORK → PLUMBING → ELECTRICAL → FLOORING → PAINTING → INTERIOR → INSPECTION → HANDOVER`).
  Not enum-validated at the API layer, same as `lead-management`'s status endpoint — any string is accepted.
- All five endpoints require authentication (global `JwtAuthGuard`) **and**, since 2026-08-08, a specific
  `PROJECTS:view`/`PROJECTS:write` grant configured by SUPERADMIN — see `.ai/BE/features/permissions.md`.
  Fully Swagger-documented (`@ApiTags('Projects')`, `@ApiBearerAuth()`, `@ApiOperation`/`@ApiResponse` per
  route) — verified against the live `/docs-json`.

## Key files

- `backend/src/modules/projects/project.schema.ts` — `Project` schema: `name`, `customerId` (required);
  `stage` (default `'PLANNING'`); `projectManagerId`, `supervisorId`, `budget`, `startDate`, `endDate`,
  `progressPercent` (0–100), `notes` (optional); `organizationId` (default `'default'`); `timestamps: true`.
- `backend/src/modules/projects/dto/create-project.dto.ts` — `CreateProjectDto`; `customerId`/
  `projectManagerId`/`supervisorId` validated as Mongo ObjectId format (`@IsMongoId()`), dates as ISO strings
  (`@IsDateString()`), `progressPercent` bounded 0–100.
- `backend/src/modules/projects/dto/update-project.dto.ts` — `UpdateProjectDto` (all fields optional,
  `customerId` deliberately excluded).
- `backend/src/modules/projects/dto/update-project-stage.dto.ts` — `UpdateProjectStageDto`.
- `backend/src/modules/projects/dto/project-response.dto.ts` — `ProjectResponseDto` (documented response
  shape, Swagger `type:` only).
- `backend/src/modules/projects/dto/project-list-response.dto.ts` — `ProjectListResponseDto`; reuses the
  shared `backend/src/common/dto/pagination-meta.dto.ts`.
- `backend/src/modules/projects/projects.service.ts` — `list()`, `findById()`, `update()`, `updateStage()`,
  and `create()` (validates `customerId` exists via injected `CustomersService`, throws `404` otherwise).
  Uses a local `ProjectInput` type (`Omit<Partial<Project>, 'startDate'|'endDate'> & { startDate?: string |
  Date; endDate?: string | Date }`) since the DTOs validate dates as ISO strings but the schema stores `Date`
  — Mongoose casts the string on write, but TypeScript needs the looser type to compile without `any`.
- `backend/src/modules/projects/projects.controller.ts` — routes, fully Swagger-annotated.
- `backend/src/modules/projects/projects.module.ts` — imports `CustomersModule` for the create-time
  existence check.

## Data / API touchpoints

- `Project` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Cross-module dependency: `ProjectsModule` → `CustomersModule` (one-directional; mirrors the
  `LeadsModule` → `CustomersModule` dependency already established).
- Full endpoint table: `.ai/BE/API.md`.

## Dependencies

- `.ai/BE/features/customer-management.md` (a project requires an existing customer).
- `.ai/BE/features/auth.md` (all routes require a valid JWT).

## Known gaps & TODOs

Per `.ai/PRODUCT_SPEC.md` Module 4, this covers workspace/timeline/budget/progress basics. Not built:
- **`projectManagerId`/`supervisorId` are not validated** against `UsersService` — unlike `customerId`, any
  syntactically-valid Mongo ID is accepted even if no such user exists, or if the referenced user doesn't
  actually have the `PROJECT_MANAGER`/`SUPERVISOR` role. Deliberately deferred to keep this pass scoped —
  `customerId` got validation because it's the core relationship the module is built around; these two are
  softer references.
- **No "Team" beyond PM/Supervisor** — the PRD lists "Team" as a stored concept, but with no `Worker` module
  yet (`.ai/BE/features/worker-management.md`, still `planned`), there's nothing meaningful to reference for
  a broader crew assignment.
- **No distinct "milestones"** — the PRD lists milestones separately from stage progress, but this pass
  treats `stage` transitions and the flat `progressPercent` field as the only progress-tracking primitives.
  What a "milestone" is, distinct from a stage transition, was flagged as an open design question when this
  module was first scoped and still isn't resolved.
- **No drawings/documents** — same file-storage dependency blocking this across every module (see
  `.ai/PROJECT.md` Open questions).
- **No currency handling** — `budget` is a bare number, no currency field, consistent with the rest of the
  app not using the unused `Money` interface in `backend/src/common/contracts/index.ts`.
- No delete endpoint (matches `leads`/`customers` convention).
- **Resolved 2026-08-08:** role restriction now exists via `PROJECTS:view`/`write` grants — see
  `.ai/BE/features/permissions.md`. As of 2026-08-08 (later same day) the default seed matrix grants
  **no role except SUPERADMIN** any access by default — every other role needs an explicit grant via
  `PATCH /api/permissions/:role/:resource` (or the FE permissions page) before it can view/write projects.

## Open questions

- What constitutes a "milestone" distinct from a `ProjectStage` transition? Still open from initial scoping.
- Should `projectManagerId`/`supervisorId` eventually be validated against `UsersService` (existence + role
  check), the way `customerId` is validated against `CustomersService`?

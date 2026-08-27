# Backend — API reference

All routes are prefixed with `/api` (set in `backend/src/main.ts`). Swagger UI is live at `/docs` (raw JSON
at `/docs-json`) when the server is running. Full Swagger documentation (request DTOs, response DTOs,
error-status descriptions) is a standing convention applied to every endpoint at creation time — see project
memory `feedback_swagger_docs` — not a one-time backfill; the table below reflects every endpoint as of
2026-08-09.

**Org-scoped routes are three guard layers, all required, in this order**: a global `JwtAuthGuard`
requires a valid `Authorization: Bearer <token>` on every route except those marked `@Public()`;
a global `OrganizationStatusGuard` (added 2026-08-27) then requires the caller's `Organization` to be
`ACTIVE` (`403` with `code: ORGANIZATION_PENDING|SUSPENDED|REJECTED|NOT_FOUND` otherwise — see
`.ai/BE/features/multi-tenancy.md`); a global `PermissionsGuard` then requires a specific
`(Resource, action)` grant on top of that (see `.ai/BE/features/permissions.md`) — **breaking change,
2026-08-08**: every route below that used to say "any authenticated role" now requires the named grant
specifically. **As of 2026-08-08 (later, user-directed), SUPERADMIN is the only role seeded with any grants
at all** — the other 6 seeded demo accounts (`ADMIN`/`SALES`/`PROJECT_MANAGER`/`SUPERVISOR`/`ACCOUNTANT`/
`CUSTOMER`) get `403` on every protected route until SUPERADMIN explicitly grants them access via
`PATCH /api/permissions/:role/:resource` (or the FE `/permissions` page). `RolesGuard`/`@Roles()` still exist
but are unused/superseded — see `.ai/BE/features/auth.md`.

**Platform routes (`/api/platform/*`) are a completely separate auth chain** (2026-08-27): a
`PlatformAdminGuard` verifies a token signed with `PLATFORM_JWT_SECRET` (a different secret from
`JWT_SECRET`) and never touches `JwtAuthGuard`/`OrganizationStatusGuard`/`PermissionsGuard` — see
`.ai/BE/features/platform-admin.md`. An org token and a platform token are mutually rejected on each
other's routes.

Request/response DTOs live under `modules/<name>/dto/*.dto.ts` — see each feature file's Key files section
for exact filenames. The table below is a human-readable summary; `/docs` is the authoritative, always-current
reference.

| Method | Path | Auth required | Request DTO | Response DTO | Error cases | Source |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | No (`@Public()`), but **off by default** (`ALLOW_PUBLIC_REGISTRATION=false` → `403`) | `RegisterDto`: `{ name, email, password (min 8), organizationSlug }` — `role` not accepted from client, always `CUSTOMER`; `organizationSlug` must reference an existing `ACTIVE` org | `201 AuthResponseDto: { accessToken, user: { id, name, email, role, organizationId }, organization }` | `401` if email already registered; `403` if disabled; `404` if `organizationSlug` invalid/inactive | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts` |
| POST | `/api/auth/login` | No (`@Public()`) — succeeds even for a `PENDING`/`SUSPENDED`/`REJECTED` org | `LoginDto`: `{ email, password (min 8) }` | `201 AuthResponseDto` — **not 200**: Nest's default status for `@Post()` with no `@HttpCode()` override is `201`, never overridden here, so login also returns `201` despite not creating anything | `401` if user not found or password mismatch | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts` |
| POST | `/api/organizations/signup` | No (`@Public()`), 5/min | `CreateOrganizationSignupDto`: `{ organizationName, slug, adminName, adminEmail, adminPassword, contactPhone? }` | `201 OrganizationSignupResponseDto: { organization, user }` — no `accessToken` | `400` invalid/reserved slug; `409` slug or email taken; `429` | `backend/src/modules/organizations/organizations.controller.ts`, `organizations.service.ts` |
| GET | `/api/organizations/me` | JWT only (`@AllowInactiveOrganization()` — works for any status) | none | `200 MyOrganizationResponseDto: { name, slug, status, trialStartsAt, trialEndsAt }` | `401`; `404` if org not found | `backend/src/modules/organizations/organizations.controller.ts` |
| POST | `/api/platform/auth/login` | No (`@Public()`), 10/min | `PlatformLoginDto`: `{ email, password }` | `201 PlatformLoginResponseDto: { accessToken, admin }` | `401`; `429` | `backend/src/modules/platform/platform-auth.controller.ts` |
| GET | `/api/platform/stats` | Platform admin only | none | `200 PlatformStatsResponseDto: { total, pending, active, suspended, rejected }` | `401` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| GET | `/api/platform/organizations` | Platform admin only | Query: `status?`, `q?`, `page?`, `limit?` | `200 OrganizationListResponseDto` | `401` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| GET | `/api/platform/organizations/:id` | Platform admin only | none | `200 OrganizationResponseDto` | `401`; `404` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| PATCH | `/api/platform/organizations/:id/approve` | Platform admin only | none | `200 OrganizationResponseDto` (status → `ACTIVE`) | `400` if not `PENDING`; `401`; `404` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| PATCH | `/api/platform/organizations/:id/reject` | Platform admin only | `RejectOrganizationDto`: `{ reason? }` | `200 OrganizationResponseDto` (status → `REJECTED`) | `400` if not `PENDING`; `401`; `404` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| PATCH | `/api/platform/organizations/:id/suspend` | Platform admin only | `SuspendOrganizationDto`: `{ reason? }` | `200 OrganizationResponseDto` (status → `SUSPENDED`) | `400` if not `ACTIVE`; `401`; `404` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| PATCH | `/api/platform/organizations/:id/reactivate` | Platform admin only | none | `200 OrganizationResponseDto` (status → `ACTIVE`) | `400` if not `SUSPENDED`; `401`; `404` | `backend/src/modules/platform/platform-organizations.controller.ts` |
| GET | `/api/platform/organizations/:id/usage` | Platform admin only | none | `200 OrganizationUsageResponseDto` — counts + `lastActivityAt` only, never records | `401`; `404` | `backend/src/modules/platform/platform-organizations.controller.ts`, `organization-usage.service.ts` |
| GET | `/api/leads` | `LEADS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 LeadListResponseDto: { data: LeadResponseDto[], meta: PaginationMetaDto }` | `401` if token missing/invalid; `403` if role lacks `LEADS:view` | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts` |
| POST | `/api/leads` | `LEADS:write` | `CreateLeadDto`: `{ name, phone, email?, source?, notes? }` | `201 LeadResponseDto` | `401`/`403`; `400` if `name`/`phone` missing | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts` |
| PATCH | `/api/leads/:id/status` | `LEADS:write` | `UpdateLeadStatusDto`: `{ status }` (not enum-validated) | `200 LeadResponseDto` (or `null` if `id` not found) | `401`/`403`; no explicit 404 handling — returns `null` body if not found | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts` |
| POST | `/api/leads/:id/convert` | `LEADS:write` (only — not also `CUSTOMERS:write`, even though it creates a `Customer`; see `.ai/BE/features/permissions.md` Known gaps) | none | `201 CustomerResponseDto` | `401`/`403`; `404` if lead not found; `400` if lead status isn't `WON`; `409` if already converted | `backend/src/modules/leads/leads.controller.ts`, `leads.service.ts`, `backend/src/modules/customers/customers.service.ts` |
| GET | `/api/customers` | `CUSTOMERS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 CustomerListResponseDto: { data: CustomerResponseDto[], meta: PaginationMetaDto }` | `401`/`403` | `backend/src/modules/customers/customers.controller.ts`, `customers.service.ts` |
| GET | `/api/customers/:id` | `CUSTOMERS:view` | none | `200 CustomerResponseDto` (or `null` if not found) | `401`/`403`; no explicit 404 — returns `null` body if not found | `backend/src/modules/customers/customers.controller.ts`, `customers.service.ts` |
| POST | `/api/customers` | `CUSTOMERS:write` | `CreateCustomerDto`: `{ name, phone, email?, address?, notes? }` | `201 CustomerResponseDto` | `401`/`403`; `400` if `name`/`phone` missing | `backend/src/modules/customers/customers.controller.ts`, `customers.service.ts` |
| PATCH | `/api/customers/:id` | `CUSTOMERS:write` | `UpdateCustomerDto`: all fields optional | `200 CustomerResponseDto` (or `null` if not found) | `401`/`403`; no explicit 404 — returns `null` body if not found | `backend/src/modules/customers/customers.controller.ts`, `customers.service.ts` |
| GET | `/api/projects` | `PROJECTS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 ProjectListResponseDto: { data: ProjectResponseDto[], meta: PaginationMetaDto }` | `401`/`403` | `backend/src/modules/projects/projects.controller.ts`, `projects.service.ts` |
| GET | `/api/projects/:id` | `PROJECTS:view` | none | `200 ProjectResponseDto` (or `null` if not found) | `401`/`403`; no explicit 404 — returns `null` body if not found | `backend/src/modules/projects/projects.controller.ts`, `projects.service.ts` |
| POST | `/api/projects` | `PROJECTS:write` | `CreateProjectDto`: `{ name, customerId, projectManagerId?, supervisorId?, budget?, startDate?, endDate?, progressPercent?, notes? }` | `201 ProjectResponseDto` | `401`/`403`; `404` if `customerId` doesn't reference an existing customer; `400` on validation failure | `backend/src/modules/projects/projects.controller.ts`, `projects.service.ts` |
| PATCH | `/api/projects/:id` | `PROJECTS:write` | `UpdateProjectDto`: all fields optional, `customerId` not included (immutable) | `200 ProjectResponseDto` (or `null` if not found) | `401`/`403`; no explicit 404 — returns `null` body if not found | `backend/src/modules/projects/projects.controller.ts`, `projects.service.ts` |
| PATCH | `/api/projects/:id/stage` | `PROJECTS:write` | `UpdateProjectStageDto`: `{ stage }` (not enum-validated) | `200 ProjectResponseDto` (or `null` if not found) | `401`/`403`; no explicit 404 handling | `backend/src/modules/projects/projects.controller.ts`, `projects.service.ts` |
| GET | `/api/quotations` | `QUOTATIONS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 QuotationListResponseDto: { data: QuotationResponseDto[], meta: PaginationMetaDto }` | `401`/`403` | `backend/src/modules/quotations/quotations.controller.ts`, `quotations.service.ts` |
| GET | `/api/quotations/:id` | `QUOTATIONS:view` | none | `200 QuotationResponseDto` (or `null` if not found) | `401`/`403`; no explicit 404 | `backend/src/modules/quotations/quotations.controller.ts`, `quotations.service.ts` |
| POST | `/api/quotations` | `QUOTATIONS:write` | `CreateQuotationDto`: `{ leadId, lineItems: [{ description, category: 'MATERIAL'\|'LABOR', quantity, unitPrice }] (min 1), taxPercent?, discountPercent?, notes?, terms? }` | `201 QuotationResponseDto` — server-computed `subtotal`/`discountAmount`/`taxAmount`/`total`, discount applied before tax | `401`/`403`; `404` if `leadId` doesn't reference an existing lead; `400` on validation failure (e.g. empty `lineItems`) | `backend/src/modules/quotations/quotations.controller.ts`, `quotations.service.ts` |
| PATCH | `/api/quotations/:id` | `QUOTATIONS:write` | `UpdateQuotationDto`: all fields optional, `leadId` not included (immutable); `lineItems` if provided replaces the whole array | `200 QuotationResponseDto` — totals always recomputed | `401`/`403` | `backend/src/modules/quotations/quotations.controller.ts`, `quotations.service.ts` |
| GET | `/api/workers` | `WORKERS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 WorkerListResponseDto: { data: WorkerResponseDto[], meta: PaginationMetaDto }` | `401`/`403` | `backend/src/modules/workers/workers.controller.ts`, `workers.service.ts` |
| GET | `/api/workers/:id` | `WORKERS:view` | none | `200 WorkerResponseDto` (or `null` if not found) | `401`/`403` | `backend/src/modules/workers/workers.controller.ts`, `workers.service.ts` |
| POST | `/api/workers` | `WORKERS:write` | `CreateWorkerDto`: `{ name, phone, skillCategory, dailyWage?, assignedProjectId?, rating?, notes? }` | `201 WorkerResponseDto` | `401`/`403`; `400` if `skillCategory` isn't one of `MASON\|ELECTRICIAN\|PLUMBER\|CARPENTER\|PAINTER\|MARBLE_WORKER\|WELDER`, or other validation failure | `backend/src/modules/workers/workers.controller.ts`, `workers.service.ts` |
| PATCH | `/api/workers/:id` | `WORKERS:write` | `UpdateWorkerDto`: all fields optional, `availabilityStatus` not included (use the dedicated endpoint) | `200 WorkerResponseDto` (or `null` if not found) | `401`/`403` | `backend/src/modules/workers/workers.controller.ts`, `workers.service.ts` |
| PATCH | `/api/workers/:id/availability` | `WORKERS:write` | `UpdateWorkerAvailabilityDto`: `{ availabilityStatus }`, strictly validated against `AVAILABLE\|ASSIGNED\|ON_LEAVE\|INACTIVE` | `200 WorkerResponseDto` (or `null` if not found) | `401`/`403`; `400` if value isn't in the allowed list | `backend/src/modules/workers/workers.controller.ts`, `workers.service.ts` |
| GET | `/api/materials` | `MATERIALS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`) | `200 MaterialListResponseDto: { data: MaterialResponseDto[], meta: PaginationMetaDto }` | `401`/`403` | `backend/src/modules/materials/materials.controller.ts`, `materials.service.ts` |
| GET | `/api/materials/low-stock` | `MATERIALS:view` | none | `200`, plain array of `MaterialResponseDto` where `stockQuantity <= reorderLevel` (not `{data,meta}` — a bounded "alerts" view) | `401`/`403` | `backend/src/modules/materials/materials.controller.ts`, `materials.service.ts` |
| GET | `/api/materials/:id` | `MATERIALS:view` | none | `200 MaterialResponseDto` (or `null` if not found) | `401`/`403` | `backend/src/modules/materials/materials.controller.ts`, `materials.service.ts` |
| POST | `/api/materials` | `MATERIALS:write` | `CreateMaterialDto`: `{ name, category, unit, unitPrice?, stockQuantity?, reorderLevel?, notes? }` | `201 MaterialResponseDto` | `401`/`403`; `400` if `category` isn't one of `CEMENT\|SAND\|STEEL\|BRICKS\|MARBLE\|TILES\|PAINT\|OTHER`, or other validation failure | `backend/src/modules/materials/materials.controller.ts`, `materials.service.ts` |
| PATCH | `/api/materials/:id` | `MATERIALS:write` | `UpdateMaterialDto`: all fields optional, including `stockQuantity` for direct corrections | `200 MaterialResponseDto` (or `null` if not found) | `401`/`403` | `backend/src/modules/materials/materials.controller.ts`, `materials.service.ts` |
| GET | `/api/material-requests` | `MATERIALS:view` | Query: `page`, `limit`, optional `projectId`, `status` | `200 MaterialRequestListResponseDto: { data: MaterialRequestResponseDto[], meta: PaginationMetaDto }` | `401`/`403` | `backend/src/modules/materials/material-requests.controller.ts`, `material-requests.service.ts` |
| GET | `/api/material-requests/:id` | `MATERIALS:view` | none | `200 MaterialRequestResponseDto` (or `null` if not found) | `401`/`403` | `backend/src/modules/materials/material-requests.controller.ts`, `material-requests.service.ts` |
| POST | `/api/material-requests` | `MATERIALS:write` | `CreateMaterialRequestDto`: `{ projectId, materialId, quantity, requestedBy?, notes? }` | `201 MaterialRequestResponseDto`, status `REQUESTED` | `401`/`403`; `404` if `materialId` doesn't reference an existing material; `400` on validation failure | `backend/src/modules/materials/material-requests.controller.ts`, `material-requests.service.ts` |
| PATCH | `/api/material-requests/:id/approve` | `MATERIALS:write` | none | `200 MaterialRequestResponseDto`, status `APPROVED` | `401`/`403`; `404` if not found; `400` if not currently `REQUESTED` | `backend/src/modules/materials/material-requests.controller.ts`, `material-requests.service.ts` |
| PATCH | `/api/material-requests/:id/reject` | `MATERIALS:write` | none | `200 MaterialRequestResponseDto`, status `REJECTED` | `401`/`403`; `404` if not found; `400` if already `FULFILLED`/`REJECTED` | `backend/src/modules/materials/material-requests.controller.ts`, `material-requests.service.ts` |
| PATCH | `/api/material-requests/:id/fulfill` | `MATERIALS:write` | none | `200 MaterialRequestResponseDto`, status `FULFILLED`; atomically decrements the material's `stockQuantity` | `401`/`403`; `404` if not found; `400` if not currently `APPROVED`, or stock is insufficient | `backend/src/modules/materials/material-requests.controller.ts`, `material-requests.service.ts` |
| GET | `/api/users` | `USERS:view` | Query: `page` (default `'1'`), `limit` (default `'20'`), optional `role` | `200 UserListResponseDto: { data: UserResponseDto[], meta: PaginationMetaDto }` — `password` never included | `401`/`403` | `backend/src/modules/users/users.controller.ts`, `users.service.ts` |
| GET | `/api/users/:id` | `USERS:view` | none | `200 UserResponseDto` (or `null` if not found) — `password` never included | `401`/`403` | `backend/src/modules/users/users.controller.ts`, `users.service.ts` |
| GET | `/api/permissions` | `PERMISSIONS:view` (SUPERADMIN-only in practice — no other role is seeded with it) | none | `200`, plain array of `PermissionResponseDto` (not `{data,meta}` — a small bounded set, not a paginated collection) | `401`/`403` | `backend/src/modules/permissions/permissions.controller.ts`, `permissions.service.ts` |
| GET | `/api/permissions/me` | any authenticated user (no `@RequirePermission` — self-scoped, see `.ai/BE/features/permissions.md`) | none | `200`, array of `MyPermissionDto` — one per `Resource`, `{resource, canView, canWrite, canDelete}` | `401` | `backend/src/modules/permissions/permissions.controller.ts`, `permissions.service.ts` |
| PATCH | `/api/permissions/:role/:resource` | `PERMISSIONS:write` (SUPERADMIN-only in practice) | `UpdatePermissionDto`: `{ canView?, canWrite?, canDelete? }` | `200 PermissionResponseDto` | `401`/`403`; `400` if `:role`/`:resource` isn't a valid enum value | `backend/src/modules/permissions/permissions.controller.ts`, `permissions.service.ts` |
| DELETE | `/api/permissions/:role/:resource` | `PERMISSIONS:delete` (SUPERADMIN-only in practice) | none | `200 PermissionResponseDto` or `200 null` if no row existed | `401`/`403`; `400` if `:role`/`:resource` isn't a valid enum value | `backend/src/modules/permissions/permissions.controller.ts`, `permissions.service.ts` |
| GET | `/api/health` | No (`@Public()`, unthrottled) | none | `200 HealthResponseDto: { status: 'ok', timestamp }` | `503` if MongoDB unreachable | `backend/src/modules/health/health.controller.ts` |

**2026-08-24: every route above can now also return `429`** (`@nestjs/throttler`, 300 req/min per
IP by default, 20/min on `auth/register`+`auth/login`) — body
`{"statusCode":429,"message":"ThrottlerException: Too Many Requests"}`. Not listed per-row above to
avoid duplicating it 30 times; see `.ai/BE/features/production-hardening.md`.

**2026-08-27: every org-scoped route above (i.e. everything except `/api/platform/*` and the two
`/api/organizations/*` public/inactive-allowed routes) can now also return `403` with a structured
`code`**: `{"statusCode":403,"message":"...","code":"ORGANIZATION_PENDING"}` (or `_SUSPENDED`,
`_REJECTED`, `_NOT_FOUND`) — the caller's organization isn't `ACTIVE`. Not listed per-row above for
the same reason as the `429` note; see `.ai/BE/features/multi-tenancy.md`.

## Notes

- Global `ValidationPipe` (`whitelist: true, transform: true`) strips unknown fields and coerces payloads to
  the DTO classes shown above (`backend/src/main.ts`).
- Global `JwtAuthGuard` + `RolesGuard` + `PermissionsGuard` (`backend/src/modules/auth/auth.module.ts`, in
  that registration order) enforce authentication then authorization on every route by default. A `401`
  response of `{"message":"Missing access token", ...}` or `{"message":"Invalid or expired access token",
  ...}` means `JwtAuthGuard` rejected the request before it reached the controller. A `403` response of
  `{"message":"Missing '<action>' permission on '<resource>'", ...}` means `PermissionsGuard` rejected an
  authenticated request whose role lacks the required grant — see `.ai/BE/features/permissions.md` for the
  full matrix and how to change it.
- **Response DTOs document intended shape, not enforced serialization.** Controllers return the raw
  Mongoose document (or a plain `{ data, meta }` object) at runtime — no `ClassSerializerInterceptor` or
  similar is applied. This means the actual JSON includes Mongoose's `__v` field, which the response DTOs
  (e.g. `LeadResponseDto`) don't document, since it's not meaningful to API consumers. See
  `.ai/BE/ARCHITECTURE.md` "No response envelope in use".
- CORS is fully open (`origin: true`) — no origin allow-list is configured.

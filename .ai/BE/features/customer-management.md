# Customer management
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Module 3 of `.ai/PRODUCT_SPEC.md` — Phase 1. Central customer records, linked to the originating `Lead` via
an optional `leadId`. A `Lead` becomes a `Customer` through an explicit conversion action, not automatically.
Confirmed design (2026-08-08): optional link + convert action — customers can also be created directly
(e.g. walk-in clients with no lead history).

## User-facing behaviour

- `POST /api/customers` — create a customer directly from `{ name, phone, email?, address?, notes? }`.
- `GET /api/customers?page=&limit=` — paginated list, newest first, scoped to the (single, fixed)
  organization.
- `GET /api/customers/:id` — fetch one customer.
- `PATCH /api/customers/:id` — update any of `name`, `phone`, `email`, `address`, `notes`.
- `POST /api/leads/:id/convert` (on the **leads** controller, not customers) — converts a lead into a
  customer:
  - `404` if the lead doesn't exist.
  - `400` if the lead's `status` isn't `WON` — conversion is only allowed once a lead is won.
  - `409` if a customer has already been created from this lead (checked via `leadId`).
  - Otherwise creates a `Customer` from the lead's `name`, `phone`, `email`, `notes`, stamping `leadId` and
    `organizationId` from the lead, and returns the new customer record.
- All endpoints require authentication (global `JwtAuthGuard`) **and**, since 2026-08-08, a specific
  `CUSTOMERS:view`/`CUSTOMERS:write` grant configured by SUPERADMIN — see `.ai/BE/features/permissions.md`.
- All four `customers` endpoints, plus the `leads` convert endpoint, are fully Swagger-documented
  (`@ApiTags('Customers')`, `@ApiBearerAuth()`, `@ApiOperation`/`@ApiResponse`/`@ApiParam`/`@ApiQuery` per
  route) — see `/docs`.

## Key files

- `backend/src/modules/customers/customer.schema.ts` — `Customer` schema: `name`, `phone` (required);
  `email`, `address`, `leadId`, `notes` (optional); `organizationId` (default `'default'`);
  `timestamps: true`.
- `backend/src/modules/customers/dto/create-customer.dto.ts` — `CreateCustomerDto`.
- `backend/src/modules/customers/dto/update-customer.dto.ts` — `UpdateCustomerDto` (all fields optional).
- `backend/src/modules/customers/dto/customer-response.dto.ts` — `CustomerResponseDto` (documented response
  shape; also reused by the `leads` convert endpoint).
- `backend/src/modules/customers/dto/customer-list-response.dto.ts` — `CustomerListResponseDto` (list +
  pagination wrapper); reuses the shared `backend/src/common/dto/pagination-meta.dto.ts`.
- `backend/src/modules/customers/customers.service.ts` — `list()`, `findById()`, `findByLeadId()` (used for
  the conversion idempotency check), `create()`, `update()`.
- `backend/src/modules/customers/customers.controller.ts` — routes, fully Swagger-annotated.
- `backend/src/modules/customers/customers.module.ts` — registers the Mongoose feature; exports
  `CustomersService` so `LeadsModule` can consume it.
- `backend/src/modules/leads/leads.service.ts` — `convertToCustomer(id)`: the conversion logic itself lives
  here (on the lead side), injecting `CustomersService`.
- `backend/src/modules/leads/leads.controller.ts` — `POST /leads/:id/convert` route.
- `backend/src/modules/leads/leads.module.ts` — now imports `CustomersModule` to get `CustomersService`.

## Data / API touchpoints

- `Customer` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Cross-module dependency: `LeadsModule` → `CustomersModule` (one-directional; `CustomersModule` doesn't know
  about leads).
- Full endpoint table: `.ai/BE/API.md`.

## Dependencies

- `.ai/BE/features/lead-management.md` (conversion source).
- `.ai/BE/features/auth.md` (all routes require a valid JWT).

## Known gaps & TODOs

Per `.ai/PRODUCT_SPEC.md` Module 3, this covers only the "profile" part of the spec. Not built:
- **Documents** — no file storage integration exists anywhere in the backend yet (see `.ai/PROJECT.md` Open
  questions).
- **Multiple projects per customer** — no `Project` module exists yet
  (`.ai/BE/features/project-management.md`).
- **Payments** — depends on `.ai/BE/features/billing-payments.md`, not built.
- **Communication history** — no activity/audit log is written anywhere (the shared `AuditEvent` contract
  exists but nothing uses it).
- No delete endpoint (matches the existing convention in `lead-management`, which also has no delete).
- `address` is a single free-text field, not a structured object (street/city/state/pincode) — kept minimal
  for this pass; can be revisited if structured address data is needed (e.g. for maps integration).
- **Resolved 2026-08-08:** role restriction now exists via `CUSTOMERS:view`/`write` grants — see
  `.ai/BE/features/permissions.md`. As of 2026-08-08 (later same day) the default seed matrix grants
  **no role except SUPERADMIN** any access by default — every other role needs an explicit grant via
  `PATCH /api/permissions/:role/:resource` (or the FE permissions page) before it can view/write customers.

## Open questions

- None outstanding for the core conversion design (resolved 2026-08-08). Structured address fields and
  role-scoping remain open, tracked above as known gaps rather than open questions since they're additive,
  not blocking.

# Lead management
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Basic CRUD-lite API for sales leads: paginated listing, creation, and status transitions through the sales
pipeline defined by `LeadStatus`.

## User-facing behaviour

- `GET /api/leads?page=&limit=` — paginated list of leads for the (single, fixed) organization, newest first.
  Defaults: `page=1`, `limit=20`. Response: `LeadListResponseDto { data: LeadResponseDto[], meta:
  PaginationMetaDto }`.
- `POST /api/leads` — creates a lead from `CreateLeadDto { name, phone, email?, source?, notes? }`. `status`
  is not accepted from the client — always starts at schema default `NEW`.
- `PATCH /api/leads/:id/status` — updates a lead's `status` field via `UpdateLeadStatusDto { status }` —
  accepts any string, not validated against the `LeadStatus` enum at the API layer.
- `POST /api/leads/:id/convert` — converts a `WON` lead into a `Customer`. See
  `.ai/BE/features/customer-management.md` for full behaviour (404/400/409 cases). This is the one place
  `leads` reaches into another module (`CustomersService`).
- All four endpoints are fully Swagger-documented (`@ApiTags('Leads')`, `@ApiBearerAuth()`,
  `@ApiOperation`/`@ApiResponse` per route) — see `/docs`.

## Key files

- `backend/src/modules/leads/lead.schema.ts` — `Lead` schema: `name`, `phone` (required); `email`, `source`,
  `notes` (optional); `status` (default `'NEW'`); `organizationId` (default `'default'`); `timestamps: true`.
- `backend/src/modules/leads/dto/create-lead.dto.ts` — `CreateLeadDto`.
- `backend/src/modules/leads/dto/update-lead-status.dto.ts` — `UpdateLeadStatusDto`.
- `backend/src/modules/leads/dto/lead-response.dto.ts` — `LeadResponseDto` (documented response shape).
- `backend/src/modules/leads/dto/lead-list-response.dto.ts` — `LeadListResponseDto` (list + pagination
  wrapper); reuses the shared `backend/src/common/dto/pagination-meta.dto.ts`.
- `backend/src/modules/leads/leads.controller.ts` — routes, fully Swagger-annotated; the convert route's
  success response is typed as `CustomerResponseDto` (imported from the `customers` module's `dto/`).
- `backend/src/modules/leads/leads.service.ts` — `list()` (pagination + count), `findById()`, `create()`,
  `updateStatus()` (`findByIdAndUpdate`), `convertToCustomer()`.
- `backend/src/modules/leads/leads.module.ts` — module wiring; imports `CustomersModule` for the convert
  action; `exports: [LeadsService]` so `QuotationsModule` can also consume it (see
  `.ai/BE/features/quotation-management.md`).

## Data / API touchpoints

- `Lead` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Full endpoint table: `.ai/BE/API.md`.

## Dependencies

- `.ai/BE/features/customer-management.md` — `leads.module.ts` imports `CustomersModule` so
  `LeadsService.convertToCustomer()` can call `CustomersService`. This is the only outbound cross-module
  dependency `leads` has; nothing else in this module reaches outside its own Mongoose model.
- **Depended on by:** `.ai/BE/features/quotation-management.md` — `QuotationsModule` imports `LeadsModule` to
  validate `leadId` on quotation creation.

## Known gaps & TODOs

- `PATCH :id/status` accepts any string, not validated against the `LeadStatus` enum from
  `backend/src/common/contracts/index.ts` — a typo'd status would be persisted silently.
- No update/delete for lead fields other than status (no `PATCH /leads/:id` for name/phone/etc., no
  `DELETE`).
- **Resolved 2026-08-08:** every route now requires a specific `LEADS:view`/`LEADS:write` grant, configured
  by SUPERADMIN — see `.ai/BE/features/permissions.md`. `POST /leads/:id/convert` is gated on `LEADS:write`
  only, even though it also creates a `Customer` — a role with lead-write but not customer-write can still
  indirectly create a customer through this one route. Accepted as a documented coarseness (resource-level,
  not per-side-effect, granularity) rather than silently allowed to surprise someone later.
- `organizationId` is hardcoded to `'default'` in the controller (`list('default', ...)`) rather than applied
  automatically at a lower layer — consistent with the single-org design but means every new endpoint must
  remember to do the same.
- **Gaps against `.ai/PRODUCT_SPEC.md` Module 2 (Lead Management):** the schema/API is missing fields and
  features the PRD specifies:
  - Fields: `location`, `budget`, `requirement`, `timeline` (only `name`, `phone`, `email`, `source`, `notes`
    exist today).
  - Assignment: no `assignedTo`/sales-rep field — leads can't be assigned to a Sales Executive.
  - No lead import (bulk create).
  - No follow-up reminders.
  - No attachments (depends on the file-storage decision — see `.ai/PROJECT.md` Open questions).
  - No activity history / audit trail per lead (the shared `AuditEvent` contract in
    `backend/src/common/contracts/index.ts` exists but nothing writes to it).

## Open questions

- None beyond the shared auth-enforcement question tracked in `.ai/PROJECT.md`.

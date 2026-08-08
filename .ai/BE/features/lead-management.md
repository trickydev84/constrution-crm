# Lead management
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Basic CRUD-lite API for sales leads: paginated listing, creation, and status transitions through the sales
pipeline defined by `LeadStatus`.

## User-facing behaviour

- `GET /api/leads?page=&limit=` — paginated list of leads for the (single, fixed) organization, newest first.
  Defaults: `page=1`, `limit=20`. Response: `{ data: Lead[], meta: { page, limit, total } }`.
- `POST /api/leads` — creates a lead from `{ name, phone, email?, source?, notes? }`. `status` is not
  accepted from the client — always starts at schema default `NEW`.
- `PATCH /api/leads/:id/status` — updates a lead's `status` field to an arbitrary string from the request
  body (`{ status }`) — not validated against the `LeadStatus` enum at the API layer.

## Key files

- `backend/src/modules/leads/lead.schema.ts` — `Lead` schema: `name`, `phone` (required); `email`, `source`,
  `notes` (optional); `status` (default `'NEW'`); `organizationId` (default `'default'`); `timestamps: true`.
- `backend/src/modules/leads/leads.controller.ts` — routes; inline `LeadDto` for create.
- `backend/src/modules/leads/leads.service.ts` — `list()` (pagination + count), `create()`,
  `updateStatus()` (`findByIdAndUpdate`).
- `backend/src/modules/leads/leads.module.ts` — module wiring.

## Data / API touchpoints

- `Lead` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Full endpoint table: `.ai/BE/API.md`.

## Dependencies

- None beyond the Mongoose model itself — no cross-module calls.

## Known gaps & TODOs

- `PATCH :id/status` accepts any string, not validated against the `LeadStatus` enum from
  `backend/src/common/contracts/index.ts` — a typo'd status would be persisted silently.
- No update/delete for lead fields other than status (no `PATCH /leads/:id` for name/phone/etc., no
  `DELETE`).
- Protected by the global `JwtAuthGuard` (any authenticated user, regardless of role, can call these routes)
  — see `.ai/BE/features/auth.md`. No role restriction (`@Roles()`) is applied yet, so this isn't scoped to
  e.g. `SALES`/`ADMIN` specifically.
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

# Quotation management
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

Module 5 of `.ai/PRODUCT_SPEC.md` — Phase 1. Generates quotations (line items, tax, discount) against an
existing `Lead`. **Design call made without a clarifying question** (documented here rather than left as an
open question, since the source material was explicit): the PRD's own Lead flow and Project flow diagrams
both place "Quotation" between "Estimate" and "Negotiation"/"Agreement" — i.e. quotations happen during the
lead pipeline (`LeadStatus.QUOTATION_SENT`), before conversion to a `Customer`/`Project`. So `leadId` is
required and validated, the same shape as `Project.customerId`. A quotation cannot (yet) be issued directly
against a `Customer` or `Project` — see Known gaps if that turns out to be needed for change orders etc.

## User-facing behaviour

- `POST /api/quotations` — create from `CreateQuotationDto { leadId, lineItems: [{ description, category:
  'MATERIAL'|'LABOR', quantity, unitPrice }], taxPercent?, discountPercent?, notes?, terms? }`. `leadId` must
  reference an existing lead — `404` if not found. `lineItems` requires at least one entry (`400` otherwise).
- `GET /api/quotations?page=&limit=` — paginated list, newest first, scoped to the (single, fixed)
  organization.
- `GET /api/quotations/:id` — fetch one quotation.
- `PATCH /api/quotations/:id` — update `lineItems` (replaces the entire array if provided — not a partial/
  incremental line-item update), `taxPercent`, `discountPercent`, `notes`, `terms`. **`leadId` is
  intentionally not updatable**, matching the `Project.customerId` precedent.
- **All totals are computed server-side, never trusted from the client**: each line item's `amount =
  quantity × unitPrice`; `subtotal` = sum of line item amounts; **discount is applied to the subtotal first**,
  then **tax is applied to the post-discount amount** (`discountAmount = subtotal × discountPercent / 100`;
  `taxAmount = (subtotal − discountAmount) × taxPercent / 100`; `total = subtotal − discountAmount +
  taxAmount`). This ordering (discount-then-tax) is a judgment call matching standard invoicing convention
  (tax charged on the discounted price) — flagged here since it's a real business-logic assumption, not
  something the PRD specified explicitly.
- Every update recomputes all totals from scratch, even if only `notes`/`terms` changed — there's no
  "totals are stale" state possible.
- All four endpoints require authentication (global `JwtAuthGuard`) **and**, since 2026-08-08, a specific
  `QUOTATIONS:view`/`QUOTATIONS:write` grant configured by SUPERADMIN — see
  `.ai/BE/features/permissions.md`. Fully Swagger-documented (`@ApiTags('Quotations')`, `@ApiBearerAuth()`,
  nested `QuotationLineItemDto` schema included) — verified against the live `/docs-json`.

## Key files

- `backend/src/modules/quotations/quotation.schema.ts` — `Quotation` schema (`leadId` required; `lineItems`
  array of an embedded `QuotationLineItem` subdocument — `{ _id: false }`, no independent line-item ids;
  `taxPercent`/`discountPercent`/`subtotal`/`discountAmount`/`taxAmount`/`total` all default `0`; `notes`,
  `terms` optional; `organizationId` default `'default'`; `timestamps: true`).
- `backend/src/modules/quotations/dto/quotation-line-item.dto.ts` — `QuotationLineItemDto` (request-side
  shape for one line item; `category` restricted to `MATERIAL`/`LABOR` via `@IsIn`).
- `backend/src/modules/quotations/dto/create-quotation.dto.ts` — `CreateQuotationDto`; `lineItems` validated
  with `@ValidateNested({ each: true })` + `@Type(() => QuotationLineItemDto)` (class-transformer, already a
  dependency) so nested objects are actually validated, not just checked for array-ness.
- `backend/src/modules/quotations/dto/update-quotation.dto.ts` — `UpdateQuotationDto` (`leadId` excluded).
- `backend/src/modules/quotations/dto/quotation-line-item-response.dto.ts` /
  `dto/quotation-response.dto.ts` / `dto/quotation-list-response.dto.ts` — documented response shapes
  (Swagger `type:` only); list wrapper reuses the shared `backend/src/common/dto/pagination-meta.dto.ts`.
- `backend/src/modules/quotations/quotations.service.ts` — `list()`, `findById()`, `create()` (validates
  `leadId` via injected `LeadsService.findById()`, throws `404` otherwise), `update()`, and a private
  `computeTotals()` implementing the discount-then-tax math described above.
- `backend/src/modules/quotations/quotations.controller.ts` — routes, fully Swagger-annotated.
- `backend/src/modules/quotations/quotations.module.ts` — imports `LeadsModule` for the create-time
  existence check.
- `backend/src/modules/leads/leads.service.ts` — gained a public `findById()` method (didn't exist before;
  `convertToCustomer()` refactored to use it instead of its own inline `this.model.findById()` call).
- `backend/src/modules/leads/leads.module.ts` — now `exports: [LeadsService]` (previously only used
  internally by its own controller) so `QuotationsModule` can consume it.

## Data / API touchpoints

- `Quotation` collection in MongoDB (see `.ai/BE/DATA_MODEL.md`).
- Cross-module dependency: `QuotationsModule` → `LeadsModule` (one-directional; mirrors the
  `ProjectsModule` → `CustomersModule` dependency already established).
- Full endpoint table: `.ai/BE/API.md`.

## Dependencies

- `.ai/BE/features/lead-management.md` (a quotation requires an existing lead).
- `.ai/BE/features/auth.md` (all routes require a valid JWT).

## Known gaps & TODOs

Per `.ai/PRODUCT_SPEC.md` Module 5, this covers line items/tax/discount/notes/terms. Not built:
- **PDF export** — no PDF generation library or approach chosen yet.
- **Email/WhatsApp delivery** — no notification integration exists anywhere in the backend.
- **Version history** — the PRD explicitly wants prior revisions retained when a quotation is revised; this
  pass just mutates the quotation in place on `PATCH`, with no history kept. Scoped out for the same reason
  PDF/delivery were: it's a genuinely separate design problem (new document per version? a `versions` array?
  a status field?) that wasn't resolved when this module was first stubbed and still isn't.
- **No quotation lifecycle/status field** (e.g. draft/sent/approved/rejected) — the PRD doesn't define a
  `QuotationStatus` enum the way it does `LeadStatus`/`ProjectStage`, so none was invented here. A quotation
  is just data with no workflow state today.
- **No currency handling** — monetary fields are bare numbers, consistent with `Project.budget`.
- **Cannot be issued against a `Customer`/`Project` directly** — only against a `Lead`. If a later need arises
  for post-conversion quotations (e.g. change orders on an active project), this will need a second
  reference field or a different attachment model.
- No delete endpoint (matches `leads`/`customers`/`projects` convention).
- **Resolved 2026-08-08:** role restriction now exists via `QUOTATIONS:view`/`write` grants — see
  `.ai/BE/features/permissions.md`. As of 2026-08-08 (later same day) the default seed matrix grants
  **no role except SUPERADMIN** any access by default — every other role needs an explicit grant via
  `PATCH /api/permissions/:role/:resource` (or the FE permissions page) before it can view/write quotations.

## Open questions

- Should quotations eventually support attaching to a `Project` (for change orders) in addition to a `Lead`?
- What should trigger version history — every `PATCH`, or only after the quotation has been "sent" (which
  doesn't exist as a concept yet)?

# Quotations (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-09

## Summary

`/quotations` — a dedicated quotation management page, following the same pattern as `/projects`
(`.ai/FE/features/projects.md`). Originally shipped alongside the dashboard's pre-existing "Recent
quotations" card (metric + table + its own "New quotation" dialog); **as of 2026-08-10 that dashboard
card's table and dialog are gone** — the dashboard's Quotations section is now a slim read-only summary
linking here (see `.ai/FE/features/dashboard-shell.md`), so `/quotations` is the only place quotation
creation happens. Adds a capability the old dashboard version never had: a "View details" dialog showing
the full line-item breakdown (the dashboard's summary only ever showed lead name + total).

## User-facing behaviour

- Requires an active session; redirects to `/login` with no session.
- **View-gated**: a role without `QUOTATIONS:view` sees an inline "Access restricted" message, checked via
  `GET /api/permissions/me`, skipped for SUPERADMIN — same pattern as `/materials`/`/projects`.
- **Write-gated**: "＋ New quotation" only renders for roles with `QUOTATIONS:write`.
- **Table**: Lead (client-side join), Line items (count), Subtotal, Tax / Discount, Total, and a "View"
  icon-button column (always visible, independent of write access — viewing detail isn't a write action).
- **"View details" dialog** (new): clicking the eye icon on any row opens a read-only breakdown — a table of
  every line item (Description, Category badge, Qty, Unit price, Amount — all server-computed values, not
  recalculated client-side), then the same subtotal/discount/tax/total summary block used in the create
  dialog's preview, then Notes/Terms if either is set. Nothing here is editable.
- **"＋ New quotation" dialog**: identical to the dashboard's version — `leadId` (`Select`, populated from
  `GET /api/leads`), a dynamic line-item editor (description, category `Select`, quantity, unit price, add/
  remove rows — at least one row required), `taxPercent?`, `discountPercent?`, `notes?`, `terms?`, and a
  live client-side totals preview (`previewQuotationTotals()`, a duplicate of the dashboard's function —
  see Known gaps) computed the same way `QuotationsService.computeTotals()` does server-side: discount
  applied to the subtotal before tax. The preview is cosmetic only; the values actually saved always come
  from the `POST` response.
- Empty state when there are zero quotations, phrased differently depending on write access.

## Key files

- `frontend/src/app/quotations/page.tsx` — the whole feature, including `previewQuotationTotals()`,
  `QUOTATION_CATEGORIES`, `LineItemFormRow` type, and the line-item add/remove/update handlers. **No longer
  duplicated anywhere else** — the dashboard's own copy of this logic was deleted in its 2026-08-10 redesign
  (`.ai/FE/features/dashboard-shell.md`) along with its "New quotation" dialog, so this is now the sole
  owner of the create flow.
- `frontend/src/components/app-sidebar.tsx` — "Quotations" nav item's `href` changed from `null` to
  `/quotations` (already had `resource: 'QUOTATIONS'` from the earlier sidebar-gating work).
- `frontend/src/lib/api.ts` — no changes needed; reuses the existing `Quotation`/`QuotationLineItem`/`Lead`
  types and `listQuotations()`/`createQuotation()`/`listLeads()` as-is. Unlike `/projects` (which needed a
  new `endDate` param and `updateProjectStage()`), this page needed zero API-layer additions — the "View
  details" dialog reads fields already present on every `Quotation` returned by `GET /api/quotations`
  (`lineItems[].amount` is server-computed and included, not something the FE has to derive).

## Data / API touchpoints

- `GET/POST /api/quotations` (`.ai/BE/features/quotation-management.md`) — no `PATCH` call from this page;
  quotations are create-only from the FE (the backend's `PATCH /quotations/:id` exists but nothing calls it
  yet, same gap as `/projects`'s missing general-edit UI).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives the view/write gating.
- `GET /api/leads` (`.ai/BE/features/lead-management.md`) — read-only, for the join and the create dialog's
  picker.
- Verified live by simulating the page's exact call sequence: confirmed a zero-grant role (`SUPERVISOR`,
  chosen because it starts with zero grants and isn't used by any earlier verification pass) hits the
  page's "Access restricted" branch before a grant; after granting `SUPERVISOR` temporary
  `QUOTATIONS`/`LEADS` write access, ran the page's parallel page-load fetch (`quotations` + `leads`),
  created a lead then a quotation through the dialog's exact multi-line-item shape (one `MATERIAL` row, one
  `LABOR` row, 18% tax, 5% discount), and hand-verified the server's computed `subtotal`/`discountAmount`/
  `taxAmount`/`total` matched the FE preview's math exactly (₹48,000 subtotal → ₹2,400 discount → ₹8,208 tax
  → ₹53,808 total), plus confirmed each line item's server-computed `amount` field (what the View dialog
  renders) was correct. 9/9 assertions passed; the test lead and quotation (neither has a delete endpoint)
  were removed directly from MongoDB afterward, and the temporary grant was reverted via the real `DELETE
  /api/permissions/...` endpoint.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered UI (the View dialog, the line-item editor, badges) hasn't been manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating).
- `.ai/BE/features/quotation-management.md`.
- `.ai/FE/features/dashboard-shell.md` — shares `AppSidebar`; as of 2026-08-10 the dashboard's own "Recent
  quotations" table/dialog were removed in favor of a summary linking here — see that doc.

## Known gaps & TODOs

- **Resolved 2026-08-10**: the dashboard's "Recent quotations" card no longer has its own table or "New
  quotation" dialog — it's now a 4-item summary linking here. This page is the sole owner of the create
  flow, and its line-item editor logic is no longer duplicated anywhere.
- No edit UI — `PATCH /quotations/:id` exists on the backend (replaces the whole line-item list if provided,
  recomputes totals) but nothing calls it from this page.
- No pagination UI — fetches `limit=200`, same convention as everywhere else.
- No PDF export, email/WhatsApp delivery, or version history — all PRD Module 5 features with no backend
  support yet either (see `.ai/BE/features/quotation-management.md` Known gaps).

## Open questions

- **Resolved 2026-08-10**: the dashboard's copy of the line-item editor was deleted, not extracted — moot
  now that only one consumer remains.

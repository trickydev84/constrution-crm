# Supplier management
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 8 of `.ai/PRODUCT_SPEC.md` — Phase 2. Supplier database with purchase orders, delivery tracking, and
payment tracking. Note: this is internal supplier record-keeping, distinct from the "supplier marketplace"
concept the BRD explicitly marks out of scope.

## User-facing behaviour (per PRD, not yet built)

- Supplier database: contact details, products, price lists.
- Purchase orders and delivery tracking.
- Payment tracking (amounts owed to suppliers).
- Supplier performance history.

## Key files

None yet — no `modules/suppliers` directory exists in `backend/src`.

## Data / API touchpoints

None yet. Referenced by `.ai/BE/features/material-inventory-management.md` (purchases) and the Master Plan's
Procurement workflow (Material Request → Approval → Purchase Order → Supplier → Delivery → Verification →
Inventory) — no procurement/approval workflow module is separately tracked here; it may be process, not a
distinct backend module, depending on design.

## Dependencies

- `.ai/BE/features/material-inventory-management.md`.

## Known gaps & TODOs

Entire module unimplemented. Phase 2.

## Open questions

- Does the Master Plan's Procurement workflow (Module 9 there: request → approval → PO → delivery →
  verification → inventory) need its own module/state machine, or is it folded into
  Material/Supplier management as a status field?

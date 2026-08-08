# Billing & payments
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 10 of `.ai/PRODUCT_SPEC.md` — Phase 2. Invoice generation and payment tracking, with optional GST
support. The Master Plan's tech stack lists Razorpay for payments, though the PRD's own tech-stack section
doesn't name a payment gateway explicitly (listed under "Future Enhancements": payment gateway integration).

## User-facing behaviour (per PRD, not yet built)

- Invoice generation.
- Payment tracking, outstanding balances, payment history.
- GST support (if applicable).

## Key files

None yet — no `modules/billing` (or similar) directory exists in `backend/src`.

## Data / API touchpoints

None yet. Likely references `.ai/BE/features/quotation-management.md` (invoices often derive from accepted
quotations) and `.ai/BE/features/customer-management.md` / `.ai/BE/features/project-management.md`.

## Dependencies

- `.ai/BE/features/quotation-management.md`.
- Payment gateway integration (Razorpay per the Master Plan) — listed as a "Future Enhancement" in the PRD
  itself, so likely sequenced after basic invoice/payment record-keeping (manual payment recording first,
  gateway integration later).

## Known gaps & TODOs

Entire module unimplemented. Phase 2 for record-keeping; gateway integration is explicitly a later
enhancement per the PRD.

## Open questions

- Is online payment collection (Razorpay) in scope for Phase 2, or is Phase 2 limited to manual
  invoice/payment record-keeping with gateway integration deferred to "Future Enhancements" as the PRD states?

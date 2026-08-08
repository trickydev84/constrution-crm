# Quotation management
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 5 of `.ai/PRODUCT_SPEC.md` — Phase 1. Generates professional quotations (materials + labor + tax/
discount) tied to a lead or project, exportable as PDF and sendable via email/WhatsApp.

## User-facing behaviour (per PRD, not yet built)

- Create quotation: line items for material and labor, taxes (GST) and discounts, notes/terms.
- Export as PDF.
- Send via email or WhatsApp.
- Version history (a quotation can be revised and previous versions retained).

## Key files

None yet — no `modules/quotations` directory exists in `backend/src`.

## Data / API touchpoints

None yet. Likely references a `Lead` or `Customer`/`Project`. PDF generation and WhatsApp/email delivery are
new external integrations not present anywhere in the current stack (see `.ai/PRODUCT_SPEC.md` tech-stack
gap table — no notification integration exists yet).

## Dependencies

- `.ai/BE/features/lead-management.md` and/or `.ai/BE/features/project-management.md` (a quotation is issued
  against one of these).
- Notification/delivery integration (email + WhatsApp) — not yet chosen or built.
- The `Money` interface already exists in shared contracts (`backend/src/common/contracts/index.ts`) and is a
  natural fit for line-item amounts.

## Known gaps & TODOs

Entire module unimplemented.

## Open questions

- Is quotation issued against a `Lead` (pre-conversion) or a `Customer`/`Project` (post-conversion), or both
  depending on pipeline stage?
- PDF generation approach (library/service) not decided.
- WhatsApp delivery mechanism (WhatsApp Business API vs. manual share) not decided.

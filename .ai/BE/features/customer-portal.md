# Customer portal (API)
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 12 of `.ai/PRODUCT_SPEC.md` — Phase 2. Read-mostly API surface for the `CUSTOMER` role to view their
own project's progress, documents, payments, and to raise support requests. This doc covers the backend API;
the corresponding frontend surface is tracked separately at `.ai/FE/features/customer-portal.md`.

## User-facing behaviour (per PRD, not yet built)

- Project timeline and progress photos.
- Documents.
- Payment history and invoices.
- Notifications.
- Support requests.

## Key files

None yet — no `modules/customer-portal` (or equivalent, e.g. scoped read endpoints on existing modules)
exists in `backend/src`.

## Data / API touchpoints

Read-scoped views over `.ai/BE/features/project-management.md`, `.ai/BE/features/daily-site-reports.md`
(progress photos), `.ai/BE/features/billing-payments.md` (invoices/payments), and
`.ai/BE/features/quotation-management.md` (documents). Requires auth guards + role-based scoping to be built
first (see `.ai/BE/features/auth.md`) so a `CUSTOMER` only sees their own project's data.

## Dependencies

- `.ai/BE/features/auth.md` (RBAC is a hard prerequisite — a customer-facing read API without enforced
  per-user scoping would leak other customers' project data).
- Every module it aggregates: project, site reports, billing, quotations.

## Known gaps & TODOs

Entire module unimplemented. Explicitly sequenced in Phase 2, after Phase 1 modules and after auth guards
land (auth guards are the confirmed next priority — see `.ai/PROJECT.md`).

## Open questions

- Is this a dedicated module with its own aggregating endpoints, or a set of role-scoped views layered onto
  the existing per-domain controllers (leads/projects/billing etc.)?
- "Support requests" — is this a new lightweight ticketing feature, or does it route into an external tool
  (e.g. WhatsApp, per the Master Plan's customer-support channel)?

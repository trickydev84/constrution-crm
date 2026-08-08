# Customer portal (UI)
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Frontend surface for the `CUSTOMER` role per Module 12 of `.ai/PRODUCT_SPEC.md` — Phase 2. Backend
counterpart tracked at `.ai/BE/features/customer-portal.md`.

## User-facing behaviour (per PRD, not yet built)

A logged-in customer sees their own project's timeline, progress photos, documents, payment history/
invoices, notifications, and can raise support requests.

## Key files

None yet — the only frontend route today is `frontend/src/app/page.tsx`, the internal admin-style dashboard
mock. No customer-facing route or layout exists.

## Data / API touchpoints

Depends entirely on `.ai/BE/features/customer-portal.md` existing first, which itself depends on auth guards
landing (`.ai/BE/features/auth.md`).

## Dependencies

- `.ai/BE/features/customer-portal.md` (API).
- Frontend auth/session handling — doesn't exist yet at all (no login page, no client-side auth state
  anywhere in `frontend/src`); this is a prerequisite for any role-scoped UI, not just this one.

## Known gaps & TODOs

Entire feature unimplemented. Frontend has no auth/session/routing infrastructure yet to build this on top
of.

## Open questions

- Should this be a separate Next.js route group (e.g. `/portal/*`) within the same app as the internal
  dashboard, or a fully separate application, given the very different audience (external customers vs.
  internal staff)?

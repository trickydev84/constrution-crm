# Customer management
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 3 of `.ai/PRODUCT_SPEC.md` — Phase 1. Central customer records, separate from `Lead` (a lead converts
into a customer on `WON`, though no such conversion flow exists yet).

## User-facing behaviour (per PRD, not yet built)

- Customer profile: contact info, address.
- Document storage per customer.
- Multiple projects per customer.
- Communication history.

## Key files

None yet — no `modules/customers` directory exists in `backend/src`.

## Data / API touchpoints

None yet. Will need a `Customer` Mongoose schema and a relationship to `Project` (see
`.ai/BE/features/project-management.md`) once that module exists. Likely also needs a `Lead → Customer`
conversion path from `.ai/BE/features/lead-management.md` (e.g. on `status: WON`), which isn't designed yet.

## Dependencies

- File storage decision (documents) — see `.ai/PROJECT.md` Open questions.
- Relationship to `.ai/BE/features/project-management.md` (a customer can have multiple projects).

## Known gaps & TODOs

Entire module unimplemented. No schema, no controller, no service.

## Open questions

- Does a `Lead` becoming `WON` automatically create a `Customer`, or is customer creation independent/manual?
- What documents belong to a customer vs. to a specific project?

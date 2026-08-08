# Project management
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 4 of `.ai/PRODUCT_SPEC.md` — Phase 1. Each customer project becomes a tracked workspace moving through
the `ProjectStage` pipeline. The `ProjectStage` enum already exists in shared contracts
(`backend/src/common/contracts/index.ts`) but has no backing module.

## User-facing behaviour (per PRD, not yet built)

- Create project, assign a Project Manager and a Supervisor.
- Define milestones, track progress, manage timelines.
- Upload drawings/documents.
- Stage pipeline: `PLANNING → FOUNDATION → STRUCTURE → BRICKWORK → PLUMBING → ELECTRICAL → FLOORING →
  PAINTING → INTERIOR → INSPECTION → HANDOVER` (already defined as `ProjectStage`).

## Key files

None yet — no `modules/projects` directory exists in `backend/src`. `ProjectStage` enum is defined at
`backend/src/common/contracts/index.ts:3`, ready to be consumed once this module is built.

## Data / API touchpoints

None yet. Will need a `Project` schema referencing a `Customer` (`.ai/BE/features/customer-management.md`),
an assigned Project Manager and Supervisor (`User`), and likely `Worker` assignments
(`.ai/BE/features/worker-management.md`) and `Expense` links (`.ai/BE/features/expense-management.md`).

## Dependencies

- `.ai/BE/features/customer-management.md` (a project belongs to a customer).
- File storage decision (drawings/documents) — see `.ai/PROJECT.md` Open questions.

## Known gaps & TODOs

Entire module unimplemented. `ProjectStage` enum exists but nothing references it.

## Open questions

- Does a project link 1:1 to a won `Lead`, or can projects be created independent of the lead pipeline?
- What constitutes a "milestone" distinct from a `ProjectStage` transition?

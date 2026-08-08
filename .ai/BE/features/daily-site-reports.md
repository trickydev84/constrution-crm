# Daily site reports
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 11 of `.ai/PRODUCT_SPEC.md` — Phase 2. Supervisors log a daily report per project: work summary,
photos/videos, attendance, material usage, issues, and the next day's plan.

## User-facing behaviour (per PRD, not yet built)

- Daily work summary.
- Photo and video uploads.
- Worker attendance for the day.
- Material usage for the day.
- Issues/risks encountered.
- Weather (per the Master Plan version of this module).
- Next-day plan.

## Key files

None yet — no `modules/site-reports` (or similar) directory exists in `backend/src`.

## Data / API touchpoints

None yet. References `.ai/BE/features/project-management.md` (report is per-project),
`.ai/BE/features/worker-management.md` (attendance/labor count), and
`.ai/BE/features/material-inventory-management.md` (material consumed).

## Dependencies

- File storage decision (photos/videos) — see `.ai/PROJECT.md` Open questions; this module has the heaviest
  storage dependency of any planned module.
- `.ai/BE/features/project-management.md`.

## Known gaps & TODOs

Entire module unimplemented. Phase 2. Likely the primary data source for the Supervisor mobile app
(Phase 3, not tracked as a backend feature here yet).

## Open questions

- None beyond the shared file-storage decision.

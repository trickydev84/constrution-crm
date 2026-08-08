# Worker management
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 6 of `.ai/PRODUCT_SPEC.md` — Phase 1. Tracks skilled labor (masons, electricians, plumbers,
carpenters, painters, marble workers, welders — per the Master Plan's worker categories), their attendance,
wages, and project assignments.

## User-facing behaviour (per PRD, not yet built)

- Worker profile: skill category, daily wage.
- Daily attendance tracking.
- Availability status.
- Assignment to a project.
- Ratings.

## Key files

None yet — no `modules/workers` directory exists in `backend/src`.

## Data / API touchpoints

None yet. Will need a `Worker` schema, likely referenced from `.ai/BE/features/project-management.md`
(project assignment) and `.ai/BE/features/daily-site-reports.md` (attendance/labor count reporting) and
`.ai/BE/features/expense-management.md` (wage cost).

## Dependencies

- `.ai/BE/features/project-management.md` (workers are assigned to projects).

## Known gaps & TODOs

Entire module unimplemented. This is distinct from Module 11 (Attendance, per the Master Plan) which may end
up as part of this module or a separate one — see Open questions.

## Open questions

- Is attendance tracking (Master Plan Module 11: daily attendance, optional GPS, photo verification, working
  hours) part of this module or its own? The PRD folds attendance into both Worker Management (Module 6) and
  Daily Site Reports (Module 11 in the PRD's own numbering) — needs reconciling before implementation.
- Are workers modeled as `User` accounts (role-based login) or as a separate non-authenticating entity managed
  by supervisors? The PRD's "Worker App" (mobile, Phase 3) implies workers eventually need their own login,
  which would tie this to the `User`/`Role` model.

# Material & inventory management
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 7 of `.ai/PRODUCT_SPEC.md` — Phase 2. Material catalog and stock tracking (cement, sand, steel,
bricks, marble, tiles, paint, per the Master Plan's material list).

## User-facing behaviour (per PRD, not yet built)

- Material catalog.
- Stock management, low-stock alerts.
- Material requests (from supervisors, per Module 6/Supervisor Management in the Master Plan).
- Purchase and usage tracking.

## Key files

None yet — no `modules/materials` directory exists in `backend/src`.

## Data / API touchpoints

None yet. Feeds into `.ai/BE/features/supplier-management.md` (purchases) and
`.ai/BE/features/daily-site-reports.md` (material consumed per day per project).

## Dependencies

- `.ai/BE/features/supplier-management.md` (material purchases come from suppliers).
- `.ai/BE/features/project-management.md` (material usage is typically tied to a project).

## Known gaps & TODOs

Entire module unimplemented. This is Phase 2 — sequenced after the Phase 1 modules
(auth guards, leads, customers, projects, quotations, workers, dashboard) per `.ai/PRODUCT_SPEC.md`.

## Open questions

- Is inventory tracked per-project (site-level stock) or centrally (company-wide warehouse), or both?

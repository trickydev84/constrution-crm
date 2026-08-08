# Dashboard & analytics (API)
**Status:** planned | **Last verified:** 2026-08-08

## Summary

Module 13 of `.ai/PRODUCT_SPEC.md`. Server-side KPI computation to back the frontend dashboard. The frontend
already has a dashboard *shell* (`.ai/FE/features/dashboard-shell.md`) but it renders 100% hardcoded mock
numbers — no backend endpoint currently computes any of these figures.

## User-facing behaviour (per PRD, not yet built)

KPIs per the PRD/Master Plan: total leads, lead conversion rate, active projects, completed projects, monthly
revenue, profit margin, pending payments, worker utilization, material costs, average project value, cost per
lead, average sales cycle, on-time completion rate, customer satisfaction, referral rate.

## Key files

None yet — no `modules/dashboard` or `modules/analytics` directory exists in `backend/src`.

## Data / API touchpoints

None yet. This module is necessarily downstream of most others — it aggregates data from
`.ai/BE/features/lead-management.md`, `.ai/BE/features/project-management.md`,
`.ai/BE/features/billing-payments.md`, `.ai/BE/features/expense-management.md`, and
`.ai/BE/features/worker-management.md`. A basic version (lead counts, active project counts) could ship
against just Phase 1 modules; profit margin and cost KPIs need Phase 2 (billing/expense) modules first.

## Dependencies

Effectively all other feature modules, to varying degrees per metric.

## Known gaps & TODOs

Entire module unimplemented. The current frontend dashboard shell should not be mistaken for progress on
this — it's static mock data with no backend behind it.

## Open questions

- Should a minimal version (lead pipeline counts, active project count — data available from Phase 1 modules
  alone) ship early, ahead of full Phase 2 KPIs that need billing/expense data?

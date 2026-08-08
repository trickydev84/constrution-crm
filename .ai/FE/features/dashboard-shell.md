# Dashboard shell
**Status:** in-progress | **Last verified:** 2026-08-08

## Summary

The single page of the frontend: a static CRM dashboard layout (sidebar nav, metric tiles, lead pipeline
bars, recent activity feed, active projects table) with entirely hardcoded content. No real data, routing,
or interactivity is wired up yet.

## User-facing behaviour

Visiting `/` shows:
- A sidebar with brand mark and nav items (Overview active; Leads, Customers, Projects, Quotations, Workers,
  Materials, Finance, Settings — all non-functional links) and a profile block for a hardcoded user
  ("Arjun Sharma", Administrator).
- A header greeting ("Good morning, Arjun"), a hardcoded date string, search/notification icon buttons, and
  a "＋ New lead" button — none of these have handlers.
- Four metric tiles (Active projects, Total leads, Monthly revenue, Pending payments) with hardcoded values
  and change percentages.
- A lead pipeline bar chart (New/Site visit/Quotation sent/Negotiation/Won) with hardcoded counts.
- A recent-activity feed with three hardcoded entries.
- An active-projects table with two hardcoded rows (progress bars, status pills, assigned manager).

None of this reflects live backend data — the `leads` and `auth` APIs exist on the backend but are not
called from here.

## Key files

- `frontend/src/app/page.tsx` — the entire UI: `Dashboard` default export, `Activity` helper component, and
  all hardcoded data arrays (`metrics`, `pipeline`).
- `frontend/src/app/layout.tsx` — root HTML shell, imports the global stylesheet.
- `frontend/src/app/styles.css` — all styling for every element above.

## Data / API touchpoints

None currently. `NEXT_PUBLIC_API_URL` is declared in `frontend/.env.example` but not read anywhere in
`frontend/src`.

## Dependencies

None beyond Next.js/React itself — no external UI or charting library is used (the "bar chart" is plain
`<div>`s with inline `height` styles).

## Known gaps & TODOs

- **No integration with `GET /api/leads` (backend) despite a lead pipeline being shown.** Confirmed
  2026-08-08: this hardcoded data is a placeholder awaiting real API wiring — see
  `.ai/BE/features/lead-management.md`. Sequencing: backend auth guards land first (see
  `.ai/BE/features/auth.md`), then this wiring.
- No routing for any sidebar item other than the implicit "Overview" (`/`).
- No loading/error/empty states, since there's no data fetching yet.
- No auth/login flow — the dashboard is reachable without any session check, and the backend has no route
  protection to require one anyway (see `.ai/BE/features/auth.md`).

## Open questions

None outstanding for the placeholder-vs-mockup question (resolved 2026-08-08, see Known gaps & TODOs). The
relative priority of a broader routing/layout rework (multi-page sidebar) vs. this API wiring specifically
was not decided — flagged as **not sure yet** by the project owner on 2026-08-08.

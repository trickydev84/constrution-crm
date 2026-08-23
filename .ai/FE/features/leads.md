# Leads (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-10

## Summary

`/leads` — a dedicated lead pipeline page, following `/workers`'s pattern (view/write permission gating, an
inline status-transition `Select` per row, its own create dialog). **Unlike Projects/Quotations** (which
kept their dashboard cards as additive summaries before those were later stripped down), this page's arrival
immediately removed the dashboard's "＋ New lead" button/dialog outright, in the same change — Leads is the
last of the 5 core CRM modules (Leads, Customers, Projects, Quotations, Workers) to get a dedicated route,
so there was no reason to leave a second create surface on the dashboard once this one existed. Also adds a
capability neither the old dashboard dialog nor any other page had: converting a `WON` lead into a customer.

## User-facing behaviour

- Requires an active session; redirects to `/login` with no session.
- **View-gated**: a role without `LEADS:view` sees an inline "Access restricted" message, checked via
  `GET /api/permissions/me`, skipped for SUPERADMIN — same pattern as every other dedicated page.
- **Write-gated**: "＋ New lead", the status `Select` (falls back to a color-coded read-only `Badge`), and
  the entire Actions column are all conditioned on `LEADS:write`.
- **Table**: Name, Phone, Email (`—` if unset), Source (`—` if unset), Status, and (write-gated) Actions.
- **Status column**: a live `Select` listing all 7 `LEAD_STATUSES` (`NEW, CONTACTED, SITE_VISIT,
  QUOTATION_SENT, NEGOTIATION, WON, LOST`) — the full set, unlike the dashboard's pipeline chart which only
  ever displayed 5 of them. Changing it fires `PATCH /leads/:id/status` immediately and refetches — same
  "act immediately, no confirmation" convention as every other status/stage `Select` in this app. The
  backend applies **no transition guard** (`UpdateLeadStatusDto` is a plain unvalidated string), so the FE
  doesn't invent one either.
- **"Convert" action**: appears only for rows with `status === 'WON'` (and only for write-capable roles).
  Calls `POST /leads/:id/convert` directly — there's no client-side check for "has this lead already been
  converted" (that would require also fetching and cross-referencing the customers list, which a role with
  `LEADS` access but not `CUSTOMERS` access couldn't even do). Instead, the button is always available on a
  `WON` lead and any backend rejection (`409` if already converted, `400` if the status somehow isn't
  actually `WON` by the time the request lands, `404` if deleted) surfaces as a toast with the exact backend
  message — same "attempt then toast the specific error" philosophy used elsewhere (e.g. `/materials`'s
  fulfill-with-insufficient-stock).
- **"＋ New lead" dialog**: `name`, `phone`, `email?`, `source?` (`Select` from a frontend-only
  `LEAD_SOURCES` list — no backend enum exists for this field), `notes?` (new — the old dashboard dialog
  didn't expose `notes` even though `CreateLeadDto` always accepted it). Submits to `POST /api/leads`,
  refetches.
- Empty state when there are zero leads, phrased differently depending on write access.

## Key files

- `frontend/src/app/leads/page.tsx` — the whole feature. Local `LEAD_STATUSES` mirrors
  `backend/src/common/contracts/index.ts`'s `LeadStatus` enum exactly (7 values, pipeline order);
  `LEAD_SOURCES` is the same frontend-only list the old dashboard dialog used, moved here verbatim.
  `statusBadgeClass()` color-codes the read-only badge (emerald/WON, muted/LOST, sky/NEGOTIATION+
  QUOTATION_SENT, amber for everything earlier in the pipeline).
- `frontend/src/components/app-sidebar.tsx` — "Leads" nav item's `href` changed from `null` to `/leads`
  (already had `resource: 'LEADS'` from the earlier sidebar-gating work).
- `frontend/src/app/page.tsx` (dashboard) — **the "＋ New lead" button, its `Dialog`, `handleCreateLead()`,
  and the `showNewLead`/`form`/`submitting` state were all deleted**, along with the now-unused
  `canWriteTo()` helper (it existed solely to gate that one button). The Lead pipeline chart's `CardHeader`
  gained a "View all" button routing to `/leads`, matching every other chart/summary card's convention. The
  dashboard's `LEAD_SOURCES` constant, `Dialog`/`Input`/`Label`/`Select`/`FormEvent`/`Plus`/`createLead`
  imports were all removed as a result — see `.ai/FE/features/dashboard-shell.md`.
- `frontend/src/lib/api.ts` — gained `updateLeadStatus()` and `convertLead()` (returns a `Customer`, reusing
  the existing type). `createLead()`/`listLeads()`/`Lead` type already existed.

## Data / API touchpoints

- `GET/POST /api/leads`, `PATCH /api/leads/:id/status`, `POST /api/leads/:id/convert`
  (`.ai/BE/features/lead-management.md`).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives the view/write gating.
- Verified live by simulating the page's exact call sequence: confirmed a zero-grant role
  (`PROJECT_MANAGER`, which had zero grants at the time) hit the page's "Access restricted" branch; after
  granting `PROJECT_MANAGER` temporary `LEADS`+`CUSTOMERS` write access (the latter needed for `convert`),
  ran the page-load fetch, created a lead through the dialog's exact field shape (confirmed it defaults to
  `NEW`), walked the status `Select` through all 7 statuses in pipeline order ending at `WON`, hit Convert
  (`201`, a real customer created), then hit Convert again to confirm the `409` already-converted path the
  toast handler relies on. 11/11 assertions passed; the test lead and customer (neither has a delete
  endpoint) were removed directly from MongoDB afterward, and the temporary grant was reverted.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered UI (the status `Select`, the Convert button, badges) hasn't been manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating).
- `.ai/BE/features/lead-management.md`, `.ai/BE/features/customer-management.md` (the `convert` action's
  side effect).
- `.ai/FE/features/dashboard-shell.md` — shares `AppSidebar`; its "＋ New lead" dialog was removed in favor
  of this page, and its Lead pipeline chart now links here.

## Known gaps & TODOs

- No pagination UI — fetches `limit=200`, same convention as everywhere else.
- No edit UI for general lead fields (name, phone, email, source, notes) after creation — only the status
  `Select` and the convert action. No `PATCH /leads/:id` (general update) endpoint exists on the backend
  either — this isn't a dropped FE capability, the backend has no general update route for leads.
- **Customers still has no dedicated page and no create UI anywhere** — the only way a `Customer` document
  is ever created is via this page's Convert action. This is now the single biggest gap in FE module
  coverage; see the Open questions below.

## Open questions

- Should `/customers` be the next dedicated route, closing out coverage for every Phase 1 CRM module? It
  would need its own create flow too, since none exists today (customers only ever come from lead
  conversion) — a genuinely new capability, not just a relocation like this page's status/convert logic was.

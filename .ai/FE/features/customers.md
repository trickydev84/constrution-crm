# Customers (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-10

## Summary

`/customers` — the last Phase 1 CRM module to get a dedicated route, completing coverage for Leads,
Customers, Projects, Quotations, and Workers. Unlike every other page built this session, this one is not
resolving or extending a prior FE presence — **Customers had zero create UI anywhere in this app before
this page**. The backend's `POST /customers` has always existed and is explicitly documented server-side as
"create a customer directly (not via lead conversion)," but nothing in the FE ever called it; the only path
that produced a `Customer` document was `/leads`'s Convert action. This page adds that missing direct-create
path, plus a general-field **Edit** dialog — the first of its kind in this FE, since `Customer` has no
status/stage field to justify an inline transition control the way Leads/Projects/Workers/Materials each got
one.

## User-facing behaviour

- Requires an active session; redirects to `/login` with no session.
- **View-gated**: a role without `CUSTOMERS:view` sees an inline "Access restricted" message, checked via
  `GET /api/permissions/me`, skipped for SUPERADMIN — same pattern as every other dedicated page.
- **Write-gated**: "＋ New customer" and the per-row Edit button both require `CUSTOMERS:write`.
- **Table**: Name, Phone, Email (`—` if unset), Address (truncated, `—` if unset), **Origin**, and
  (write-gated) an Edit action.
- **Origin column**: a `Badge` reading "Converted from lead" (`secondary` variant) if `Customer.leadId` is
  set, or "Direct" (`outline` variant) if not — makes the two ways a customer record can come into existence
  visible at a glance, without needing to resolve the actual lead (no join to the leads list — see Key
  files for why that was deliberately skipped).
- **"＋ New customer" dialog**: `name`, `phone`, `email?`, `address?`, `notes?`. Submits to `POST
  /api/customers`, refetches.
- **Edit dialog** (new capability, first in this FE): clicking the pencil icon on any row opens the same
  field set pre-filled with that customer's current values. Submits to `PATCH /api/customers/:id`,
  refetches. No optimistic update — waits for the round-trip like every other mutation in this app.
- Empty state when there are zero customers, phrased differently depending on write access, and (for
  write-capable roles) pointing at both ways to add one: the new dialog or `/leads`'s Convert action.

## Key files

- `frontend/src/app/customers/page.tsx` — the whole feature. Deliberately does **not** fetch the leads list
  to resolve `leadId` → lead name for the Origin column — showing *whether* a customer was converted is
  the useful signal, and adding a `GET /api/leads` dependency (which a `CUSTOMERS`-only role might not even
  have access to) for a "nice to have" name felt like the wrong trade-off, unlike `/workers`'s or
  `/projects`'s joins where the joined name *is* the point of the column.
- `frontend/src/components/app-sidebar.tsx` — "Customers" nav item's `href` changed from `null` to
  `/customers` (already had `resource: 'CUSTOMERS'` from the earlier sidebar-gating work).
- `frontend/src/lib/api.ts` — gained `createCustomer()` and `updateCustomer()`. `Customer` type and
  `listCustomers()` already existed (used for joins on `/projects`, the dashboard, etc.).

## Data / API touchpoints

- `GET/POST /api/customers`, `PATCH /api/customers/:id` (`.ai/BE/features/customer-management.md`).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives the view/write gating.
- Verified live by simulating the page's exact call sequence: confirmed a zero-grant role (`SUPERVISOR`,
  which had zero grants at the time) hit the page's "Access restricted" branch; after granting `SUPERVISOR`
  temporary `CUSTOMERS` write access, ran the page-load fetch, created a customer through the "New
  customer" dialog's exact field shape (confirmed the resulting document has no `leadId`, i.e. the Origin
  badge would correctly read "Direct"), then edited that same customer through the Edit dialog's exact
  shape and confirmed a refetch reflected the change. 7/7 assertions passed; the test customer (no delete
  endpoint) was removed directly from MongoDB afterward, and the temporary grant was reverted.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered UI (both dialogs, the Origin badges) hasn't been manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating).
- `.ai/BE/features/customer-management.md`.
- `.ai/FE/features/leads.md` — the other path that creates a `Customer` (via Convert); this page's Origin
  column exists specifically to distinguish the two.
- `.ai/FE/features/dashboard-shell.md` — shares `AppSidebar`. The dashboard's "Customers" metric card was
  left as a bare count (unlike Leads/Projects/Quotations/Materials/Workers, Customers never had a
  richer dashboard chart or summary-list card to begin with, so there was nothing to add a "View all" link
  to or resolve).

## Known gaps & TODOs

- No pagination UI — fetches `limit=200`, same convention as everywhere else.
- No delete UI — the backend has no delete endpoint for customers either, matching the app-wide convention.
- Documents/multi-project support/communication history (full PRD Module 3 scope) still aren't built on
  either the backend or this page — see `.ai/BE/features/customer-management.md` Known gaps.
- The Edit dialog has no way to clear a previously-set optional field back to empty in a way that's visually
  distinct from "never set" — an empty string submitted for `email`/`address`/`notes` is sent as `undefined`
  (falsy-coalesced, matching every other form in this app), which the backend's `PATCH` (only updates fields
  present in the body — actually, since `undefined` fields are typically dropped by `JSON.stringify`, an
  emptied field won't be included in the request at all, so a previously-set value would **not** be
  cleared by blanking the input and saving). Not tested in the live verification pass above; flagged here
  as a real, plausible gap rather than confirmed either way.

## Open questions

- Now that all 5 core CRM modules plus Materials and Permissions have dedicated pages, what's next: Phase 2
  frontend work (a Materials-adjacent Suppliers page once that backend module exists), backend-side
  `GET /api/users` (unblocks the dashboard's dropped "Manager" column), or something else entirely (ClickUp
  integration, a browser-driven verification pass across everything shipped so far)?

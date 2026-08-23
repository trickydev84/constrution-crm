# Materials & inventory (FE)

**Status:** shipped (core) | **Last verified:** 2026-08-09

## Summary

`/materials` — wires the `materials` backend module (`.ai/BE/features/material-inventory-management.md`)
into the frontend: a catalog card (materials + low-stock alerts) and a material-requests card (create,
approve, reject, fulfill), both gated by the caller's actual `MATERIALS` permission rather than just
sidebar visibility. First FE page in this app to check `canWrite` (not just `canView`) and conditionally
hide create/action buttons for read-only roles — every earlier page (dashboard, `/permissions`) either
assumed SUPERADMIN-only access or let the backend's `403` be the only enforcement.

## User-facing behaviour

- Requires an active session (same auth-gating as the dashboard — see `.ai/FE/features/authentication.md`);
  redirects to `/login` with no session.
- **View-gated, not just link-hidden**: like `/permissions`, a logged-in user without `MATERIALS:view`
  sees an inline "Access restricted" message (with a link back to `/`), not a redirect — checked via
  `GET /api/permissions/me`, skipped for SUPERADMIN (always allowed). The sidebar already hides the
  "Materials" link for roles without view access, but this page defends itself independently in case someone
  navigates there directly.
- **Write-gated within the page**: `canWrite` (same `/permissions/me` call) controls whether "＋ New
  material", "＋ New request", and the per-row Approve/Reject/Fulfill buttons render at all — a
  view-only role sees the catalog and requests but no way to mutate them, rather than seeing buttons that
  would just 403.
- **Catalog card**: table of materials (Name, Category as a `Badge`, Unit, Unit price, Stock, Reorder
  level). A "Low" `Badge` appears next to any material's stock figure if it's in the low-stock set
  (`GET /materials/low-stock`, fetched alongside the main list); the card header also shows an aggregate
  "`N` low stock" badge when `N > 0`.
- **"＋ New material" dialog**: `name`, `category` (a `Select` populated from a frontend-local
  `MATERIAL_CATEGORIES` constant mirroring the backend's `MATERIAL_CATEGORIES` — see Key files), `unit`
  (free text), `unitPrice?`, `stockQuantity?`, `reorderLevel?`, `notes?`. Submits to `POST /api/materials`,
  refetches both the catalog and low-stock lists (a new material could immediately be low-stock if
  `stockQuantity <= reorderLevel` on creation).
- **Material requests card**: table of requests (Project — resolved client-side, Material — resolved
  client-side, Quantity, Status as a colored `Badge`: grey/secondary `Requested`, blue `Approved`, green
  `Fulfilled`, red/destructive `Rejected`). An Actions column (only rendered if `canWrite`) shows Approve/
  Reject buttons for `REQUESTED` rows, or Fulfill/Reject buttons for `APPROVED` rows — no buttons at all for
  `FULFILLED`/`REJECTED` (terminal states), mirroring the backend's own transition guards rather than
  re-deriving different rules client-side.
- **"＋ New request" dialog**: `project` (`Select`, populated from `GET /api/projects`), `material`
  (`Select`, populated from the already-fetched materials list, each option showing current stock —
  `"OPC Cement (500 bag in stock)"` — so the requester has context before submitting), `quantity`, `notes?`.
  Disabled entirely if there are zero materials or zero projects yet. Submits to `POST /api/material-requests`,
  refetches the requests list.
- Approve/Reject/Fulfill buttons call their respective `PATCH .../approve`|`/reject`|`/fulfill` endpoints
  immediately (no confirmation dialog, matching this app's "act immediately, toast the result" convention),
  disable themselves mid-request via an `actioningId` state, and show a `sonner` toast on success/failure.
  Fulfilling also refetches the catalog (stock changed), not just the requests list.
- Empty states for both the catalog and requests tables when there's nothing yet, phrased differently
  depending on whether the viewer can create something (`"...— add one above."` vs. `"...".`).

## Key files

- `frontend/src/app/materials/page.tsx` — the whole feature. Local `MATERIAL_CATEGORIES` constant mirrors
  `backend/src/modules/materials/material.constants.ts` exactly — **if the backend list changes, this must
  be updated by hand**, same caveat as `/permissions`'s `ROLES`/`RESOURCES` constants.
- `frontend/src/components/app-sidebar.tsx` — "Materials" nav item's `href` changed from `null` to
  `/materials` in this pass (it already had `resource: 'MATERIALS'` from the sidebar-gating work — see
  `.ai/FE/features/dashboard-shell.md`), so it now navigates via `next/link` instead of showing a "not built
  yet" toast, once visible.
- `frontend/src/lib/api.ts` — gained `Material`/`MaterialRequest` types and `listMaterials()`,
  `listLowStockMaterials()`, `createMaterial()`, `listMaterialRequests()`, `createMaterialRequest()`,
  `approveMaterialRequest()`, `rejectMaterialRequest()`, `fulfillMaterialRequest()`.
- Reuses `listProjects()` (already existed from the dashboard's Projects wiring) for both the join
  (`MaterialRequest.projectId` → project name — not a Mongoose `ref`, same client-side `Map` join pattern
  used everywhere else in this app) and the "New request" project picker.

## Data / API touchpoints

- `GET/POST /api/materials`, `GET /api/materials/low-stock`, `GET/POST /api/material-requests`, `PATCH
  /api/material-requests/:id/approve`|`/reject`|`/fulfill` (`.ai/BE/features/material-inventory-management.md`).
- `GET /api/permissions/me` (`.ai/BE/features/permissions.md`) — drives both the page-level view gate and
  the write-gated UI described above.
- `GET /api/projects` (`.ai/BE/features/project-management.md`) — read-only from this page, for the join and
  the request-dialog picker.
- Verified live by simulating the exact sequence of calls this page makes (not just individual endpoints in
  isolation): granted `PROJECT_MANAGER` temporary `MATERIALS`/`PROJECTS`/`CUSTOMERS` write access, logged in
  as that role, ran the page's parallel page-load fetch (`materials` + `low-stock` + `material-requests` +
  `projects`, matching `refreshAll()`), then walked through both dialogs and every action button
  (create material → create request → approve → fulfill), confirming the stock decrement and the
  join-relevant fields (`projectId`/`materialId`) came back correctly-shaped for `projectNameById`/
  `materialNameById` to resolve. Also confirmed a zero-grant role (`SALES`) would hit the page's own
  "Access restricted" branch (`GET /permissions/me` returns `canView: false` for `MATERIALS`). 12/12
  assertions passed; all test data and the temporary grants were removed afterward.
  **No browser-driven verification** — no browser automation tool was available in this session; the actual
  rendered UI (dialogs, badges, disabled states) hasn't been manually clicked through yet.

## Dependencies

- `.ai/FE/features/authentication.md` (session gating).
- `.ai/FE/features/permissions.md` / `.ai/BE/features/permissions.md` (the `canView`/`canWrite` gating this
  page relies on).
- `.ai/BE/features/material-inventory-management.md` (the backend module this page wires up).
- `.ai/FE/features/dashboard-shell.md` (shares `AppSidebar`; `listProjects()` reused from there).

## Known gaps & TODOs

- No pagination UI — fetches `limit=200` for materials/requests/projects, same convention as the dashboard.
- No edit UI for materials (e.g. correcting `stockQuantity` via `PATCH /materials/:id`) — catalog entries
  are create-only from this page; the backend endpoint exists but nothing calls it yet.
- No filtering/search on either table (e.g. by category, by request status, by project) — the backend
  supports `?projectId=`/`?status=` on `GET /material-requests` but the FE doesn't expose it yet.
- No confirmation dialog before Reject — matches this page's "act immediately" convention elsewhere, but
  Reject is less reversible in spirit than a checkbox toggle.
- `requestedBy` (who made the request) isn't set from this form — there's no `GET /users` endpoint to
  attribute it to a real user yet (same gap flagged in the dashboard's dropped "Manager" column).

## Open questions

- Should material requests eventually show up somewhere on the main dashboard (e.g. a "pending requests"
  count), or stay confined to this dedicated page?
